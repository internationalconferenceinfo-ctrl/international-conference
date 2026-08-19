import { Conference } from "../types";
import { getSupabaseClient, deleteFromSupabase } from "../../database/supabase";
import { getIanaDateBoundaryTimestamp, resolveConferenceTimeZone } from "./timezoneUtils";

const TIMEZONE_OFFSET_MAP: Record<string, number> = {
  UTC: 0, GMT: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7, AKST: -9, HST: -10, BST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3, MSK: 3, GST: 4, IST: 5.5, ICT: 7, SGT: 8, CST_CHINA: 8, HKT: 8, JST: 9, KST: 9, AEST: 10, AEDT: 11, NZST: 12, NZDT: 13,
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

function getConferenceDateBoundaryTimestamp(
  conf: { startDate?: string; endDate?: string; timeZone?: string; country?: string; city?: string },
  boundary: "start" | "end"
): number | null {
  const dateStr = boundary === "start" ? conf.startDate : (conf.endDate || conf.startDate);
  const zone = resolveConferenceTimeZone(conf.timeZone, conf.country, conf.city);
  return getIanaDateBoundaryTimestamp(dateStr, zone, boundary);
}

export function getConferenceStartTimestamp(conf: { startDate?: string; timeZone?: string; country?: string; city?: string; }): number | null {
  return getConferenceDateBoundaryTimestamp(conf, "start");
}

export function getConferenceEndTimestamp(conf: { startDate?: string; endDate?: string; time?: string; timeZone?: string; country?: string; city?: string; }): number | null {
  return getConferenceDateBoundaryTimestamp(conf, "end");
}

export function isConferenceExpired(
  conf: { startDate?: string; endDate?: string; time?: string; timeZone?: string; country?: string; city?: string; status?: string },
  referenceTime: Date = new Date()
): boolean {
  if (!conf) return false;
  const statusStr = String(conf.status || "").toLowerCase().trim();
  if (
    statusStr === "draft" ||
    statusStr === "pending review" ||
    statusStr === "pending_review" ||
    statusStr === "pending" ||
    statusStr === "rejected"
  ) {
    return false;
  }

  const endMs = getConferenceEndTimestamp(conf);
  if (endMs === null) return false;
  return referenceTime.getTime() > endMs;
}

export function isConferenceCompleted(
  conf: { startDate?: string; endDate?: string; time?: string; timeZone?: string; country?: string; city?: string; status?: string; liveStatus?: string },
  referenceTime: Date = new Date()
): boolean {
  if (!conf) return false;
  const statusStr = String(conf.status || "").toLowerCase().trim();
  const liveStatusStr = String(conf.liveStatus || "").toLowerCase().trim();

  if (statusStr === "draft" || statusStr === "rejected") {
    return false;
  }

  if (liveStatusStr === "completed" || statusStr === "completed") {
    return true;
  }

  return isConferenceExpired(conf, referenceTime);
}

export function extractStoragePathFromUrl(imageUrl?: string): { bucket: string; path: string } | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  const storageMatch = trimmed.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (storageMatch) {
    return {
      bucket: storageMatch[1],
      path: decodeURIComponent(storageMatch[2]),
    };
  }
  return null;
}

export async function deleteExpiredConferenceFromSupabase(conf: Conference): Promise<boolean> {
  if (!conf || !conf.id) return false;
  const client = getSupabaseClient();
  try {
    if (client && conf.bannerImage) {
      const storageInfo = extractStoragePathFromUrl(conf.bannerImage);
      if (storageInfo) {
        try {
          await client.storage.from(storageInfo.bucket).remove([storageInfo.path]);
        } catch (err) {}
      }
    }
    const deleted = await deleteFromSupabase("conferences", conf.id);
    if (client) {
      try {
        await client.from("audit_logs").delete().eq("conference_id", conf.id);
      } catch (e) {}
    }
    return deleted;
  } catch (err) {
    return false;
  }
}

export async function cleanUpAllExpiredConferences(
  conferencesList: Conference[],
  referenceTime: Date = new Date()
): Promise<{ activeConferences: Conference[]; deletedIds: string[] }> {
  if (!Array.isArray(conferencesList) || conferencesList.length === 0) {
    return { activeConferences: [], deletedIds: [] };
  }

  const updatedList = conferencesList.map((conf) => {
    if (isConferenceCompleted(conf, referenceTime) && conf.liveStatus !== "Completed") {
      return { ...conf, liveStatus: "Completed" as any };
    }
    return conf;
  });

  return { activeConferences: updatedList, deletedIds: [] };
}
