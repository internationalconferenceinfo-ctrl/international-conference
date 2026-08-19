export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") && !file.type.includes("svg")) {
      reject(new Error("Please select a valid image file (PNG, JPG, SVG, or WEBP)."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        if (file.type !== "image/png" && !file.type.includes("svg")) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image for compression."));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function compressImageToTargetSize(
  file: File,
  targetKB = 20
): Promise<string> {
  const targetBytes = targetKB * 1024;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") && !file.type.includes("svg")) {
      reject(new Error("Please select a valid PNG, JPG, SVG, or WEBP image."));
      return;
    }

    if (file.size <= targetBytes) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
      return;
    }

    if (file.type.includes("svg")) {
      reject(new Error(`SVG file exceeds the ${targetKB} KB size limit (${Math.round(file.size / 1024)} KB). Please provide an SVG under ${targetKB} KB or upload a PNG/JPEG/WEBP.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        let quality = 0.85;

        const maxDim = 600;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let iterations = 0;

        function attemptCompress(w: number, h: number, q: number) {
          canvas.width = Math.max(40, w);
          canvas.height = Math.max(40, h);
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          const format = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
          const dataUrl = canvas.toDataURL(format, q);

          const base64Str = dataUrl.split(",")[1] || "";
          const approxBytes = Math.round((base64Str.length * 3) / 4);

          if (approxBytes > targetBytes && iterations < 8) {
            iterations++;
            attemptCompress(Math.round(w * 0.8), Math.round(h * 0.8), Math.max(0.2, q * 0.8));
          } else {
            resolve(dataUrl);
          }
        }

        attemptCompress(width, height, quality);
      };
      img.onerror = () => reject(new Error("Failed to process image."));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}
