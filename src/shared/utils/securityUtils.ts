const fallbackHash = (saltedText: string): string => {
  let hash = 0;
  for (let i = 0; i < saltedText.length; i++) {
    const char = saltedText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fb_${Math.abs(hash).toString(16)}`;
};

export async function hashValue(text: string): Promise<string> {
  if (!text) return "";
  const saltedText = `gch_auth_salt_2026_${text.trim()}`;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return fallbackHash(saltedText);
  }
}

export async function verifyHash(plainText: string, storedHash: string): Promise<boolean> {
  if (!plainText || !storedHash) return false;

  // Accounts created when Web Crypto was unavailable use the deterministic
  // fallback format. Verify that format directly even when Web Crypto is now
  // available (for example, after reopening the site in a different browser).
  if (storedHash.startsWith("fb_")) {
    return fallbackHash(`gch_auth_salt_2026_${plainText.trim()}`) === storedHash;
  }

  const computedHash = await hashValue(plainText);
  return computedHash === storedHash;
}
