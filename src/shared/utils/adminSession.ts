const ADMIN_TAB_TOKEN_KEY = "gch_admin_tab_token";

export const getAdminTabToken = (): string => {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(ADMIN_TAB_TOKEN_KEY) || "";
};

export const setAdminTabToken = (token?: string | null): void => {
  if (typeof sessionStorage === "undefined") return;
  if (token) sessionStorage.setItem(ADMIN_TAB_TOKEN_KEY, token);
  else sessionStorage.removeItem(ADMIN_TAB_TOKEN_KEY);
};

export const clearAdminTabToken = (): void => setAdminTabToken(null);

export const getAdminAuthHeaders = (): Record<string, string> => {
  const token = getAdminTabToken();
  return token ? { "X-GCH-Admin-Tab": token } : {};
};

export const adminFetch = (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(init.headers || {});
  const token = getAdminTabToken();
  if (token) headers.set("X-GCH-Admin-Tab", token);
  return fetch(input, {
    ...init,
    credentials: init.credentials || "same-origin",
    headers,
  });
};
