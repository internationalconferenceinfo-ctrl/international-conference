import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import { promises as fs } from "fs";
import type { NextFunction, Request, Response } from "express";
import { getIanaDateBoundaryTimestamp, resolveConferenceTimeZone } from "./src/shared/utils/timezoneUtils";

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "256kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

type RateEntry = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateEntry>();
const rateLimit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = `${name}:${req.ip || req.socket.remoteAddress || "unknown"}`;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  current.count += 1;
  if (current.count > max) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
    return res.status(429).json({ success: false, error: "Too many requests. Please wait and try again." });
  }
  next();
};
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(key);
}, 10 * 60 * 1000).unref();

const SESSION_COOKIE = "gch_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production.");
}
const base64url = (value: string) => Buffer.from(value).toString("base64url");
const signSession = (expiresAt: number) => {
  const payload = base64url(JSON.stringify({ role: "ADMIN", exp: expiresAt }));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const adminSessionFingerprint = (sessionToken: string) =>
  crypto.createHash("sha256").update(sessionToken).digest("base64url");
const signAdminTabToken = (sessionToken: string, expiresAt: number) => {
  const payload = base64url(JSON.stringify({
    purpose: "ADMIN_TAB",
    sid: adminSessionFingerprint(sessionToken),
    exp: expiresAt,
  }));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const verifySession = (token?: string) => {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.role === "ADMIN" && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
};
const readCookie = (req: Request, name: string) => {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
};
const shouldUseSecureCookies = (req: Request) => req.secure;
const verifyAdminTabToken = (tabToken: string | undefined, sessionToken: string | undefined) => {
  if (!tabToken || !sessionToken || !verifySession(sessionToken)) return false;
  const [payload, signature] = tabToken.split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.purpose === "ADMIN_TAB" &&
      parsed.sid === adminSessionFingerprint(sessionToken) &&
      Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
};
const requireAdminSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = readCookie(req, SESSION_COOKIE);
  const tabToken = String(req.header("X-GCH-Admin-Tab") || "");
  if (!verifySession(sessionToken) || !verifyAdminTabToken(tabToken, sessionToken)) {
    return res.status(401).json({ success: false, error: "Admin session expired. Please sign in again." });
  }
  next();
};

const portArgIndex = process.argv.findIndex((arg) => arg === "--port");
const cliPort = portArgIndex >= 0 ? Number(process.argv[portArgIndex + 1]) : 0;
const PORT = Number(process.env.PORT) || cliPort || 3000;

// Initialize Supabase Client for backend cron & database job
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_* equivalents).");
}
const supabaseServerKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
if (process.env.NODE_ENV === "production" && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production for protected Admin and Organizer authentication operations.");
}
const fetchWithTimeout = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const requestInit = init || {};
  const timeoutSignal = AbortSignal.timeout(3500);
  const signal = requestInit.signal ? AbortSignal.any([requestInit.signal, timeoutSignal]) : timeoutSignal;
  return fetch(input, { ...requestInit, signal });
};

const supabaseServerClient = createClient(supabaseUrl, supabaseServerKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithTimeout },
});

/**
 * Server-side timezone and completion calculation helper
 */
const TIMEZONE_OFFSET_MAP: Record<string, number> = {
  UTC: 0, GMT: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7,
  AKST: -9, HST: -10, BST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3, MSK: 3, GST: 4, IST: 5.5, ICT: 7,
  SGT: 8, HKT: 8, JST: 9, KST: 9, AEST: 10, AEDT: 11, NZST: 12, NZDT: 13,
};

const COUNTRY_CITY_TIMEZONE_MAP: Record<string, number> = {
  "USA": -5, "UNITED STATES": -5, "US": -5, "CANADA": -5, "MEXICO": -6,
  "NEW YORK": -5, "WASHINGTON": -5, "CHICAGO": -6, "LOS ANGELES": -8, "SAN FRANCISCO": -8, "TORONTO": -5, "VANCOUVER": -8,
  "UK": 0, "UNITED KINGDOM": 0, "GREAT BRITAIN": 0, "ENGLAND": 0, "LONDON": 0,
  "GERMANY": 1, "BERLIN": 1, "FRANKFURT": 1, "MUNICH": 1,
  "FRANCE": 1, "PARIS": 1, "ITALY": 1, "ROME": 1, "MILAN": 1,
  "SPAIN": 1, "MADRID": 1, "BARCELONA": 1, "NETHERLANDS": 1, "AMSTERDAM": 1,
  "SWITZERLAND": 1, "ZURICH": 1, "GENEVA": 1, "AUSTRIA": 1, "VIENNA": 1,
  "BELGIUM": 1, "BRUSSELS": 1, "SWEDEN": 1, "STOCKHOLM": 1, "NORWAY": 1, "OSLO": 1,
  "POLAND": 1, "WARSAW": 1, "GREECE": 2, "ATHENS": 2, "RUSSIA": 3, "MOSCOW": 3,
  "JAPAN": 9, "TOKYO": 9, "OSAKA": 9, "KYOTO": 9,
  "SOUTH KOREA": 9, "SEOUL": 9, "KOREA": 9,
  "CHINA": 8, "BEIJING": 8, "SHANGHAI": 8, "SHENZHEN": 8, "HONG KONG": 8, "TAIWAN": 8, "TAIPEI": 8,
  "SINGAPORE": 8, "MALAYSIA": 8, "KUALA LUMPUR": 8, "INDONESIA": 7, "JAKARTA": 7, "BALI": 8,
  "THAILAND": 7, "BANGKOK": 7, "VIETNAM": 7, "HANOI": 7, "HO CHI MINH": 7,
  "PHILIPPINES": 8, "MANILA": 8, "INDIA": 5.5, "NEW DELHI": 5.5, "MUMBAI": 5.5, "BANGALORE": 5.5, "CHENNAI": 5.5, "HYDERABAD": 5.5, "KOLKATA": 5.5,
  "PAKISTAN": 5, "KARACHI": 5, "BANGLADESH": 6, "DHAKA": 6, "SRI LANKA": 5.5, "COLOMBO": 5.5, "NEPAL": 5.75, "KATHMANDU": 5.75,
  "AUSTRALIA": 10, "SYDNEY": 10, "MELBOURNE": 10, "BRISBANE": 10, "PERTH": 8,
  "NEW ZEALAND": 12, "AUCKLAND": 12, "WELLINGTON": 12,
  "UAE": 4, "UNITED ARAB EMIRATES": 4, "DUBAI": 4, "ABU DHABI": 4,
  "SAUDI ARABIA": 3, "RIYADH": 3, "JEDDAH": 3, "QATAR": 3, "DOHA": 3,
  "TURKEY": 3, "ISTANBUL": 3, "ANKARA": 3, "ISRAEL": 2, "TEL AVIV": 2,
  "EGYPT": 2, "CAIRO": 2, "SOUTH AFRICA": 2, "JOHANNESBURG": 2, "CAPE TOWN": 2,
  "NIGERIA": 1, "LAGOS": 1, "KENYA": 3, "NAIROBI": 3, "MOROCCO": 1, "CASABLANCA": 1,
  "BRAZIL": -3, "SAO PAULO": -3, "RIO DE JANEIRO": -3,
  "ARGENTINA": -3, "BUENOS AIRES": -3, "CHILE": -3, "SANTIAGO": -3, "COLOMBIA": -5, "BOGOTA": -5, "PERU": -5, "LIMA": -5
};

function parseTimezoneOffset(tzStr?: string, countryStr?: string, cityStr?: string): number {
  if (tzStr) {
    const clean = tzStr.trim().toUpperCase();
    if (TIMEZONE_OFFSET_MAP[clean] !== undefined) return TIMEZONE_OFFSET_MAP[clean];
    const match = clean.match(/(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hours = parseInt(match[2], 10) || 0;
      const minutes = parseInt(match[3] || "0", 10) || 0;
      return sign * (hours + minutes / 60);
    }
  }
  if (cityStr) {
    const cleanCity = cityStr.trim().toUpperCase();
    if (COUNTRY_CITY_TIMEZONE_MAP[cleanCity] !== undefined) return COUNTRY_CITY_TIMEZONE_MAP[cleanCity];
  }
  if (countryStr) {
    const cleanCountry = countryStr.trim().toUpperCase();
    if (COUNTRY_CITY_TIMEZONE_MAP[cleanCountry] !== undefined) return COUNTRY_CITY_TIMEZONE_MAP[cleanCountry];
  }
  // Unknown or newly added locations use the India server timezone by default.
  return 5.5;
}

function parseEndTimeFromString(timeStr?: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  let target = clean;
  if (clean.includes("-")) {
    const parts = clean.split("-");
    target = parts[parts.length - 1].trim();
  } else if (clean.includes("to")) {
    const parts = clean.split("to");
    target = parts[parts.length - 1].trim();
  }
  const match = target.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || "0", 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm) {
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  }
  if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
    return { hours, minutes };
  }
  return null;
}

function getConferenceEndTimestamp(conf: any): number | null {
  const dateStr = conf.end_date || conf.endDate || conf.start_date || conf.startDate;
  const zone = resolveConferenceTimeZone(conf.time_zone || conf.timeZone, conf.country, conf.city);
  return getIanaDateBoundaryTimestamp(String(dateStr || ""), zone, "end");
}

function isConferenceExpired(conf: any, referenceTime: Date = new Date()): boolean {
  const endMs = getConferenceEndTimestamp(conf);
  if (endMs === null) return false;
  return referenceTime.getTime() > endMs;
}

/**
 * Non-destructive status updater for completed conferences.
 * PERMANENT AUTOMATIC DELETION IS STRICTLY DISABLED.
 * This updates live_status to 'Completed' in Supabase when a conference reaches its end date in its local timezone.
 */
async function syncCompletedConferencesStatusServer(): Promise<{ updatedCount: number }> {
  try {
    const { data: rows, error } = await supabaseServerClient.from("conferences").select("*");
    let allConferences: any[] = [];

    if (!error && Array.isArray(rows)) {
      allConferences = rows;
    } else {
      const { data: storeData } = await supabaseServerClient.from("app_store").select("*").eq("key", "conferences").maybeSingle();
      if (storeData) {
        const val = storeData.data || storeData.payload || storeData.value;
        if (Array.isArray(val)) allConferences = val;
      }
    }

    let updatedCount = 0;
    for (const conf of allConferences) {
      if (isConferenceExpired(conf) && conf.live_status !== "Completed" && conf.liveStatus !== "Completed") {
        await supabaseServerClient
          .from("conferences")
          .update({ live_status: "Completed" })
          .eq("id", String(conf.id));
        updatedCount++;
      }
    }

    return { updatedCount };
  } catch (err) {
    console.error("[Supabase Status Sync Error] Error updating completed conference status:", err);
    return { updatedCount: 0 };
  }
}

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Admin profile and credentials storage
let currentAdminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
let currentAdminProfile = {
  name: "Super Admin",
  email: process.env.ADMIN_EMAIL || "",
  title: "Head of Operations & Moderation",
  phone: "+1 (555) 019-2834",
  bio: "Master administrator for the International Conference Portal with full governance, vetting, and moderation privileges.",
  avatar: "",
  updatedAt: new Date().toISOString()
};

const ADMIN_STORE_FILE = path.resolve(process.cwd(), process.env.ADMIN_STORE_PATH || ".data/admin-store.json");
const hashAdminPassword = (password: string) => crypto
  .createHash("sha256")
  .update("gch_auth_salt_2026_" + password)
  .digest("hex");

async function loadLocalAdminStore() {
  try {
    const raw = await fs.readFile(ADMIN_STORE_FILE, "utf8");
    const stored = JSON.parse(raw);
    if (typeof stored?.passwordHash === "string" && stored.passwordHash.length > 20) {
      currentAdminPasswordHash = stored.passwordHash;
    }
    if (stored?.profile && typeof stored.profile === "object") {
      currentAdminProfile = { ...currentAdminProfile, ...stored.profile };
    }
    return true;
  } catch (err: any) {
    if (err?.code !== "ENOENT") console.warn("Could not load local admin store:", err);
    return false;
  }
}

async function persistAdminStore(): Promise<{ success: boolean; error?: string }> {
  let databaseError = "";

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await supabaseServerClient.from("app_store").upsert([
        {
          key: "admin_password_hash",
          payload: currentAdminPasswordHash,
          updated_at: new Date().toISOString(),
        },
        {
          key: "admin_profile",
          payload: currentAdminProfile,
          updated_at: new Date().toISOString(),
        },
      ]);
      if (!error) return { success: true };
      databaseError = error.message;
    } catch (err: any) {
      databaseError = err?.message || "Supabase persistence failed";
    }
  }

  try {
    await fs.mkdir(path.dirname(ADMIN_STORE_FILE), { recursive: true });
    await fs.writeFile(
      ADMIN_STORE_FILE,
      JSON.stringify({ passwordHash: currentAdminPasswordHash, profile: currentAdminProfile }, null, 2),
      { encoding: "utf8", mode: 0o600 }
    );
    return { success: true };
  } catch (err: any) {
    const localError = err?.message || "Local admin store persistence failed";
    return {
      success: false,
      error: databaseError ? `${databaseError}; ${localError}` : localError,
    };
  }
}

async function initAdminStore() {
  let loadedFromDatabase = false;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: passRow } = await supabaseServerClient.from("app_store").select("*").eq("key", "admin_password_hash").maybeSingle();
      if (passRow) {
        const val = passRow.data || passRow.payload || passRow.value;
        if (typeof val === "string" && val.length > 20) {
          currentAdminPasswordHash = val;
          loadedFromDatabase = true;
        }
      }
      const { data: profileRow } = await supabaseServerClient.from("app_store").select("*").eq("key", "admin_profile").maybeSingle();
      if (profileRow) {
        const val = profileRow.data || profileRow.payload || profileRow.value;
        if (val && typeof val === "object") {
          currentAdminProfile = { ...currentAdminProfile, ...val };
          loadedFromDatabase = true;
        }
      }
    }
  } catch (err) {
    console.warn("Failed to init admin store from supabase:", err);
  }

  if (!loadedFromDatabase) await loadLocalAdminStore();
}
const adminStoreReady = initAdminStore();


// Organizer Authentication (Supabase Auth + server-only recovery PIN)
const ORGANIZER_RESET_TTL_MS = 10 * 60 * 1000;
const hashRecoveryPin = (pin: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${digest}`;
};
const legacyHash = (value: string) => crypto.createHash("sha256").update(`gch_auth_salt_2026_${value.trim()}`).digest("hex");
const legacyFallbackHash = (value: string) => {
  const saltedText = `gch_auth_salt_2026_${value.trim()}`;
  let hash = 0;
  for (let i = 0; i < saltedText.length; i++) {
    hash = (hash << 5) - hash + saltedText.charCodeAt(i);
    hash |= 0;
  }
  return `fb_${Math.abs(hash).toString(16)}`;
};
const verifyLegacyHash = (value: string, stored: string) => {
  const expected = String(stored || "");
  if (!expected) return false;
  const actual = expected.startsWith("fb_") ? legacyFallbackHash(value) : legacyHash(value);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
const unpackLegacyOrganizerAuth = (stored: string) => {
  const raw = String(stored || "");
  if (!raw.startsWith("ic-auth-v2$")) return { passwordHash: raw, resetPinHash: "" };
  const [passwordHash = "", resetPinHash = ""] = raw.slice("ic-auth-v2$".length).split("$");
  return { passwordHash, resetPinHash };
};
const verifyRecoveryPin = (pin: string, stored: string) => {
  try {
    const raw = String(stored || "");
    if (raw.startsWith("legacy$")) return verifyLegacyHash(pin, raw.slice("legacy$".length));
    const [scheme, salt, expectedHex] = raw.split("$");
    if (scheme !== "scrypt" || !salt || !expectedHex) return false;
    const actual = crypto.scryptSync(pin, salt, 32);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};
const signOrganizerResetToken = (userId: string, nonce: string) => {
  const payload = base64url(JSON.stringify({ sub: userId, nonce, purpose: "organizer-password-reset", exp: Date.now() + ORGANIZER_RESET_TTL_MS }));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const verifyOrganizerResetToken = (token?: string): { userId: string; nonce: string } | null => {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.purpose !== "organizer-password-reset" || Number(parsed.exp) <= Date.now() || !parsed.sub || !parsed.nonce) return null;
    return { userId: String(parsed.sub), nonce: String(parsed.nonce) };
  } catch {
    return null;
  }
};

app.post("/api/organizer/signup", rateLimit("organizer-signup", 8, 60 * 60 * 1000), async (req, res) => {
  if (!requireServiceRole(res)) return;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const name = String(req.body?.name || "").trim();
  const resetPin = String(req.body?.resetPin || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || password.length < 6 || !/^\d{6}$/.test(resetPin)) {
    return res.status(400).json({ success: false, error: "Enter a valid email, name, password (minimum 6 characters), and 6-digit Reset PIN." });
  }

  let createdUserId = "";
  try {
    const { data: existingProfile } = await supabaseServerClient.from("organizers").select("id").eq("email", email).maybeSingle();
    if (existingProfile) return res.status(409).json({ success: false, error: "An account with this email already exists" });

    const { data: authData, error: authError } = await supabaseServerClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "ORGANIZER", name },
    });
    if (authError || !authData.user) {
      const message = authError?.message?.toLowerCase().includes("already")
        ? "An account with this email already exists"
        : (authError?.message || "Unable to create organizer account");
      return res.status(authError?.message?.toLowerCase().includes("already") ? 409 : 400).json({ success: false, error: message });
    }
    createdUserId = authData.user.id;

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "organizer";
    const now = new Date().toISOString();
    const profile = {
      id: createdUserId,
      auth_user_id: createdUserId,
      email,
      name: "",
      contact_person: name,
      phone: "",
      website: "",
      about_organization: "",
      logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&w=120&h=120&q=80",
      cover_image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80",
      country: "Japan",
      city: "Tokyo",
      is_verified: false,
      is_suspended: false,
      is_featured: false,
      is_profile_complete: false,
      slug: `${slugBase}-${createdUserId.slice(0, 8)}`,
      created_at: now,
    };
    const { error: profileError } = await supabaseServerClient.from("organizers").insert(profile);
    if (profileError) throw profileError;

    const { error: secretError } = await supabaseServerClient.from("organizer_auth_secrets").insert({
      auth_user_id: createdUserId,
      organizer_id: createdUserId,
      email,
      reset_pin_hash: hashRecoveryPin(resetPin),
      failed_pin_attempts: 0,
      pin_lockout_until: null,
      updated_at: now,
    });
    if (secretError) throw secretError;

    return res.json({ success: true, userId: createdUserId });
  } catch (err: any) {
    if (createdUserId) {
      await supabaseServerClient.from("organizer_auth_secrets").delete().eq("auth_user_id", createdUserId).catch(() => undefined);
      await supabaseServerClient.from("organizers").delete().eq("id", createdUserId).catch(() => undefined);
      await supabaseServerClient.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }
    return res.status(500).json({ success: false, error: err?.message || "Organizer signup failed" });
  }
});


app.post("/api/organizer/migrate-login", rateLimit("organizer-migrate-login", 8, 15 * 60 * 1000), async (req, res) => {
  if (!requireServiceRole(res)) return;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ success: false, error: "Email and password are required." });

  const { data: organizer, error: organizerError } = await supabaseServerClient
    .from("organizers")
    .select("id,email,auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (organizerError) return res.status(500).json({ success: false, error: "Authentication migration is temporarily unavailable." });
  if (!organizer || organizer.auth_user_id) return res.status(401).json({ success: false, error: "Invalid email or password" });

  const { data: legacy, error: legacyError } = await supabaseServerClient
    .from("organizer_legacy_auth")
    .select("organizer_id,password_hash,reset_pin_hash")
    .eq("organizer_id", organizer.id)
    .maybeSingle();
  if (legacyError || !legacy) return res.status(401).json({ success: false, error: "Invalid email or password" });

  const unpacked = unpackLegacyOrganizerAuth(legacy.password_hash || "");
  if (!verifyLegacyHash(password, unpacked.passwordHash)) {
    return res.status(401).json({ success: false, error: "Invalid email or password" });
  }

  let createdUserId = "";
  try {
    const { data: authData, error: authError } = await supabaseServerClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "ORGANIZER" },
    });
    if (authError || !authData.user) throw authError || new Error("Unable to create Supabase Auth account");
    createdUserId = authData.user.id;

    const { error: profileUpdateError } = await supabaseServerClient
      .from("organizers")
      .update({ auth_user_id: createdUserId })
      .eq("id", organizer.id);
    if (profileUpdateError) throw profileUpdateError;

    const resetPinHash = legacy.reset_pin_hash || unpacked.resetPinHash || "";
    if (resetPinHash) {
      const { error: secretError } = await supabaseServerClient.from("organizer_auth_secrets").upsert({
        auth_user_id: createdUserId,
        organizer_id: organizer.id,
        email,
        reset_pin_hash: resetPinHash.startsWith("scrypt$") ? resetPinHash : `legacy$${resetPinHash}`,
        failed_pin_attempts: 0,
        pin_lockout_until: null,
        updated_at: new Date().toISOString(),
      });
      if (secretError) throw secretError;
    }

    await supabaseServerClient.from("organizer_legacy_auth").delete().eq("organizer_id", organizer.id);
    return res.json({ success: true, organizerId: organizer.id });
  } catch (err: any) {
    if (createdUserId) {
      await supabaseServerClient.from("organizer_auth_secrets").delete().eq("auth_user_id", createdUserId).catch(() => undefined);
      await supabaseServerClient.from("organizers").update({ auth_user_id: null }).eq("id", organizer.id).catch(() => undefined);
      await supabaseServerClient.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }
    return res.status(500).json({ success: false, error: err?.message || "Organizer account migration failed" });
  }
});

app.post("/api/organizer/verify-reset-pin", rateLimit("organizer-reset-pin", 10, 30 * 60 * 1000), async (req, res) => {
  if (!requireServiceRole(res)) return;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const resetPin = String(req.body?.resetPin || "").trim();
  if (!email || !/^\d{6}$/.test(resetPin)) return res.status(400).json({ success: false, error: "Enter your email and 6-digit Reset PIN." });

  const { data: organizer, error: organizerError } = await supabaseServerClient
    .from("organizers")
    .select("id,email,auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (organizerError) return res.status(500).json({ success: false, error: "Password recovery is temporarily unavailable." });
  if (!organizer) return res.status(401).json({ success: false, error: "Invalid email or Reset PIN." });

  const { data: secret, error: secretError } = await supabaseServerClient
    .from("organizer_auth_secrets")
    .select("auth_user_id,organizer_id,reset_pin_hash,failed_pin_attempts,pin_lockout_until")
    .eq("organizer_id", organizer.id)
    .maybeSingle();
  if (secretError) return res.status(500).json({ success: false, error: "Password recovery is temporarily unavailable." });

  if (secret) {
    const lockoutUntil = secret.pin_lockout_until ? new Date(secret.pin_lockout_until).getTime() : 0;
    if (lockoutUntil > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((lockoutUntil - Date.now()) / 60000));
      return res.status(429).json({ success: false, error: `Too many failed attempts. Password reset is locked for ${minutesLeft} more minute(s).` });
    }
    if (!verifyRecoveryPin(resetPin, secret.reset_pin_hash)) {
      const failed = Number(secret.failed_pin_attempts || 0) + 1;
      const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await supabaseServerClient.from("organizer_auth_secrets").update({
        failed_pin_attempts: failed >= 5 ? 0 : failed,
        pin_lockout_until: lockedUntil,
        updated_at: new Date().toISOString(),
      }).eq("organizer_id", organizer.id);
      return res.status(401).json({ success: false, error: failed >= 5 ? "Incorrect Reset PIN. Password reset locked for 15 minutes." : `Incorrect Reset PIN. Attempt ${failed} of 5.` });
    }
    const resetNonce = crypto.randomBytes(24).toString("hex");
    const upgradedPinHash = String(secret.reset_pin_hash || "").startsWith("legacy$") ? hashRecoveryPin(resetPin) : secret.reset_pin_hash;
    await supabaseServerClient.from("organizer_auth_secrets").update({
      reset_pin_hash: upgradedPinHash,
      failed_pin_attempts: 0,
      pin_lockout_until: null,
      reset_token_nonce: resetNonce,
      updated_at: new Date().toISOString(),
    }).eq("organizer_id", organizer.id);
    return res.json({ success: true, resetToken: signOrganizerResetToken(String(organizer.id), resetNonce) });
  }

  // Existing pre-Supabase-Auth account: verify the migrated legacy PIN only on
  // the server. The legacy secret is deleted as soon as the account migrates.
  const { data: legacy, error: legacyError } = await supabaseServerClient
    .from("organizer_legacy_auth")
    .select("reset_pin_hash,password_hash,failed_pin_attempts,pin_lockout_until")
    .eq("organizer_id", organizer.id)
    .maybeSingle();
  if (legacyError || !legacy) return res.status(401).json({ success: false, error: "Invalid email or Reset PIN." });
  const unpacked = unpackLegacyOrganizerAuth(legacy.password_hash || "");
  const legacyPinHash = legacy.reset_pin_hash || unpacked.resetPinHash || "";
  const legacyLockout = Number(legacy.pin_lockout_until || 0);
  if (legacyLockout > Date.now()) {
    const minutesLeft = Math.max(1, Math.ceil((legacyLockout - Date.now()) / 60000));
    return res.status(429).json({ success: false, error: `Too many failed attempts. Password reset is locked for ${minutesLeft} more minute(s).` });
  }
  if (!verifyLegacyHash(resetPin, legacyPinHash)) {
    const failed = Number(legacy.failed_pin_attempts || 0) + 1;
    const lockoutUntil = failed >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    await supabaseServerClient.from("organizer_legacy_auth").update({
      failed_pin_attempts: failed >= 5 ? 0 : failed,
      pin_lockout_until: lockoutUntil,
    }).eq("organizer_id", organizer.id);
    return res.status(401).json({ success: false, error: failed >= 5 ? "Incorrect Reset PIN. Password reset locked for 15 minutes." : `Incorrect Reset PIN. Attempt ${failed} of 5.` });
  }
  const resetNonce = crypto.randomBytes(24).toString("hex");
  await supabaseServerClient.from("organizer_legacy_auth").update({
    failed_pin_attempts: 0,
    pin_lockout_until: 0,
    reset_token_nonce: resetNonce,
  }).eq("organizer_id", organizer.id);
  return res.json({ success: true, resetToken: signOrganizerResetToken(String(organizer.id), resetNonce) });
});

app.post("/api/organizer/reset-password", rateLimit("organizer-reset-password", 8, 30 * 60 * 1000), async (req, res) => {
  if (!requireServiceRole(res)) return;
  const token = String(req.body?.resetToken || "");
  const newPassword = String(req.body?.newPassword || "");
  const verifiedToken = verifyOrganizerResetToken(token);
  if (!verifiedToken) return res.status(401).json({ success: false, error: "Your Reset PIN verification has expired. Please verify it again." });
  const organizerId = verifiedToken.userId;
  if (newPassword.length < 6) return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });

  const { data: organizer, error: organizerError } = await supabaseServerClient
    .from("organizers")
    .select("id,email,auth_user_id")
    .eq("id", organizerId)
    .maybeSingle();
  if (organizerError || !organizer) return res.status(401).json({ success: false, error: "Organizer account was not found." });

  const { data: currentSecret } = await supabaseServerClient
    .from("organizer_auth_secrets")
    .select("reset_token_nonce")
    .eq("organizer_id", organizer.id)
    .maybeSingle();
  if (currentSecret) {
    if (!currentSecret.reset_token_nonce || currentSecret.reset_token_nonce !== verifiedToken.nonce) {
      return res.status(401).json({ success: false, error: "Your Reset PIN verification has expired. Please verify it again." });
    }
  } else {
    const { data: currentLegacy } = await supabaseServerClient
      .from("organizer_legacy_auth")
      .select("reset_token_nonce")
      .eq("organizer_id", organizer.id)
      .maybeSingle();
    if (!currentLegacy?.reset_token_nonce || currentLegacy.reset_token_nonce !== verifiedToken.nonce) {
      return res.status(401).json({ success: false, error: "Your Reset PIN verification has expired. Please verify it again." });
    }
  }

  let authUserId = organizer.auth_user_id ? String(organizer.auth_user_id) : "";
  let createdAuthUser = false;
  try {
    if (authUserId) {
      const { error } = await supabaseServerClient.auth.admin.updateUserById(authUserId, { password: newPassword });
      if (error) throw error;
      await supabaseServerClient.from("organizer_auth_secrets").update({ reset_token_nonce: null, updated_at: new Date().toISOString() }).eq("organizer_id", organizer.id);
    } else {
      const { data: authData, error: authError } = await supabaseServerClient.auth.admin.createUser({
        email: organizer.email,
        password: newPassword,
        email_confirm: true,
        user_metadata: { role: "ORGANIZER" },
      });
      if (authError || !authData.user) throw authError || new Error("Unable to migrate organizer account");
      authUserId = authData.user.id;
      createdAuthUser = true;
      const { error: updateError } = await supabaseServerClient.from("organizers").update({ auth_user_id: authUserId }).eq("id", organizer.id);
      if (updateError) throw updateError;

      const { data: legacy } = await supabaseServerClient.from("organizer_legacy_auth").select("reset_pin_hash,password_hash").eq("organizer_id", organizer.id).maybeSingle();
      const unpacked = unpackLegacyOrganizerAuth(legacy?.password_hash || "");
      const resetPinHash = legacy?.reset_pin_hash || unpacked.resetPinHash || "";
      if (resetPinHash) {
        const { error: secretError } = await supabaseServerClient.from("organizer_auth_secrets").upsert({
          auth_user_id: authUserId,
          organizer_id: organizer.id,
          email: String(organizer.email || "").toLowerCase(),
          reset_pin_hash: resetPinHash.startsWith("scrypt$") ? resetPinHash : `legacy$${resetPinHash}`,
          failed_pin_attempts: 0,
          pin_lockout_until: null,
          updated_at: new Date().toISOString(),
        });
        if (secretError) throw secretError;
      }
      await supabaseServerClient.from("organizer_legacy_auth").delete().eq("organizer_id", organizer.id);
    }
    return res.json({ success: true });
  } catch (err: any) {
    if (createdAuthUser && authUserId) {
      await supabaseServerClient.from("organizer_auth_secrets").delete().eq("auth_user_id", authUserId).catch(() => undefined);
      await supabaseServerClient.from("organizers").update({ auth_user_id: null }).eq("id", organizer.id).catch(() => undefined);
      await supabaseServerClient.auth.admin.deleteUser(authUserId).catch(() => undefined);
    }
    return res.status(500).json({ success: false, error: err?.message || "Failed to update password." });
  }
});


app.post("/api/organizer/audit", rateLimit("organizer-audit", 120, 60 * 60 * 1000), async (req, res) => {
  if (!requireServiceRole(res)) return;
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return res.status(401).json({ success: false, error: "Organizer authentication required." });

  const { data: authData, error: authError } = await supabaseServerClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user || user.user_metadata?.role !== "ORGANIZER") {
    return res.status(401).json({ success: false, error: "Organizer authentication required." });
  }

  const { data: organizer } = await supabaseServerClient
    .from("organizers")
    .select("id,is_suspended")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!organizer || organizer.is_suspended) {
    return res.status(403).json({ success: false, error: "Organizer account is not active." });
  }

  const record = req.body?.record;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return res.status(400).json({ success: false, error: "Invalid audit record." });
  }
  const safeRecord = {
    id: String(record.id || `log-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`),
    conference_id: record.conferenceId || record.conference_id || null,
    action: String(record.action || "Organizer action").slice(0, 120),
    details: String(record.details || "").slice(0, 1000),
    actor: String(record.actor || user.email || "Organizer").slice(0, 200),
    role: "ORGANIZER",
    timestamp: record.timestamp || new Date().toISOString(),
  };
  const { error } = await supabaseServerClient.from("audit_logs").insert(safeRecord);
  if (error) return res.status(500).json({ success: false, error: "Audit entry could not be saved." });
  return res.json({ success: true });
});

// Admin authentication responses must never be cached by private/proxy browsers.
app.use("/api/admin", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  next();
});

// Admin Authentication Endpoint (Server-side hash check)
app.post("/api/admin/login", rateLimit("admin-login", 8, 15 * 60 * 1000), async (req, res) => {
  try {
    await adminStoreReady;
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const adminEmail = currentAdminProfile.email || process.env.ADMIN_EMAIL || "";
    if (!adminEmail || !currentAdminPasswordHash) {
      return res.status(503).json({ success: false, error: "Admin credentials are not configured on the server" });
    }

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    // Compute SHA-256 hash using salt "gch_auth_salt_2026_"
    const computedHash = hashAdminPassword(password);

    if (computedHash !== currentAdminPasswordHash) {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }

    const sessionExpiresAt = Date.now() + SESSION_TTL_MS;
    const sessionToken = signSession(sessionExpiresAt);
    const adminTabToken = signAdminTabToken(sessionToken, sessionExpiresAt);
    res.cookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(req),
      maxAge: SESSION_TTL_MS,
      path: "/",
    });

    return res.json({
      success: true,
      user: {
        id: "admin-1",
        email: adminEmail,
        role: "ADMIN",
        name: currentAdminProfile.name || "Super Admin",
      },
      profile: currentAdminProfile,
      adminTabToken
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Internal server error during admin authentication" });
  }
});

app.get("/api/admin/session", rateLimit("admin-session", 120, 60 * 1000), requireAdminSession, (_req, res) => {
  res.json({
    success: true,
    user: { id: "admin-1", email: currentAdminProfile.email, role: "ADMIN", name: currentAdminProfile.name },
  });
});

app.post("/api/admin/logout", requireAdminSession, (req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: shouldUseSecureCookies(req), path: "/" });
  res.json({ success: true });
});

// Admin Profile Endpoints
app.get("/api/admin/profile", requireAdminSession, async (_req, res) => {
  await adminStoreReady;
  res.json({ success: true, profile: currentAdminProfile });
});

const ADMIN_DB_TABLES = new Set([
  "conferences", "organizers", "categories", "banners", "banner_contents",
  "user_feedbacks", "subscriber_emails", "contact_inquiries", "countries", "cities",
  "inactive_countries", "inactive_cities", "inactive_topics", "media_partners", "associates",
  "contact_info", "social_links", "notifications", "audit_logs"
]);

const requireServiceRole = (res: Response) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY is required for this protected server operation" });
    return false;
  }
  return true;
};

app.get("/api/admin/db/:table", requireAdminSession, async (req, res) => {
  if (!requireServiceRole(res)) return;
  const table = String(req.params.table || "");
  if (!ADMIN_DB_TABLES.has(table)) return res.status(400).json({ success: false, error: "Table is not allowed" });
  const { data, error } = await supabaseServerClient.from(table).select("*");
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.json({ success: true, data: data || [] });
});

app.post("/api/admin/db/upsert", requireAdminSession, async (req, res) => {
  if (!requireServiceRole(res)) return;
  const table = String(req.body?.table || "");
  const records = req.body?.records;
  if (!ADMIN_DB_TABLES.has(table)) return res.status(400).json({ success: false, error: "Table is not allowed" });
  const rows = Array.isArray(records) ? records : [records];
  if (!rows.length || rows.length > 500 || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    return res.status(400).json({ success: false, error: "Invalid records payload" });
  }
  const { data, error } = await supabaseServerClient.from(table).upsert(rows).select();
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.json({ success: true, data: data || [] });
});

app.delete("/api/admin/db/:table/:id", requireAdminSession, async (req, res) => {
  if (!requireServiceRole(res)) return;
  const table = String(req.params.table || "");
  const id = String(req.params.id || "");
  if (!ADMIN_DB_TABLES.has(table)) return res.status(400).json({ success: false, error: "Table is not allowed" });
  if (!id) return res.status(400).json({ success: false, error: "Record id is required" });
  const { error } = await supabaseServerClient.from(table).delete().eq("id", id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.json({ success: true });
});

app.post("/api/admin/profile", requireAdminSession, async (req, res) => {
  try {
    await adminStoreReady;
    const { name, avatar } = req.body || {};
    const previousProfile = currentAdminProfile;
    currentAdminProfile = {
      ...currentAdminProfile,
      name: name || currentAdminProfile.name,
      avatar: avatar !== undefined ? avatar : currentAdminProfile.avatar,
      updatedAt: new Date().toISOString()
    };

    const persisted = await persistAdminStore();
    if (!persisted.success) {
      currentAdminProfile = previousProfile;
      return res.status(503).json({ success: false, error: `Admin profile could not be saved: ${persisted.error}` });
    }

    return res.json({ success: true, profile: currentAdminProfile, message: "Admin profile updated successfully." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Failed to update admin profile" });
  }
});

// Admin Password Change Endpoint (Server-Side Hash & Salt Validation)
app.post("/api/admin/change-password", rateLimit("admin-password", 5, 30 * 60 * 1000), requireAdminSession, async (req, res) => {
  try {
    await adminStoreReady;
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: "New password and confirmation do not match." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    // Verify current password hash
    const computedCurrentHash = hashAdminPassword(currentPassword);

    if (computedCurrentHash !== currentAdminPasswordHash) {
      return res.status(401).json({ success: false, error: "Current password is incorrect." });
    }

    // Generate new hash
    const newPasswordHash = hashAdminPassword(newPassword);
    const previousPasswordHash = currentAdminPasswordHash;
    currentAdminPasswordHash = newPasswordHash;

    const persisted = await persistAdminStore();
    if (!persisted.success) {
      currentAdminPasswordHash = previousPasswordHash;
      return res.status(503).json({ success: false, error: `Password could not be saved: ${persisted.error}` });
    }

    return res.json({ success: true, message: "Admin password successfully updated. Please use your new password next time." });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Server error updating admin password." });
  }
});

type ResetTarget = {
  table: string;
  filter?: { column: string; kind: "not-null" | "not-equal"; value?: string };
};

type ResetSection = {
  label: string;
  targets: ResetTarget[];
  storeKeys: string[];
};

const DATABASE_RESET_SECTIONS: Record<string, ResetSection> = {
  conferences: {
    label: "Conferences",
    targets: [
      { table: "notifications", filter: { column: "related_conference_id", kind: "not-null" } },
      { table: "audit_logs", filter: { column: "conference_id", kind: "not-null" } },
      { table: "conferences" },
    ],
    storeKeys: ["conferences"],
  },
  organizers: {
    label: "Organizer accounts and linked content",
    targets: [
      { table: "conferences" },
      { table: "notifications", filter: { column: "organizer_id", kind: "not-equal", value: "ADMIN" } },
      { table: "audit_logs", filter: { column: "organizer_id", kind: "not-null" } },
      { table: "organizers" },
    ],
    storeKeys: ["conferences", "notifications", "audit_logs", "organizers"],
  },
  banners: {
    label: "Banners and website banner content",
    targets: [{ table: "banner_contents" }, { table: "banners" }],
    storeKeys: ["banners", "banner_contents", "banner_titles", "banner_descs"],
  },
  topics: {
    label: "Topics and categories",
    targets: [{ table: "categories" }, { table: "inactive_topics" }],
    storeKeys: ["categories", "topics", "inactive_topics"],
  },
  locations: {
    label: "Countries, cities, and inactive locations",
    targets: [
      { table: "cities" },
      { table: "countries" },
      { table: "inactive_cities" },
      { table: "inactive_countries" },
    ],
    storeKeys: ["cities", "countries", "inactive_cities", "inactive_countries"],
  },
  media_partners: {
    label: "Media partners",
    targets: [{ table: "media_partners" }],
    storeKeys: ["media_partners"],
  },
  associates: {
    label: "Associates",
    targets: [{ table: "associates" }],
    storeKeys: ["associates", "our_associates"],
  },
  feedback: {
    label: "User feedback",
    targets: [{ table: "user_feedbacks" }],
    storeKeys: ["user_feedbacks", "feedbacks"],
  },
  subscribers: {
    label: "Subscribers",
    targets: [{ table: "subscriber_emails" }],
    storeKeys: ["subscriber_emails", "subscriberEmails", "subscribers"],
  },
  contact_inquiries: {
    label: "Contact inquiries",
    targets: [{ table: "contact_inquiries" }],
    storeKeys: ["contact_inquiries"],
  },
  notifications: {
    label: "Notifications",
    targets: [{ table: "notifications" }],
    storeKeys: ["notifications"],
  },
  audit_logs: {
    label: "Audit logs",
    targets: [{ table: "audit_logs" }],
    storeKeys: ["audit_logs"],
  },
  public_contact: {
    label: "Public contact details and social links",
    targets: [{ table: "contact_info" }, { table: "social_links" }],
    storeKeys: ["contact_info", "social_links"],
  },
};

const FULL_RESET_TARGETS: ResetTarget[] = [
  { table: "notifications" },
  { table: "audit_logs" },
  { table: "conferences" },
  { table: "organizers" },
  { table: "banner_contents" },
  { table: "banners" },
  { table: "categories" },
  { table: "inactive_topics" },
  { table: "cities" },
  { table: "countries" },
  { table: "inactive_cities" },
  { table: "inactive_countries" },
  { table: "media_partners" },
  { table: "associates" },
  { table: "user_feedbacks" },
  { table: "subscriber_emails" },
  { table: "contact_inquiries" },
  { table: "contact_info" },
  { table: "social_links" },
];

const isMissingTableError = (error: any) =>
  error?.code === "42P01" || /could not find the table|does not exist/i.test(error?.message || "");

const isTransientDatabaseError = (error: any) =>
  /fetch failed|network|timeout|timed out|econnreset|econnrefused|socket|connection/i.test(error?.message || String(error || ""));

const waitForRetry = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function withDatabaseRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt === attempts) throw error;
      await waitForRetry(250 * attempt);
    }
  }
  throw lastError;
}

const applyResetFilter = (query: any, target: ResetTarget) => {
  if (!target.filter) return query.not("id", "is", null);
  if (target.filter.kind === "not-null") return query.not(target.filter.column, "is", null);
  return query.neq(target.filter.column, target.filter.value || "");
};

async function clearResetTarget(target: ResetTarget): Promise<{ deleted: number; skipped?: boolean }> {
  let beforeQuery: any = supabaseServerClient.from(target.table).select("id", { count: "exact", head: true });
  beforeQuery = applyResetFilter(beforeQuery, target);
  const before = await beforeQuery;
  if (before.error) {
    if (isMissingTableError(before.error)) return { deleted: 0, skipped: true };
    throw before.error;
  }

  let deleteQuery: any = supabaseServerClient.from(target.table).delete();
  deleteQuery = applyResetFilter(deleteQuery, target);
  const deleted = await deleteQuery;
  if (deleted.error) {
    if (isMissingTableError(deleted.error)) return { deleted: 0, skipped: true };
    throw deleted.error;
  }

  let afterQuery: any = supabaseServerClient.from(target.table).select("id", { count: "exact", head: true });
  afterQuery = applyResetFilter(afterQuery, target);
  const after = await afterQuery;
  if (after.error) throw after.error;

  const beforeCount = before.count || 0;
  const afterCount = after.count || 0;
  if (beforeCount > 0 && afterCount >= beforeCount) {
    throw new Error(`No ${target.table} records were deleted. Configure SUPABASE_SERVICE_ROLE_KEY or the required delete policy.`);
  }
  return { deleted: Math.max(0, beforeCount - afterCount) };
}

async function preflightResetTarget(target: ResetTarget): Promise<void> {
  const result = await withDatabaseRetry(async () => {
    let query: any = supabaseServerClient.from(target.table).select("id", { count: "exact", head: true });
    query = applyResetFilter(query, target);
    const response = await query;
    if (response.error) throw response.error;
    return response;
  }, 2);
  void result;
}

async function preflightStoreAccess(table: "app_store" | "app_state"): Promise<void> {
  await withDatabaseRetry(async () => {
    const response = await supabaseServerClient.from(table).select("key", { count: "exact", head: true });
    if (response.error) throw response.error;
    return response;
  }, 2);
}

async function clearStoreKeys(table: "app_store" | "app_state", keys: string[]) {
  if (keys.length === 0) return;
  if (table === "app_store" && !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { error } = await supabaseServerClient.from(table).delete().in("key", keys);
  if (error && !isMissingTableError(error)) throw error;
}

async function hasProtectedDatabaseAccess(): Promise<boolean> {
  try {
    const { error } = await supabaseServerClient
      .from("app_store")
      .select("key", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

// Database Reset Endpoint (Admin-Only, Password Protected)
app.post("/api/admin/reset-database", rateLimit("admin-reset", 20, 60 * 60 * 1000), requireAdminSession, async (req, res) => {
  try {
    await adminStoreReady;
    const { adminPassword, scope } = req.body || {};

    if (!adminPassword) {
      return res.status(400).json({ success: false, error: "Super Admin password is required before deleting database records." });
    }

    if (scope !== "all" && !DATABASE_RESET_SECTIONS[scope]) {
      return res.status(400).json({ success: false, error: "Select a valid database section to delete." });
    }

    if (hashAdminPassword(adminPassword) !== currentAdminPasswordHash) {
      return res.status(401).json({ success: false, error: "Invalid Admin password. Delete operation aborted." });
    }

    const selectedSection = scope === "all" ? null : DATABASE_RESET_SECTIONS[scope];
    const targets = selectedSection?.targets || FULL_RESET_TARGETS;

    // Audit logs are intentionally protected from the public Supabase role.
    // Verify privileged database access before touching any table so a reset
    // can never delete some sections and then fail when it reaches audit_logs.
    if (targets.some((target) => target.table === "audit_logs") && !(await hasProtectedDatabaseAccess())) {
      return res.status(503).json({
        success: false,
        error: "This selection includes protected Audit Logs. Add SUPABASE_SERVICE_ROLE_KEY to the server .env file and restart the server. No records were deleted by this attempt.",
        code: "SERVICE_ROLE_REQUIRED",
      });
    }

    // Validate every required table and application store before the first
    // destructive query. A temporary Supabase/network outage therefore cannot
    // cause an operation to begin and fail on the next request.
    try {
      for (const target of targets) {
        try {
          await preflightResetTarget(target);
        } catch (error: any) {
          if (!isMissingTableError(error)) throw error;
        }
      }
      await preflightStoreAccess("app_state");
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) await preflightStoreAccess("app_store");
    } catch (error: any) {
      return res.status(503).json({
        success: false,
        error: `Database connection check failed before deletion started: ${error?.message || "Supabase is unavailable"}. No delete queries were sent. Please retry when the connection is stable.`,
        code: "DATABASE_PREFLIGHT_FAILED",
      });
    }

    const results: Record<string, string> = {};
    const failures: string[] = [];

    for (const target of targets) {
      try {
        const result = await withDatabaseRetry(() => clearResetTarget(target));
        results[target.table] = result.skipped ? "Not installed; skipped" : `Deleted ${result.deleted} record(s)`;
      } catch (err: any) {
        const message = err?.message || "Delete failed";
        results[target.table] = `Error: ${message}`;
        failures.push(`${target.table}: ${message}`);
        break;
      }
    }

    if (failures.length > 0) {
      const transientFailure = failures.some((failure) => isTransientDatabaseError(failure));
      return res.status(transientFailure ? 503 : 500).json({
        success: false,
        error: `Database deletion could not be verified: ${failures.join("; ")}. Matching legacy storage was not modified.`,
        clearedTables: results,
      });
    }

    const storeKeys = selectedSection
      ? selectedSection.storeKeys
      : Array.from(new Set(Object.values(DATABASE_RESET_SECTIONS).flatMap((section) => section.storeKeys)));

    try {
      await withDatabaseRetry(() => clearStoreKeys("app_state", storeKeys));
      await withDatabaseRetry(() => clearStoreKeys("app_store", storeKeys));
    } catch (err: any) {
      failures.push(`legacy application storage: ${err?.message || "Delete failed"}`);
    }

    if (failures.length > 0) {
      return res.status(500).json({
        success: false,
        error: `Delete operation was only partially completed: ${failures.join("; ")}`,
        clearedTables: results,
      });
    }

    const label = selectedSection?.label || "the full application database";
    return res.json({
      success: true,
      message: `Successfully deleted ${label}. Super Admin login and profile were preserved.`,
      clearedTables: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Server error during database deletion." });
  }
});

// Status Sync Endpoint for Completed Conferences (Non-destructive: No records are ever automatically deleted)
app.all("/api/conferences/cleanup-expired", rateLimit("conference-status-sync", 12, 60 * 60 * 1000), async (req, res) => {
  try {
    const result = await syncCompletedConferencesStatusServer();
    res.json({
      success: true,
      message: `Completed conference status sync processed. Updated live_status for ${result.updatedCount} conference(s). Zero records deleted.`,
      updatedCount: result.updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to sync completed conference status",
    });
  }
});

// Collaboration / Partner Application Backend Submission Endpoint with 150-char Validation
app.post("/api/collaboration/submit", rateLimit("collaboration", 10, 60 * 60 * 1000), async (req, res) => {
  try {
    const { name, website, description, category, logo, email } = req.body || {};

    if (!name || !String(name).trim() || !website || !String(website).trim() || !description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: Company Name, Website, and Description are mandatory."
      });
    }

    const trimmedDesc = String(description).trim();
    if (trimmedDesc.length > 150) {
      return res.status(400).json({
        success: false,
        error: `Description exceeds the 150-character limit. Provided length: ${trimmedDesc.length} characters (maximum 150 allowed).`
      });
    }

    const targetTable = (category === "Associates" || category === "Our Associates") ? "associates" : "media_partners";
    const prefix = targetTable === "associates" ? "assoc" : "mp";
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const newRecord: any = {
      id: `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).trim(),
      ...(targetTable === "associates" ? { category: "Associates" } : { type: "Media Partner" }),
      description: trimmedDesc.slice(0, 150),
      logo: String(logo || "").trim() || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=120&h=120&q=80",
      website: String(website).trim(),
      email: String(email || "").trim(),
      submittedAt: dateStr,
      status: "Pending"
    };

    const { data, error } = await (supabaseServerClient.from(targetTable) as any).insert(newRecord).select();
    if (error) {
      console.warn(`[Backend Collaboration Submit Error] Table ${targetTable}:`, error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: "Collaboration application submitted successfully for review.",
      record: data?.[0] || newRecord
    });
  } catch (err: any) {
    console.error("[Backend Collaboration Submit Exception]:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Server error while processing collaboration submission."
    });
  }
});

// Sitemap
app.get("/sitemap.xml", (req, res) => {
  res.setHeader("Content-Type", "application/xml");
  const appUrl = process.env.APP_URL || `https://${req.headers.host || "globalconferencehub.com"}`;
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${appUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${appUrl}/conferences</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${appUrl}/organizers</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${appUrl}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${appUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;
  res.send(sitemap);
});

// Robots.txt
app.get("/robots.txt", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const appUrl = process.env.APP_URL || `https://${req.headers.host || "globalconferencehub.com"}`;
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /organizer/dashboard/
Disallow: /api/

Sitemap: ${appUrl}/sitemap.xml`);
});

// AI: Duplicate Detection
app.post("/api/gemini/detect-duplicate", rateLimit("gemini", 30, 60 * 1000), async (req, res) => {
  try {
    const { newConference, existingConferences } = req.body;

    if (!newConference) {
      return res.status(400).json({ error: "Missing newConference payload" });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key") {
      return res.json({
        isDuplicate: false,
        likelihood: "LOW",
        matchedConferenceId: null,
        warningMessage: "Gemini API Key is not configured. Duplicate check bypassed.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Evaluate if the following proposed conference is a duplicate of any existing conferences in our database.
Check based on Title (or highly similar titles), Organizer Name, Dates (same/overlapping days), and Location (same city/venue/online status).

New Proposed Conference:
${JSON.stringify(newConference, null, 2)}

Existing Database Conferences:
${JSON.stringify(existingConferences || [], null, 2)}
`,
      config: {
        systemInstruction: "You are an AI-powered quality reviewer for International Conference. You must check for identical or highly similar/duplicate conference entries in the database.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDuplicate: { type: Type.BOOLEAN, description: "Whether a highly similar conference exists that might be a duplicate" },
            likelihood: { type: Type.STRING, description: "Duplicate probability: HIGH, MEDIUM, or LOW" },
            matchedConferenceId: { type: Type.STRING, description: "The ID of the matching duplicate conference if found, or null/empty string" },
            warningMessage: { type: Type.STRING, description: "Detailed explanation of why it is flagged, or reassurance if it is unique" },
          },
          required: ["isDuplicate", "likelihood", "warningMessage"],
        },
      },
    });

    const resultText = response.text || "{}";
    const resultObj = JSON.parse(resultText);
    res.json(resultObj);
  } catch (error: any) {
    console.error("AI Duplicate Detection Error:", error);
    res.status(500).json({
      isDuplicate: false,
      likelihood: "LOW",
      matchedConferenceId: null,
      warningMessage: `Failed to execute AI analysis: ${error.message}. Proceeding safely.`,
    });
  }
});

// AI: Quality Score
app.post("/api/gemini/quality-score", rateLimit("gemini", 30, 60 * 1000), async (req, res) => {
  try {
    const { conference } = req.body;

    if (!conference) {
      return res.status(400).json({ error: "Missing conference payload" });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key") {
      return res.json({
        score: 75,
        breakdown: {
          completeness: 80,
          clarity: 70,
          validity: 80,
          seo: 70,
        },
        feedback: "Default score calculated (Gemini API Key is not configured).",
        suggestions: ["Connect a real Gemini API key to calculate exact quality scores based on descriptions."],
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following conference submission and calculate an overall Quality Score (0-100).
Evaluate it on these aspects:
1. Completeness: Are all optional and required fields provided?
2. Clarity: Is the description detailed, readable, and professional?
3. Validity: Are registration links, websites, and venues realistic?
4. SEO: Are SEO Title, SEO Description, and Keywords descriptive and search-optimized?

Conference Details:
${JSON.stringify(conference, null, 2)}
`,
      config: {
        systemInstruction: "You are an AI-powered quality score assessor for International Conference. You evaluate academic and professional conference profiles to help administrators review listings faster.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Overall quality score between 0 and 100" },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                completeness: { type: Type.INTEGER, description: "Completeness score (0-100)" },
                clarity: { type: Type.INTEGER, description: "Clarity and professional formatting score (0-100)" },
                validity: { type: Type.INTEGER, description: "Link/venue validation score (0-100)" },
                seo: { type: Type.INTEGER, description: "SEO optimization score (0-100)" },
              },
              required: ["completeness", "clarity", "validity", "seo"],
            },
            feedback: { type: Type.STRING, description: "Brief evaluation summary of the conference quality" },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of actionable recommendations to increase the score to 100",
            },
          },
          required: ["score", "breakdown", "feedback", "suggestions"],
        },
      },
    });

    const resultText = response.text || "{}";
    const resultObj = JSON.parse(resultText);
    res.json(resultObj);
  } catch (error: any) {
    console.error("AI Quality Score Error:", error);
    res.status(500).json({
      score: 60,
      breakdown: {
        completeness: 60,
        clarity: 60,
        validity: 60,
        seo: 60,
      },
      feedback: `AI calculation failed: ${error.message}`,
      suggestions: ["Try updating conference fields and recalculating."],
    });
  }
});

// AI: Conference Summary (for SEO)
app.post("/api/gemini/summarize", rateLimit("gemini", 30, 60 * 1000), async (req, res) => {
  const { description, title } = req.body || {};
  try {
    if (!description) {
      return res.status(400).json({ error: "Missing description" });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy-key") {
      return res.json({
        summary: description.substring(0, 160) + "...",
        seoTitle: title || "Conference",
        seoDescription: description.substring(0, 150),
        keywords: ["conference", "academic", "professional"],
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate SEO-optimized content for a conference listing.

Conference Title: ${title || "Conference"}
Description: ${description}

Generate:
1. A compelling 150-160 character meta description
2. An optimized SEO title (under 60 characters)
3. 5-8 relevant SEO keywords

Return as JSON.`,
      config: {
        systemInstruction: "You are an SEO expert for academic and professional conference listings. Generate high-quality search engine optimized content.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Concise conference summary" },
            seoTitle: { type: Type.STRING, description: "SEO-optimized title under 60 chars" },
            seoDescription: { type: Type.STRING, description: "Meta description 150-160 chars" },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant keywords" },
          },
          required: ["summary", "seoTitle", "seoDescription", "keywords"],
        },
      },
    });

    const resultText = response.text || "{}";
    const resultObj = JSON.parse(resultText);
    res.json(resultObj);
  } catch (error: any) {
    console.error("AI Summary Error:", error);
    res.status(500).json({
      summary: (description || "").substring(0, 160) + "...",
      seoTitle: title || "Conference",
      seoDescription: (description || "").substring(0, 150),
      keywords: ["conference", "academic", "professional"],
    });
  }
});

// Setup Vite Dev Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 International Conference running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints:`);
    console.log(`  - /api/health`);
    console.log(`  - /api/gemini/detect-duplicate`);
    console.log(`  - /api/gemini/quality-score`);
    console.log(`  - /api/gemini/summarize`);
    console.log(`  - /sitemap.xml`);
    console.log(`  - /robots.txt`);
  });
}

startServer();
