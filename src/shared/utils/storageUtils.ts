export function safeSetLocalStorage(key: string, data: any): void {
  try {
    const stringified = typeof data === "string" ? data : JSON.stringify(data);
    localStorage.setItem(key, stringified);
  } catch (e) {
    console.warn(`[localStorage Quota Exceeded] Unable to save key "${key}" to localStorage:`, e);
    try {
      if (Array.isArray(data)) {
        // Strip heavy base64 image strings (>50KB) if storage quota is full
        const sanitized = data.map((item: any) => {
          if (!item || typeof item !== "object") return item;
          const copy = { ...item };
          for (const k of Object.keys(copy)) {
            if (typeof copy[k] === "string" && copy[k].startsWith("data:") && copy[k].length > 50000) {
              copy[k] = "";
            }
          }
          return copy;
        });
        localStorage.setItem(key, JSON.stringify(sanitized));
      }
    } catch (innerErr) {
      console.warn(`[localStorage Secondary Save Failed] key "${key}":`, innerErr);
    }
  }
}

export function safeGetLocalStorage<T = any>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (e) {
    console.warn(`[localStorage Read Error] key "${key}":`, e);
    return fallback;
  }
}

export function safeRemoveLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[localStorage Remove Error] key "${key}":`, e);
  }
}
