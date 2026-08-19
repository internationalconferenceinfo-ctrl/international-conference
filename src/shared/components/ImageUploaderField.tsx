import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon, X, RefreshCw, Image as ImageIcon } from "lucide-react";
import { compressImageFile, compressImageToTargetSize } from "../utils/imageUtils";

interface ImageUploaderFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  aspectHint?: string;
  isLogo?: boolean;
  isBanner?: boolean;
  required?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  className?: string;
  darkBg?: boolean;
}

export const ImageUploaderField: React.FC<ImageUploaderFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = "Paste image URL (https://...)",
  aspectHint,
  isLogo = false,
  isBanner = false,
  required = false,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8,
  className = "",
  darkBg = false,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      setIsCompressing(true);
      let compressedDataUrl: string;

      // Strict hard limit of 20 KB for all images
      compressedDataUrl = await compressImageToTargetSize(file, 20);
      // Verify final compressed size is strictly under 20 KB (20 * 1024 bytes)
      const base64Str = compressedDataUrl.split(",")[1] || "";
      const approxBytes = Math.round((base64Str.length * 3) / 4);
      if (approxBytes > 20 * 1024) {
        setErrorMsg("Image exceeds maximum allowed size (20 KB). Please select a smaller file.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error("Error processing image file:", err);
      setErrorMsg(err.message || "Failed to process image.");
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${darkBg ? "text-slate-200" : "text-slate-700"}`}>
          <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
          <span>{label}</span>
          {!required && <span className={`text-[10px] font-normal normal-case ${darkBg ? "text-slate-400" : "text-slate-400"}`}>(Optional)</span>}
        </label>
        {aspectHint && (
          <span className={`text-[10px] ${darkBg ? "text-slate-400" : "text-slate-500"}`}>{aspectHint}</span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full text-xs rounded-xl px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkBg
                  ? "bg-slate-900/60 border border-white/15 text-white placeholder:text-slate-500"
                  : "bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-2xs"
              }`}
            />
            <LinkIcon className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <label
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all shrink-0 border ${
              darkBg
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700 shadow-2xs"
            }`}
          >
            {isCompressing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-blue-500" />
            )}
            <span>{isCompressing ? "Compressing..." : "Upload File"}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
              onChange={handleFileChange}
              disabled={isCompressing}
              className="hidden"
            />
          </label>
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}

        {value && (
          <div className={`relative rounded-xl border p-2 flex items-center gap-3 ${
            darkBg ? "bg-slate-900/80 border-white/15" : "bg-slate-50 border-slate-200"
          }`}>
            <div className={`${isLogo ? "w-12 h-12 rounded-xl" : "w-24 h-14 rounded-lg"} overflow-hidden bg-slate-200 border border-slate-200 shrink-0 flex items-center justify-center`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${darkBg ? "text-white" : "text-slate-800"}`}>
                Image Attached
              </p>
              <p className={`text-[10px] truncate ${darkBg ? "text-slate-400" : "text-slate-500"}`}>
                {value.startsWith("data:") || value.length > 80
                  ? "Uploaded Image File"
                  : value}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
