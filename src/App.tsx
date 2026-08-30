import React, { lazy, Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { safeSetLocalStorage, safeGetLocalStorage } from "./shared/utils/storageUtils";
import { adminFetch, setAdminTabToken, clearAdminTabToken, getAdminTabToken } from "./shared/utils/adminSession";
import { toUpperCaseName } from "./shared/utils/textUtils";
import { 
  saveToSupabase, 
  fetchFromSupabase, 
  deleteFromSupabase, 
  saveRecordToSupabase, 
  deleteRecordFromSupabase, 
  subscribeToSupabase, 
  isSupabaseConfigured, 
  signInWithSupabase,
  signOutWithSupabase, 
  onSupabaseAuthStateChange, 
  getSupabaseClient 
} from "./database/supabase";
import { 
  Award, ShieldCheck, Globe, MapPin, Users, FileText, CheckCircle2, 
  X, ExternalLink, Calendar, Clock, LogIn, UserPlus, LogOut,
  LayoutDashboard, User, Mail, Lock, Key, Building, Menu, Home,
  Sparkles, Search, ArrowRight, ChevronRight, ChevronLeft, Star, TrendingUp,
  Clock as ClockIcon, MapPin as MapPinIcon, Calendar as CalendarIcon, ArrowLeft,
  Share2, Twitter, Linkedin, Facebook, Instagram, Youtube
} from "lucide-react";
import {
  Conference,
  OrganizerProfile,
  Category,
  Notification,
  AuditLog,
  ConferenceStatus,
  LiveStatus,
  INITIAL_CATEGORIES,
  INITIAL_CONFERENCES,
  INITIAL_ORGANIZERS,
  INITIAL_AUDIT_LOGS,
  Banner,
  INITIAL_BANNERS,
  BannerContentItem,
  UserFeedback,
  SubscriberItem,
  formatConferenceDate,
} from "./types";
import { isConferenceCompleted, getConferenceStartTimestamp, getConferenceEndTimestamp, extractStoragePathFromUrl } from "./utils/expirationUtils";
const PublicPortal = lazy(() => import("./user/PublicPortal"));
const OrganizerPortal = lazy(() => import("./organizer/OrganizerPortal"));
const AdminPortal = lazy(() => import("./admin/AdminPortal"));

const PortalLoading = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-slate-50" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3 text-slate-600">
      <div className="h-9 w-9 rounded-full border-4 border-slate-200 border-t-[#37494E] animate-spin" />
      <span className="text-sm font-semibold">Loading portal…</span>
    </div>
  </div>
);

import {
  slugify,
  generateUniqueConferenceSlug,
  ensureConferenceSlugs,
  getConferenceSlug,
  generateUniqueOrganizerSlug,
  ensureOrganizerSlugs,
  getOrganizerSlug,
} from "./shared/utils/slugUtils";

export {
  slugify,
  generateUniqueConferenceSlug,
  ensureConferenceSlugs,
  getConferenceSlug,
  generateUniqueOrganizerSlug,
  ensureOrganizerSlugs,
  getOrganizerSlug,
};

// Auth Types
type AuthMode = "LOGIN" | "SIGNUP" | "FORGOT_PASSWORD" | "NONE";
type UserRole = "VISITOR" | "ORGANIZER" | "ADMIN";


interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  organizerId?: string;
}



export const getCleanImageSrc = (src?: string, fallback = ""): string => {
  if (!src) return fallback;
  const trimmed = src.trim();
  if (!trimmed || trimmed === "Local File (Base64 Encoded)") return fallback;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (trimmed.length > 50 && !trimmed.includes(" ")) {
    return `data:image/png;base64,${trimmed}`;
  }
  return trimmed || fallback;
};

export const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.555 4.109 1.525 5.835L0 24l6.335-1.503A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.92 9.92 0 01-5.06-1.39l-.363-.216-3.765.893.911-3.669-.236-.375A9.927 9.927 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
  </svg>
);

export const TelegramIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.98-1.66 4.81-1.95 5.35-1.96.12 0 .38.03.55.17.14.12.18.28.2.4.02.13.01.27 0 .37z"/>
  </svg>
);

export const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .58.04.86.12V9.42a6.27 6.27 0 00-.86-.06A6.34 6.34 0 003.15 15.7a6.34 6.34 0 0010.82 4.48V12a8.28 8.28 0 005.62 2.22v-3.71a4.84 4.84 0 01-3.77-1.82z"/>
  </svg>
);

export const GithubIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

export const PinterestIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/>
  </svg>
);

export default function App() {
  // App State - Supabase is the sole authoritative source of truth (no localStorage persistence)
  const [conferences, setConferences] = useState<Conference[]>([]);

  const deduplicateCategories = (cats: Category[]): Category[] => {
    if (!Array.isArray(cats)) return [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const result: Category[] = [];
    for (const cat of cats) {
      if (!cat || !cat.id) continue;
      const normName = cat.name ? cat.name.trim().toLowerCase() : "";
      if (!seenIds.has(cat.id) && (!normName || !seenNames.has(normName))) {
        seenIds.add(cat.id);
        if (normName) seenNames.add(normName);
        result.push(cat);
      }
    }
    return result;
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerContents, setBannerContents] = useState<BannerContentItem[]>([]);
  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedback[]>([]);
  const [subscriberEmails, setSubscriberEmails] = useState<SubscriberItem[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

const DEFAULT_COUNTRIES = [
  "UNITED STATES", "UNITED KINGDOM", "CANADA", "AUSTRALIA", "GERMANY", 
  "FRANCE", "JAPAN", "INDIA", "SINGAPORE", "ITALY", "SPAIN", "BRAZIL"
];

const DEFAULT_CITIES: Array<{ name: string; country: string }> = [
  { name: "NEW YORK", country: "UNITED STATES" },
  { name: "LOS ANGELES", country: "UNITED STATES" },
  { name: "CHICAGO", country: "UNITED STATES" },
  { name: "SAN FRANCISCO", country: "UNITED STATES" },
  { name: "LONDON", country: "UNITED KINGDOM" },
  { name: "MANCHESTER", country: "UNITED KINGDOM" },
  { name: "TORONTO", country: "CANADA" },
  { name: "VANCOUVER", country: "CANADA" },
  { name: "SYDNEY", country: "AUSTRALIA" },
  { name: "MELBOURNE", country: "AUSTRALIA" },
  { name: "BERLIN", country: "GERMANY" },
  { name: "MUNICH", country: "GERMANY" },
  { name: "PARIS", country: "FRANCE" },
  { name: "TOKYO", country: "JAPAN" },
  { name: "OSAKA", country: "JAPAN" },
  { name: "NEW DELHI", country: "INDIA" },
  { name: "MUMBAI", country: "INDIA" },
  { name: "SINGAPORE", country: "SINGAPORE" },
  { name: "ROME", country: "ITALY" },
  { name: "MILAN", country: "ITALY" },
  { name: "MADRID", country: "SPAIN" },
  { name: "BARCELONA", country: "SPAIN" },
  { name: "RIO DE JANEIRO", country: "BRAZIL" },
];

  // Location States
  const [countriesList, setCountriesList] = useState<string[]>(DEFAULT_COUNTRIES);
  const [citiesList, setCitiesList] = useState<Array<{ name: string; country: string }>>(DEFAULT_CITIES);
  const [inactiveCountries, setInactiveCountries] = useState<string[]>([]);
  const [inactiveCities, setInactiveCities] = useState<string[]>([]);

  const isSupabaseLoaded = useRef(false);
  const pendingFullSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBroadcastSync = useCallback(() => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("gch_realtime_sync");
        bc.postMessage({ type: "DATA_UPDATED", timestamp: Date.now() });
        bc.close();
      }
      localStorage.setItem("gch_last_sync_trigger", String(Date.now()));
    } catch (e) {}
  }, []);

  // Optimized background data sync function
  const syncAllDataFromSupabase = useCallback(async (roleOverride?: UserRole) => {
    if (!isSupabaseConfigured()) {
      isSupabaseLoaded.current = true;
      setInitialDataLoaded(true);
      return;
    }

    try {
      let sessionRole: UserRole = roleOverride || "VISITOR";
      if (!roleOverride) {
        try {
          const savedSession = JSON.parse(sessionStorage.getItem("gch_auth_user") || "null") as AuthUser | null;
          if (savedSession?.role) sessionRole = savedSession.role;
        } catch {}
      }
      const needsAdminData = sessionRole === "ADMIN";
      const needsPrivateNotifications = sessionRole === "ADMIN" || sessionRole === "ORGANIZER";

      // Resolve route-critical data first. Conference detail URLs should not
      // wait for banners, feedback, locations, subscribers, or audit tables.
      const [routeConferences, routeOrganizers] = await Promise.all([
        fetchFromSupabase<Conference[]>("conferences", needsAdminData),
        fetchFromSupabase<OrganizerProfile[]>("organizers", needsAdminData),
      ]);

      if (Array.isArray(routeConferences)) {
        setConferences((prevConfs) => {
          const prevMap = new Map<string, Conference>(prevConfs.map((c) => [c.id, c]));
          const merged = routeConferences.map((c) => {
            const prev = prevMap.get(c.id);
            return {
              ...c,
              bannerImage: c.bannerImage || prev?.bannerImage || "",
              organizerName: c.organizerName || prev?.organizerName || "",
              contactEmail: c.contactEmail || prev?.contactEmail || "",
            };
          });
          // Keep completed records in memory so Admin and Organizer completed
          // sections can display them. Public listings filter them separately.
          return ensureConferenceSlugs(merged);
        });
      }

      if (Array.isArray(routeOrganizers)) {
        setOrganizers(ensureOrganizerSlugs(routeOrganizers));
      }
      setInitialDataLoaded(true);

      const [
        confData,
        catData,
        orgData,
        bannerData,
        bannerContentData,
        feedbackData,
        subData,
        countryData,
        cityData,
        inactCountryData,
        inactCityData,
        auditData,
        notifData
      ] = await Promise.all([
        fetchFromSupabase<Conference[]>("conferences", needsAdminData),
        fetchFromSupabase<Category[]>("categories", needsAdminData),
        fetchFromSupabase<OrganizerProfile[]>("organizers", needsAdminData),
        fetchFromSupabase<Banner[]>("banners"),
        fetchFromSupabase<BannerContentItem[]>("banner_contents"),
        fetchFromSupabase<UserFeedback[]>("user_feedbacks"),
        needsAdminData ? fetchFromSupabase<SubscriberItem[]>("subscriber_emails") : Promise.resolve([]),
        fetchFromSupabase<string[]>("countries"),
        fetchFromSupabase<Array<{ name: string; country: string }>>("cities"),
        fetchFromSupabase<string[]>("inactive_countries"),
        fetchFromSupabase<string[]>("inactive_cities"),
        needsAdminData ? fetchFromSupabase<AuditLog[]>("audit_logs") : Promise.resolve([]),
        needsPrivateNotifications ? fetchFromSupabase<Notification[]>("notifications") : Promise.resolve([]),
      ]);

      if (confData !== null && Array.isArray(confData)) {
        setConferences((prevConfs) => {
          const prevMap = new Map<string, Conference>(prevConfs.map((c: Conference) => [c.id, c]));
          const merged = (confData as Conference[]).map((c: Conference) => {
            const prev = prevMap.get(c.id);
            return {
              ...c,
              bannerImage: c.bannerImage || prev?.bannerImage || "",
              organizerName: c.organizerName || prev?.organizerName || "",
              contactEmail: c.contactEmail || prev?.contactEmail || ""
            };
          });
          const ensureSlugs = ensureConferenceSlugs(merged);
          if (JSON.stringify(prevConfs) !== JSON.stringify(ensureSlugs)) {
            return ensureSlugs;
          }
          return prevConfs;
        });
      }

      if (catData !== null && Array.isArray(catData)) {
        setCategories((prev) => (JSON.stringify(prev) !== JSON.stringify(catData) ? catData : prev));
      }

      if (orgData !== null && Array.isArray(orgData)) {
        setOrganizers((prevOrgs) => {
          const prevMap = new Map<string, OrganizerProfile>(prevOrgs.map((o) => [o.id, o]));
          const merged = (orgData as OrganizerProfile[]).map((o: OrganizerProfile) => {
            const prev = prevMap.get(o.id);
            return { ...prev, ...o };
          });
          const formatted = ensureOrganizerSlugs(merged);
          if (JSON.stringify(prevOrgs) !== JSON.stringify(formatted)) {
            return formatted;
          }
          return prevOrgs;
        });
      }

      if (bannerData !== null && Array.isArray(bannerData)) {
        const uniqueBanners = Array.from(new Map(bannerData.map((b: Banner) => [b.id, b])).values());
        setBanners((prev) => (JSON.stringify(prev) !== JSON.stringify(uniqueBanners) ? uniqueBanners : prev));
      }

      if (bannerContentData !== null && Array.isArray(bannerContentData)) {
        setBannerContents((prev) => (JSON.stringify(prev) !== JSON.stringify(bannerContentData) ? bannerContentData : prev));
      }

      if (feedbackData !== null && Array.isArray(feedbackData)) {
        const uniqueFeedbacks = Array.from(new Map(feedbackData.map((f: UserFeedback) => [f.id, f])).values());
        setUserFeedbacks((prev) => (JSON.stringify(prev) !== JSON.stringify(uniqueFeedbacks) ? uniqueFeedbacks : prev));
      }

      if (subData !== null && Array.isArray(subData)) {
        setSubscriberEmails((prev) => (JSON.stringify(prev) !== JSON.stringify(subData) ? subData : prev));
      }

      if (countryData !== null && Array.isArray(countryData)) {
        const formatted = countryData
          .map((item: any) => (typeof item === "string" ? item : String(item?.name || item?.id || "")).trim().toUpperCase())
          .filter(Boolean);
        const unique = Array.from(new Set(formatted));
        setCountriesList((prev) => (JSON.stringify(prev) !== JSON.stringify(unique) ? unique : prev));
      }

      if (cityData !== null && Array.isArray(cityData)) {
        const formatted = cityData
          .map((item: any) => ({
            name: String(item?.name || item?.id || "").trim().toUpperCase(),
            country: String(item?.country || "").trim().toUpperCase()
          }))
          .filter((c) => Boolean(c.name));
        const cityMap = new Map<string, { name: string; country: string }>();
        formatted.forEach((c) => {
          const key = `${c.country}:::${c.name}`;
          if (!cityMap.has(key)) cityMap.set(key, c);
        });
        const unique = Array.from(cityMap.values());
        setCitiesList((prev) => (JSON.stringify(prev) !== JSON.stringify(unique) ? unique : prev));
      }

      if (inactCountryData !== null && Array.isArray(inactCountryData)) {
        setInactiveCountries((prev) => (JSON.stringify(prev) !== JSON.stringify(inactCountryData) ? inactCountryData : prev));
      }

      if (inactCityData !== null && Array.isArray(inactCityData)) {
        setInactiveCities((prev) => (JSON.stringify(prev) !== JSON.stringify(inactCityData) ? inactCityData : prev));
      }


      if (auditData !== null && Array.isArray(auditData)) {
        setAuditLogs((prev) => (JSON.stringify(prev) !== JSON.stringify(auditData) ? auditData : prev));
      }

      if (notifData !== null && Array.isArray(notifData)) {
        setNotifications((prev) => (JSON.stringify(prev) !== JSON.stringify(notifData) ? notifData : prev));
      }

      isSupabaseLoaded.current = true;
      setInitialDataLoaded(true);
    } catch (err) {
      console.warn("Background sync error notice:", err);
      isSupabaseLoaded.current = true;
      setInitialDataLoaded(true);
    }
  }, []);

  // Collapse bursts from realtime, focus, online, and cross-tab events into
  // one database refresh instead of downloading every table repeatedly.
  const requestFullSync = useCallback(() => {
    if (pendingFullSyncTimer.current) clearTimeout(pendingFullSyncTimer.current);
    pendingFullSyncTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible") syncAllDataFromSupabase();
    }, 750);
  }, [syncAllDataFromSupabase]);

  // Initial fetch and real-time event-driven listeners
  useEffect(() => {
    syncAllDataFromSupabase();

    // Relaxed background fallback sync (every 5 minutes instead of 2.5 seconds)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") syncAllDataFromSupabase();
    }, 600000);

    // BroadcastChannel for instant local cross-tab updates (0ms delay, 0 egress)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("gch_realtime_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "DATA_UPDATED") {
            requestFullSync();
          }
        };
      } catch (e) {}
    }

    // Storage event for local cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "gch_last_sync_trigger") {
        requestFullSync();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Real-time subscriptions for remote database updates across devices
    const unsubConfs = subscribeToSupabase("conferences", requestFullSync);
    const unsubOrgs = subscribeToSupabase("organizers", requestFullSync);
    const unsubBanners = subscribeToSupabase("banners", requestFullSync);
    const unsubFeedbacks = subscribeToSupabase("user_feedbacks", requestFullSync);

    // Throttle window focus syncs so switching tabs doesn't spam Supabase
    let lastFocusSync = Date.now();
    const handleFocus = () => {
      if (Date.now() - lastFocusSync > 60000) {
        lastFocusSync = Date.now();
        requestFullSync();
      }
    };
    const handleOnline = () => requestFullSync();
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      if (pendingFullSyncTimer.current) clearTimeout(pendingFullSyncTimer.current);
      if (bc) bc.close();
      unsubConfs();
      unsubOrgs();
      unsubBanners();
      unsubFeedbacks();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncAllDataFromSupabase, requestFullSync]);

  // Periodic check to update status of completed conferences (every 15 minutes - NO automatic deletion)
  useEffect(() => {
    if (!conferences || conferences.length === 0) return;

    const checkAndMarkCompleted = async () => {
      let changed = false;
      const updated = conferences.map((conf) => {
        if (conf.status !== ConferenceStatus.Approved) return conf;
        const now = Date.now();
        const start = getConferenceStartTimestamp(conf);
        const end = getConferenceEndTimestamp(conf);
        const expectedLiveStatus = start !== null && now < start
          ? LiveStatus.Upcoming
          : end !== null && now > end
          ? LiveStatus.Completed
          : LiveStatus.Ongoing;
        if (conf.liveStatus !== expectedLiveStatus) {
          changed = true;
          return { ...conf, liveStatus: expectedLiveStatus };
        }
        return conf;
      });

      if (changed) {
        setConferences(updated);
        safeSetLocalStorage("gch_conferences", updated);
        // Database live-status synchronization is server-side so strict RLS
        // never requires a visitor/Organizer browser to update other records.
        triggerBroadcastSync();
      }
    };

    checkAndMarkCompleted();
    const interval = setInterval(checkAndMarkCompleted, 900000);
    return () => clearInterval(interval);
  }, [conferences, triggerBroadcastSync]);

  // Supabase Auth State synchronization. A temporary profile-fetch miss must
  // never invalidate a valid Supabase Auth session. Realtime refreshes and
  // profile updates can briefly return stale/empty profile data. Only an
  // explicitly suspended Organizer (or a real SIGNED_OUT event) may clear it.
  useEffect(() => {
    const unsubAuth = onSupabaseAuthStateChange(async (sbUser) => {
      // Admin and Organizer authentication intentionally coexist. Supabase Auth
      // synchronizes Organizer sessions across tabs, while Admin uses a separate
      // HttpOnly server cookie. Never let an Organizer auth event replace an
      // Admin tab's role/state.
      const currentPath = decodeURIComponent(window.location.pathname).toLowerCase().replace(/\/+$/, "") || "/";
      const thisTabIsAdmin = currentPath === "/admin-portal";
      if (thisTabIsAdmin) return;

      if (sbUser && sbUser.user_metadata?.role === "ORGANIZER") {
        let freshOrgs: OrganizerProfile[] | null = null;
        try {
          freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
        } catch (err) {
          console.warn("Organizer profile refresh failed; keeping authenticated session.", err);
        }

        const matchedOrg = freshOrgs?.find(
          (o) =>
            o.authUserId === sbUser.id ||
            o.id === sbUser.id ||
            o.email?.toLowerCase().trim() === sbUser.email?.toLowerCase().trim()
        );

        if (matchedOrg?.isSuspended) {
          await signOutWithSupabase().catch(() => undefined);
          setAuthUser((current) => current?.role === "ADMIN" ? current : null);
          setActivePortal("VISITOR");
          return;
        }

        // If the profile query is temporarily stale/missing, preserve the
        // authenticated identity using the auth user id. The normal data sync
        // will reconcile organizerId/profile fields as soon as the row returns.
        setAuthUser((current) => ({
        id: sbUser.id,
        email: sbUser.email || current?.email || "",
        role: "ORGANIZER",
        name:
          matchedOrg?.contactPerson ||
          matchedOrg?.organizationName ||
          (current?.role === "ORGANIZER" ? current.name : "") ||
          sbUser.user_metadata?.name ||
          "Organizer",
        organizerId:
          matchedOrg?.id ||
          (current?.role === "ORGANIZER" ? current.organizerId : undefined) ||
          sbUser.id,
      }));

      // Only force the Organizer dashboard when the user is actually on
      // the Organizer portal route.
      // Public conference/detail pages must remain public even when the
      // Organizer is logged in.
      const organizerPortalRoute =
        currentPath === "/organizer-portal" ||
        currentPath.startsWith("/organizer-portal/");

      if (organizerPortalRoute) {
        setActivePortal("ORGANIZER");
        setAuthMode("NONE");
      }

      // If Organizer is viewing a public conference/page,
      // keep the public portal active.
      if (!organizerPortalRoute) {
        setActivePortal("VISITOR");
      }

      setAuthError("");
      } else if (!sbUser) {
        setAuthUser((current) => current?.role === "ADMIN" ? current : null);
        const path = decodeURIComponent(window.location.pathname).toLowerCase().replace(/\/+$/, "") || "/";
        if (path === "/organizer-portal") {
          setActivePortal("VISITOR");
          setAuthMode("LOGIN");
        }
      }
    });

    return () => unsubAuth();
  }, []);

  // Restore the authenticated dashboard session synchronously before the first
  // render. Initializing with null caused the persistence effect to erase the
  // saved session during every browser refresh.
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem("gch_auth_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved) as AuthUser;
      // Organizer identity is restored only by Supabase Auth. Never trust a
      // browser-stored Organizer object as authentication proof.
      if (!parsed?.id || !parsed?.email || parsed.role !== "ADMIN") {
        sessionStorage.removeItem("gch_auth_user");
        return null;
      }
      return parsed;
    } catch {
      sessionStorage.removeItem("gch_auth_user");
      return null;
    }
  });

  // Restore/verify the signed HttpOnly Admin session. The server cookie is the
  // authentication source of truth, so a private browser or cleared localStorage
  // can still restore a valid Admin session without refresh loops.
  useEffect(() => {
    const path = decodeURIComponent(window.location.pathname).toLowerCase().replace(/\/+$/, "") || "/";
    const isAdminRoute = path === "/admin-portal";
    if (!isAdminRoute && authUser?.role !== "ADMIN") return;

    let cancelled = false;
    // The HttpOnly cookie is shared by all tabs. The per-tab token prevents an
    // Organizer tab from inheriting Admin privileges just because another tab
    // is logged in as Admin.
    if (!getAdminTabToken()) {
      if (isAdminRoute) {
        setAuthUser((current) => current?.role === "ADMIN" ? null : current);
        setActivePortal("VISITOR");
        setAuthMode("LOGIN");
      }
      return;
    }
    adminFetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.success && data?.user) {
          setAuthUser((current) => current?.role === "ADMIN" ? current : data.user);
          if (isAdminRoute) {
            setActivePortal("ADMIN");
            setAuthMode("NONE");
          }
          // Re-fetch with Admin privileges immediately; visitor data may have
          // been cached before login/refresh.
          void syncAllDataFromSupabase("ADMIN");
          return;
        }
        if (authUser?.role === "ADMIN") {
          clearAdminTabToken();
          setAuthUser(null);
          setActivePortal("VISITOR");
          setAuthMode("LOGIN");
          setAuthError("Your Admin session expired. Please sign in again.");
        } else if (isAdminRoute) {
          setActivePortal("VISITOR");
          setAuthMode("LOGIN");
        }
      })
      .catch(() => {
        if (!cancelled && authUser?.role === "ADMIN") {
          setAuthError("Could not verify the Admin session.");
        }
      });
    return () => { cancelled = true; };
  }, [authUser?.role, syncAllDataFromSupabase]);

  const [authMode, setAuthMode] = useState<AuthMode>("NONE");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authResetPin, setAuthResetPin] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [verifiedResetOrganizerId, setVerifiedResetOrganizerId] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [authError, setAuthError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Other state
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [activePortal, setActivePortal] = useState<"VISITOR" | "ORGANIZER" | "ADMIN">(() => {
    const pathname = decodeURIComponent(window.location.pathname).toLowerCase().trim().replace(/^\/+|\/+$/g, "");
    const firstSegment = pathname.split("/").filter(Boolean)[0] || "";
    if (firstSegment === "admin-portal") return "ADMIN";
    if (firstSegment === "organizer-portal") return "ORGANIZER";
    if (
      firstSegment === "conference" ||
      firstSegment === "conferences" ||
      firstSegment === "events" ||
      firstSegment === "organizers" ||
      firstSegment === "organizer" ||
      firstSegment === "about" ||
      firstSegment === "contact" ||
      firstSegment === "privacy" ||
      firstSegment === "terms" ||
      firstSegment === "feedback" ||
      firstSegment === "feedbacks" ||
      firstSegment === "testimonials" ||
      firstSegment === "testimonial" ||
      firstSegment === "reviews" ||
      firstSegment === "media-partner" ||
      firstSegment === "associates" ||
      firstSegment === "login" ||
      firstSegment === "signup" ||
      firstSegment === "home"
    ) {
      return "VISITOR";
    }
    const savedPortal = sessionStorage.getItem("gch_active_portal");
    if (savedPortal === "ADMIN" || savedPortal === "ORGANIZER" || savedPortal === "VISITOR") {
      if (firstSegment && firstSegment !== "admin-portal" && firstSegment !== "organizer-portal") {
        return "VISITOR";
      }
      return savedPortal as any;
    }
    const savedUser = sessionStorage.getItem("gch_auth_user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u?.role === "ADMIN" && (firstSegment === "admin-portal" || !firstSegment)) return "ADMIN";
        if (u?.role === "ORGANIZER" && (firstSegment === "organizer-portal" || !firstSegment)) return "ORGANIZER";
      } catch (e) {}
    }
    return "VISITOR";
  });

  useEffect(() => {
    sessionStorage.setItem("gch_active_portal", activePortal);
  }, [activePortal]);

  // Automatically lock the page behind every full-screen modal in the app.
  // This also covers modals rendered inside lazy-loaded public/admin/organizer portals.
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const updateModalScrollLock = () => {
      const hasOpenModal = Boolean(document.querySelector(".fixed.inset-0.z-50"));
      body.style.overflow = hasOpenModal ? "hidden" : "";
      html.style.overflow = hasOpenModal ? "hidden" : "";
    };

    const observer = new MutationObserver(updateModalScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });
    updateModalScrollLock();

    return () => {
      observer.disconnect();
      body.style.overflow = "";
      html.style.overflow = "";
    };
  }, []);
  const [publicTab, setPublicTab] = useState<string>("HOME");
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const orgConferencesScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top on active page, tab, or detail selection change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [publicTab, selectedConference, selectedOrganizerId, activePortal]);

  // Match category from URL pathname
  const matchCategory = (cleanPath: string): string | null => {
    if (!cleanPath) return null;

    if (cleanPath === "artificial-intelligence" || cleanPath === "artificial-intelligence-ml" || cleanPath === "ai") return "Artificial Intelligence & ML";
    if (cleanPath === "medical-health-sciences" || cleanPath === "health-medicine" || cleanPath === "medical") return "Medical & Health Sciences";
    if (cleanPath === "information-technology-security" || cleanPath === "information-technology" || cleanPath === "computer-science") return "Information Technology & Security";
    if (cleanPath === "business-finance-fintech" || cleanPath === "business-economics") return "Business, Finance & Fintech";
    if (cleanPath === "civil-mechanical-engineering" || cleanPath === "engineering-technology") return "Civil & Mechanical Engineering";
    if (cleanPath === "education-edtech" || cleanPath === "education") return "Education & EdTech";
    if (cleanPath === "environmental-science-sustainability" || cleanPath === "environmental-science") return "Environmental Science & Sustainability";
    if (cleanPath === "mathematics-statistics") return "Mathematics & Statistics";

    for (const cat of categories) {
      const sName = slugify(cat.name);
      if (sName === cleanPath || cat.name.toLowerCase() === cleanPath) return cat.name;
    }

    for (const cat of INITIAL_CATEGORIES) {
      const sName = slugify(cat.name);
      if (sName === cleanPath || cat.name.toLowerCase() === cleanPath) return cat.name;
    }

    for (const c of conferences) {
      if (c.category) {
        const sName = slugify(c.category);
        if (sName === cleanPath || c.category.toLowerCase() === cleanPath) return c.category;
      }
    }

    return null;
  };

  // Match country or city from URL pathname
  const matchCountryOrCity = (cleanPath: string) => {
    if (!cleanPath) return null;
    
    // Check if cleanPath matches any active country in countriesList
    const matchedCountry = countriesList.find(
      (c) => (slugify(c) === cleanPath || c.toLowerCase() === cleanPath) && !inactiveCountries.includes(c)
    );
    if (matchedCountry) {
      return { type: "country", name: matchedCountry };
    }
    
    // Check if cleanPath matches any active country in existing conferences
    const dbCountry = conferences.find(
      (c) => (slugify(c.country || "") === cleanPath || c.country?.toLowerCase() === cleanPath) && !inactiveCountries.includes(c.country || "")
    );
    if (dbCountry && dbCountry.country) {
      return { type: "country", name: dbCountry.country };
    }
    
    // Check if cleanPath matches any active city in citiesList
    const adminCity = citiesList.find(
      (ct) => (slugify(ct.name || "") === cleanPath || ct.name?.toLowerCase() === cleanPath) &&
              !inactiveCountries.includes(ct.country) &&
              !inactiveCities.includes(`${ct.country}:::${ct.name}`)
    );
    if (adminCity) {
      return { type: "city", name: adminCity.name, country: adminCity.country };
    }
    
    // Check if cleanPath matches any active city in existing conferences
    const dbCity = conferences.find(
      (c) => (slugify(c.city || "") === cleanPath || c.city?.toLowerCase() === cleanPath) &&
              c.country && !inactiveCountries.includes(c.country) &&
              !inactiveCities.includes(`${c.country}:::${c.city}`)
    );
    if (dbCity && dbCity.city && dbCity.country) {
      return { type: "city", name: dbCity.city, country: dbCity.country };
    }
    
    return null;
  };

  const hasParsedInitialUrl = useRef(false);
  const initialPathRef = useRef(
    typeof window !== "undefined" ? window.location.pathname + window.location.search : "/"
  );
  const [initialRouteResolved, setInitialRouteResolved] = useState(() => {
    const initialPath = typeof window !== "undefined" ? window.location.pathname : "/";
    return initialPath === "/" || initialPath === "";
  });

  // Parse URL and apply application state accordingly
  const parseURLAndApplyState = (
    targetConfsList?: Conference[],
    targetOrgsList?: OrganizerProfile[],
    customPath?: string
  ) => {
    const confsToUse = targetConfsList && targetConfsList.length > 0 ? targetConfsList : conferences;
    const orgsToUse = targetOrgsList && targetOrgsList.length > 0 ? targetOrgsList : organizers;

    const fullPath = customPath || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
    const [pathname, searchStr] = fullPath.split("?");
    const params = new URLSearchParams(searchStr || (typeof window !== "undefined" ? window.location.search : ""));
    const legacyEventId = params.get("event") || params.get("id");
    const legacyOrgId = params.get("organizer");
    
    const cleanPath = decodeURIComponent(pathname || "").toLowerCase().trim().replace(/^\/+|\/+$/g, "");
    const segments = cleanPath.split("/").filter(Boolean);
    const firstSegment = segments[0] || "";
    
    let nextTab = "HOME";
    let nextAuth: AuthMode = "NONE";
    let nextCategory = "All";
    let nextCountry = "All";
    let nextCity = "All";
    let nextConf: Conference | null = null;
    let nextOrgId: string | null = null;
    let nextPortal: "VISITOR" | "ORGANIZER" | "ADMIN" = "VISITOR";

    if (segments.length > 0) {
      if (firstSegment === "home") {
        nextTab = "HOME";
      } else if (firstSegment === "about" || firstSegment === "about-us" || firstSegment === "about_us") {
        nextTab = "ABOUT";
      } else if (firstSegment === "media-partner" || firstSegment === "event-media-partner" || firstSegment === "media") {
        nextTab = "MEDIAPARTNER";
      } else if (firstSegment === "associates" || firstSegment === "our-associates") {
        nextTab = "ASSOCIATES";
      } else if (firstSegment === "contact" || firstSegment === "contact-us" || firstSegment === "contact_us") {
        nextTab = "CONTACT";
      } else if (firstSegment === "privacy" || firstSegment === "privacy-policy" || firstSegment === "privacy_policy") {
        nextTab = "PRIVACY";
      } else if (firstSegment === "terms" || firstSegment === "terms-of-service" || firstSegment === "terms_of_service") {
        nextTab = "TERMS";
      } else if (firstSegment === "feedback" || firstSegment === "feedbacks" || firstSegment === "testimonials" || firstSegment === "testimonial" || firstSegment === "reviews") {
        nextTab = "FEEDBACK";
      } else if (firstSegment === "login") {
        nextAuth = "LOGIN";
        nextTab = "HOME";
      } else if (firstSegment === "signup" || firstSegment === "sign-up" || firstSegment === "register") {
        nextAuth = "SIGNUP";
        nextTab = "HOME";
      } else if (firstSegment === "organizer-portal") {
        nextPortal = "ORGANIZER";
      } else if (firstSegment === "admin-portal") {
        nextPortal = "ADMIN";
      } else if (firstSegment === "organizers" || firstSegment === "organizer") {
        nextTab = "EVENTS";
        if (segments[1]) {
          const orgSlug = segments[1];
          const foundOrg = orgsToUse.find(
            (o) =>
              (o.slug && o.slug.toLowerCase() === orgSlug.toLowerCase()) ||
              o.id.toLowerCase() === orgSlug.toLowerCase() ||
              slugify(o.organizationName) === orgSlug.toLowerCase()
          );
          if (foundOrg) nextOrgId = foundOrg.id;
        }
      } else {
        // Multi-segment directory filter or event detail
        const subSegments = (firstSegment === "events" || firstSegment === "conferences" || firstSegment === "conference")
          ? segments.slice(1)
          : segments;

        if (subSegments.length === 0) {
          nextTab = "EVENTS";
        } else {
          let matchedAnyFilter = false;
          const hasExplicitCountry = subSegments.some((s) => matchCountryOrCity(s)?.type === "country");

          for (const seg of subSegments) {
            if (!seg) continue;

            // Check single event detail route
            const targetConferences = ensureConferenceSlugs(
              confsToUse.filter(
                (conference) => conference.status === ConferenceStatus.Approved && !conference.isDeactivated
              )
            );
            // 1. Prefer the computed public slug for approved conferences so
            // non-public duplicates can never capture a visitor URL.
            let foundConf = targetConferences.find(
              (c) => String(c.status).toLowerCase() === "approved" &&
                getConferenceSlug(c, targetConferences).toLowerCase() === seg.toLowerCase()
            );
            // Then support stored/legacy slugs for approved public records.
            if (!foundConf) {
              foundConf = targetConferences.find(
                (c) => c.slug && c.slug.toLowerCase() === seg.toLowerCase()
              );
            }
            // 2. Exact ID match
            if (!foundConf) {
              foundConf = targetConferences.find(
                (c) => c.id && c.id.toLowerCase() === seg.toLowerCase()
              );
            }
            // 3. Fallback for composite legacy slug forms
            if (!foundConf) {
              foundConf = targetConferences.find(
                (c) =>
                  seg.toLowerCase().endsWith(`-${c.id.toLowerCase()}`) ||
                  seg.toLowerCase() === `${slugify(c.shortTitle || c.title)}-${c.id.toLowerCase()}` ||
                  seg.toLowerCase() === `${slugify(c.title)}-${c.id.toLowerCase()}`
              );
            }
            // 4. Last fallback to title slugify ONLY if no numeric deduplication suffix was specified
            if (!foundConf && !/-\d+$/.test(seg.toLowerCase())) {
              foundConf = targetConferences.find(
                (c) =>
                  slugify(c.title).toLowerCase() === seg.toLowerCase() ||
                  slugify(c.shortTitle || "").toLowerCase() === seg.toLowerCase()
              );
            }

            if (foundConf && (subSegments.length === 1 || firstSegment === "conference" || firstSegment === "conferences")) {
              nextConf = foundConf;
              nextTab = "EVENTS";
              matchedAnyFilter = true;
              break;
            }

            const cat = matchCategory(seg);
            const loc = matchCountryOrCity(seg);

            if (cat) {
              nextCategory = cat;
              nextTab = "EVENTS";
              matchedAnyFilter = true;
            } else if (loc) {
              nextTab = "EVENTS";
              matchedAnyFilter = true;
              if (loc.type === "country") {
                nextCountry = loc.name;
              } else if (loc.type === "city") {
                nextCity = loc.name;
                if (hasExplicitCountry && loc.country) {
                  nextCountry = loc.country;
                }
              }
            } else if (foundConf) {
              nextConf = foundConf;
              nextTab = "EVENTS";
              matchedAnyFilter = true;
            }
          }

          if (!matchedAnyFilter && !nextConf) {
            nextTab = "HOME";
          }
        }
      }
    } else {
      nextTab = "HOME";
    }

    // Support legacy query parameters for backward compatibility
    if (!nextConf && legacyEventId) {
      const found = confsToUse.find(
        (c) => c.id === legacyEventId && c.status === ConferenceStatus.Approved && !c.isDeactivated
      );
      if (found) nextConf = found;
    }
    if (!nextOrgId && legacyOrgId) {
      const foundOrg = orgsToUse.find((o) => o.id === legacyOrgId);
      if (foundOrg) nextOrgId = foundOrg.id;
    }

    // Keep previously shared approved links working, but replace them with one
    // canonical clean URL so search engines and visitors do not see duplicates.
    if (nextConf && typeof window !== "undefined") {
      const canonicalPath = `/conference/${getConferenceSlug(nextConf, confsToUse)}`;
      const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
      const isConferenceDetailRequest = firstSegment === "conference" || firstSegment === "conferences" || firstSegment === "events" || Boolean(legacyEventId);
      if (isConferenceDetailRequest && currentPath.toLowerCase() !== canonicalPath.toLowerCase()) {
        window.history.replaceState({ conferenceId: nextConf.id }, "", canonicalPath);
      }
    }

    const savedPortal = sessionStorage.getItem("gch_active_portal");
    if (firstSegment === "admin-portal") {
      // Protected portal routes are role-specific. Being logged in as an
      // Organizer must never redirect or mutate the Admin tab (and vice versa).
      if (authUser?.role === "ADMIN") {
        nextPortal = "ADMIN";
        nextAuth = "NONE";
      } else {
        nextPortal = "VISITOR";
        nextAuth = "LOGIN";
      }
    } else if (firstSegment === "organizer-portal") {
      if (authUser?.role === "ORGANIZER") {
        nextPortal = "ORGANIZER";
        nextAuth = "NONE";
      } else {
        nextPortal = "VISITOR";
        nextAuth = "LOGIN";
      }
    } else if (
      nextConf ||
      nextOrgId ||
      firstSegment === "conference" ||
      firstSegment === "conferences" ||
      firstSegment === "events" ||
      firstSegment === "organizers" ||
      firstSegment === "organizer" ||
      firstSegment === "home" ||
      firstSegment === "about" ||
      firstSegment === "contact" ||
      firstSegment === "privacy" ||
      firstSegment === "terms" ||
      firstSegment === "media-partner" ||
      firstSegment === "associates" ||
      firstSegment === "login" ||
      firstSegment === "signup" ||
      (segments.length > 0 && firstSegment !== "admin-portal" && firstSegment !== "organizer-portal")
    ) {
      nextPortal = "VISITOR";
    } else if (authUser?.role === "ADMIN" && savedPortal === "ADMIN") {
      nextPortal = "ADMIN";
      nextAuth = "NONE";
    } else if (authUser?.role === "ORGANIZER" && savedPortal === "ORGANIZER") {
      nextPortal = "ORGANIZER";
      nextAuth = "NONE";
    } else {
      nextPortal = "VISITOR";
    }

    setPublicTab(nextTab);
    setAuthMode(nextAuth);
    setSelectedCategory(nextCategory);
    setSelectedCountry(nextCountry);
    setSelectedCity(nextCity);
    setSelectedConference(nextConf);
    setSelectedOrganizerId(nextOrgId);
    setActivePortal(nextPortal);
  };

  // URL state synchronization effect
  useEffect(() => {
    if (!hasParsedInitialUrl.current && initialDataLoaded) {
      parseURLAndApplyState(conferences, organizers, initialPathRef.current);
      hasParsedInitialUrl.current = true;
      setInitialRouteResolved(true);
    }
    
    const handlePopState = () => {
      parseURLAndApplyState();
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [conferences, organizers, initialDataLoaded]);

  // Synchronize React state changes back to clean SEO-friendly URL path without page reloading
  useEffect(() => {
    if (!hasParsedInitialUrl.current) {
      return;
    }

    let newPath = "/";

    if (activePortal === "ORGANIZER") {
      newPath = "/organizer-portal";
    } else if (activePortal === "ADMIN") {
      newPath = "/admin-portal";
    } else if (selectedOrganizerId) {
      const org = organizers.find((o) => o.id === selectedOrganizerId);
      const orgSlug = org
        ? org.slug || generateUniqueOrganizerSlug(org.organizationName, organizers, org.id)
        : selectedOrganizerId;
      newPath = `/organizers/${orgSlug}`;
    } else if (selectedConference) {
      const confSlug = getConferenceSlug(selectedConference, conferences);
      newPath = `/conference/${confSlug}`;
    } else if (authMode === "LOGIN") {
      newPath = "/login";
    } else if (authMode === "SIGNUP") {
      newPath = "/signup";
    } else if (publicTab === "HOME") {
      newPath = "/";
    } else if (publicTab === "ORGANIZERS") {
      newPath = "/organizers";
    } else if (publicTab === "ABOUT") {
      newPath = "/about-us";
    } else if (publicTab === "MEDIAPARTNER") {
      newPath = "/media-partner";
    } else if (publicTab === "ASSOCIATES") {
      newPath = "/associates";
    } else if (publicTab === "CONTACT") {
      newPath = "/contact-us";
    } else if (publicTab === "PRIVACY") {
      newPath = "/privacy-policy";
    } else if (publicTab === "TERMS") {
      newPath = "/terms-of-service";
    } else if (publicTab === "FEEDBACK" || publicTab === "TESTIMONIALS") {
      newPath = "/testimonials";
    } else if (publicTab === "EVENTS") {
      const hasCat = selectedCategory && selectedCategory !== "All";
      const hasCountry = selectedCountry && selectedCountry !== "All";
      const hasCity = selectedCity && selectedCity !== "All";

      if (hasCountry && hasCity && hasCat) {
        newPath = `/${slugify(selectedCountry)}/${slugify(selectedCity)}/${slugify(selectedCategory)}`;
      } else if (hasCountry && hasCity) {
        newPath = `/${slugify(selectedCountry)}/${slugify(selectedCity)}`;
      } else if (hasCountry && hasCat) {
        newPath = `/${slugify(selectedCountry)}/${slugify(selectedCategory)}`;
      } else if (hasCat && hasCity) {
        newPath = `/${slugify(selectedCategory)}/${slugify(selectedCity)}`;
      } else if (hasCountry) {
        newPath = `/${slugify(selectedCountry)}`;
      } else if (hasCity) {
        newPath = `/${slugify(selectedCity)}`;
      } else if (hasCat) {
        newPath = `/${slugify(selectedCategory)}`;
      } else {
        newPath = "/conferences";
      }
    }

    const currentCleanPath = decodeURIComponent(window.location.pathname);
    if (currentCleanPath !== newPath || window.location.search) {
      window.history.pushState(
        { 
          tab: publicTab, 
          auth: authMode, 
          category: selectedCategory,
          country: selectedCountry, 
          city: selectedCity, 
          confId: selectedConference?.id, 
          orgId: selectedOrganizerId 
        }, 
        "", 
        newPath
      );
    }
  }, [publicTab, authMode, selectedCategory, selectedCountry, selectedCity, selectedConference, selectedOrganizerId, activePortal, organizers]);

  // Dynamically update document title, meta description, and meta keywords for SEO
  useEffect(() => {
    const currentYear = new Date().getFullYear();

    let title = "International Conference";
    let description =
      "Discover, verify, and attend legitimate peer-reviewed academic conferences, research symposiums, and professional summits worldwide.";

    let keywords =
      "international conferences, upcoming international conferences, global conferences, academic conferences, research conferences";

    if (selectedOrganizerId) {
      const org = organizers.find((o) => o.id === selectedOrganizerId);
      if (org) {
        title = `${org.organizationName} | International Conference`;
        description = org.aboutOrganization
          ? org.aboutOrganization.slice(0, 160)
          : `Verified organizer profile for ${org.organizationName} on International Conference.`;
      }
    } else if (selectedConference) {
      title = `${selectedConference.title} | International Conference`;
      description = selectedConference.description
        ? selectedConference.description.slice(0, 160)
        : `Details, call for papers, venue information, and registration for ${selectedConference.title}.`;
    } else if (activePortal === "ORGANIZER") {
      title = "Organizer Portal | International Conference";
      description = "Organizer management dashboard for submitting, tracking, and managing academic conferences.";
    } else if (activePortal === "ADMIN") {
      title = "Admin Portal | International Conference";
      description = "System administration portal for approving and auditing conference submissions.";
    } else if (authMode === "LOGIN") {
      title = "Login | International Conference";
      description = "Sign in to your International Conference organizer account.";
    } else if (authMode === "SIGNUP") {
      title = "Sign Up | International Conference";
      description = "Create an account to submit and manage your international conferences.";
    } else {
      switch (publicTab) {

        case "HOME":
        title = `International Conferences ${currentYear} | Upcoming Global International Conferences and Events`;

        description =
          "Find the latest international conferences covering diverse subjects and industries worldwide. Join global professionals and experts to exchange insights, discover emerging trends, build connections, and participate in valuable academic and professional conferences.";

        keywords = `upcoming international conferences ${currentYear}, international conferences worldwide ${currentYear}, international conferences by country, international conferences by city, international conferences by topic, best international conferences, academic international conferences, international conferences for researchers, international conferences for students, international conferences for professionals, international conferences and seminars, international conferences and events, global international conferences and events, upcoming academic international conferences worldwide, international research conferences worldwide`;

        break;
        case "ORGANIZERS":
          title = "Trusted Organizers | International Conference";
          description = "Browse verified academic institutions, scientific societies, professional organizations, universities, and research boards hosting conferences worldwide.";
          break;
        case "EVENTS": {
          const hasCat = selectedCategory && selectedCategory !== "All";
          const hasCountry = selectedCountry && selectedCountry !== "All";
          const hasCity = selectedCity && selectedCity !== "All";

          if (hasCat && hasCity && hasCountry) {
            title = `${selectedCategory} Conferences in ${selectedCity}, ${selectedCountry} | International Conference`;
            description = `Browse upcoming ${selectedCategory} academic and research conferences in ${selectedCity}, ${selectedCountry}.`;
          } else if (hasCat && hasCity) {
            title = `${selectedCategory} Conferences in ${selectedCity} | International Conference`;
            description = `Browse upcoming ${selectedCategory} academic and research conferences in ${selectedCity}.`;
          } else if (hasCat && hasCountry) {
            title = `${selectedCategory} Conferences in ${selectedCountry} | International Conference`;
            description = `Browse upcoming ${selectedCategory} academic and research conferences in ${selectedCountry}.`;
          } else if (hasCountry && hasCity) {
            title = `Conferences in ${selectedCity}, ${selectedCountry} | International Conference`;
            description = `Browse upcoming academic and professional conferences taking place in ${selectedCity}, ${selectedCountry}.`;
          } else if (hasCat) {
            title = `Upcoming ${selectedCategory} International Conferences | Upcoming Conferences and Events`;

            description =
              `Browse upcoming international conferences on ${selectedCategory}, discover global opportunities, and find events that match your academic, research, or professional interests.`;

            keywords =
              `upcoming international conferences on ${selectedCategory}, list of ${selectedCategory} international conferences, ${selectedCategory} international conferences, upcoming international conferences on ${selectedCategory}, international conference on ${selectedCategory}, conferences in ${selectedCategory}, ${selectedCategory} international conferences`;
          } else if (hasCity) {
            title = `International Conferences ${selectedCity} ${currentYear} | Global International Conferences and Events`;

            description =
              `Find international conferences in ${selectedCity} across various fields, including technology, medicine, business, education, science, and research. Explore upcoming events and expand your professional network.`;

            keywords =
              `upcoming international conferences in ${selectedCity} ${currentYear}, best international conferences in ${selectedCity}, international conferences in ${selectedCity} ${currentYear}, upcoming academic conferences in ${selectedCity}, international research conferences in ${selectedCity} ${currentYear}, free international conferences in ${selectedCity}, international conferences for students in ${selectedCity}, international conferences for researchers in ${selectedCity}, international conferences for professionals in ${selectedCity}, upcoming academic and international conferences in ${selectedCity}`;
          } else if (hasCountry) {
            title = `International Conferences in ${selectedCountry} ${currentYear} | Find Conferences and Events`;

            description =
              `Browse international conferences in ${selectedCountry} and find Upcoming International Conferences and Events across diverse subjects, including science, technology, medicine, business, education, and research. Connect, learn, share ideas, and build global professional relationships.`;

            keywords =
              `upcoming international conferences in ${selectedCountry} ${currentYear}, best international conferences in ${selectedCountry}, international conferences in ${selectedCountry} ${currentYear}, academic international conferences in ${selectedCountry}, international research conferences in ${selectedCountry} ${currentYear}, upcoming academic conferences in ${selectedCountry}, international conferences by city in ${selectedCountry}, international conferences by topic in ${selectedCountry}, free international conferences in ${selectedCountry}, international conferences for students in ${selectedCountry}, international conferences for researchers in ${selectedCountry}, international conferences for professionals in ${selectedCountry}`;

          } else {
            title = "Conferences | International Conference";
            description = "Browse all audited academic conferences, research symposiums, and professional summits.";
          }
          break;
        }
        case "ABOUT":
          title = "About International Conferences | Global Academic & Professional Events";

          description =
            "Learn about international conferences, global events, and networking opportunities that connect professionals, researchers, academics, and organizations from around the world.";

          keywords =
            "about international conference, about international conferences, international conference, international conferences, global conferences, international conference platform, international conference events, upcoming international conferences, global events, worldwide conferences, academic conferences, scientific conferences, professional conferences, international events, conference networking, global networking opportunities, international conference information, conference events worldwide, international academic events, international research conferences, global professional events, conference opportunities, international event platform, global conference events";

          break;
        case "MEDIAPARTNER":
          title = "Media Partners of International Conferences | Global Events";

          description =
            "Find media partners for international conferences and showcase your events to a wider audience through conference promotion, media coverage, and global networking opportunities.";

          keywords =
            "media partners of international conferences, international conference media partners, media partners for conferences, international conference media partnership, global conference media partners, conference media partners, media partnership for international conferences, international conference promotion, global conference promotion, conference event promotion, conference media coverage, international event media partners, global event media partners, academic conference media partners";

          break;
        case "ASSOCIATES":
        title = "Associates of International Conferences | Conference Partners";

        description =
          "Explore conference partners and associates of international conferences dedicated to supporting global events, industry connections, academic networking, and professional development.";

        keywords =
          "international conference associates, conference associates, international conference partners, conference partners, global conference associates, international event associates, conference association partners, academic conference associates, scientific conference associates, business conference associates, medical conference associates, professional conference associates, international event partners, global event partners, conference networking partners, conference collaboration partners, international conference collaboration, worldwide conference associates, conference support partners, international conference organizations, global conference network, conference industry partners, international event collaboration";

        break;
        case "CONTACT":
          title = "Contact Us | International Conference";
          description = "Get in touch with the International Conference team for support, partnerships, or conference listings.";
          break;
        case "PRIVACY":
          title = "Privacy Policy | International Conference";
          description = "Privacy policy and data protection practices at International Conference.";
          break;
        case "TERMS":
          title = "Terms of Service | International Conference";
          description = "Terms of service and listing guidelines for International Conference.";
          break;
        case "FEEDBACK":
        case "TESTIMONIALS":
          title = "Testimonials & Customer Feedback | International Conference";
          description = "Read reviews, testimonials, and verified feedback from researchers, academics, and conference directors worldwide.";
          break;
        default:
          title = "International Conference";
          description = "Discover, verify, and attend legitimate peer-reviewed academic conferences, research symposiums, and professional summits worldwide.";
      }
    }

    // Set document title
    document.title = title;

    // Set meta description tag
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    
    // Set meta keywords tag
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", keywords);
  }, [
    selectedCategory,
    selectedCountry,
    selectedCity,
    publicTab,
    selectedConference,
    selectedOrganizerId,
    activePortal,
    authMode,
    organizers,
  ]);

  const handleShareClick = () => {
    if (!selectedConference) return;
    const confSlug = getConferenceSlug(selectedConference, conferences);
    const shareUrl = `${window.location.origin}/conference/${confSlug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy URL:", err);
    });
  };



  useEffect(() => {
    if (authUser) {
      sessionStorage.setItem("gch_auth_user", JSON.stringify(authUser));
    } else {
      sessionStorage.removeItem("gch_auth_user");
    }
  }, [authUser]);

  // Process conferences with live status
  const processedConferences = useMemo(() => {
    const now = Date.now();
    return conferences.map((c) => {
      const start = getConferenceStartTimestamp(c);
      const end = getConferenceEndTimestamp(c);
      let liveStatus = LiveStatus.Upcoming;
      if (start !== null && now < start) {
        liveStatus = LiveStatus.Upcoming;
      } else if (end === null || now <= end) {
        liveStatus = LiveStatus.Ongoing;
      } else {
        liveStatus = LiveStatus.Completed;
      }
      return { ...c, liveStatus };
    });
  }, [conferences]);

  const organizerConferences = useMemo(() => {
    if (authUser?.role !== "ORGANIZER" || !authUser.organizerId) return [];
    const organizerId = authUser.organizerId;
    const email = authUser.email.toLowerCase().trim();
    return processedConferences.filter((conference) =>
      conference.organizerId === organizerId ||
      conference.contactEmail?.toLowerCase().trim() === email
    );
  }, [processedConferences, authUser]);

  const currentOrganizerProfiles = useMemo(() => {
    if (authUser?.role !== "ORGANIZER" || !authUser.organizerId) return organizers;
    return organizers.filter((organizer) => organizer.id === authUser.organizerId);
  }, [organizers, authUser]);

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setForgotSuccess("");

    if (authMode === "SIGNUP") {
      if (!authEmail || !authPassword || !authName || !authResetPin) {
        setAuthError("Please fill in all fields including your Reset PIN");
        return;
      }
      if (!/^\d{6}$/.test(authResetPin.trim())) {
        setAuthError("Recovery PIN must contain exactly 6 digits");
        return;
      }
      if (authPassword.length < 6) {
        setAuthError("Password must be at least 6 characters long");
        return;
      }
      try {
        const signupResponse = await fetch("/api/organizer/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
            name: authName.trim(),
            resetPin: authResetPin.trim(),
          }),
        });
        const signupData = await signupResponse.json().catch(() => ({}));
        if (!signupResponse.ok || !signupData.success) {
          setAuthError(signupData.error || "Unable to create organizer account");
          return;
        }

        const authData = await signInWithSupabase(authEmail.trim().toLowerCase(), authPassword);
        const sbUser = authData.user;
        if (!sbUser) {
          setAuthError("Account created, but automatic sign in failed. Please sign in again.");
          setAuthMode("LOGIN");
          return;
        }

        const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
        if (freshOrgs && Array.isArray(freshOrgs)) setOrganizers(ensureOrganizerSlugs(freshOrgs));
        const organizer = freshOrgs?.find((o) => o.authUserId === sbUser.id || o.id === sbUser.id || o.email?.toLowerCase().trim() === sbUser.email?.toLowerCase().trim());
        const newAuthUser: AuthUser = {
          id: sbUser.id,
          email: sbUser.email || authEmail.trim().toLowerCase(),
          role: "ORGANIZER",
          name: organizer?.contactPerson || authName.trim() || "Organizer",
          organizerId: organizer?.id || sbUser.id,
        };
        setAuthUser(newAuthUser);
        setActivePortal("ORGANIZER");
        setAuthMode("NONE");
        resetAuthForm();
        if (window.location.pathname !== "/organizer-portal") {
          window.history.pushState({ auth: "NONE", portal: "ORGANIZER" }, "", "/organizer-portal");
        }
        addNotification(
          "Welcome to International Conference! 🎉",
          "Please complete your organizer profile to start submitting conferences.",
          "info",
          sbUser.id
        );
        return;
      } catch (err: any) {
        setAuthError(err?.message || "Organizer signup failed. Please try again.");
        return;
      }
    }

    if (authMode === "FORGOT_PASSWORD") {
      if (forgotStep === 1) {
        if (!authEmail || !authResetPin) {
          setAuthError("Please enter your registered email address and Reset PIN");
          return;
        }
        if (!/^\d{6}$/.test(authResetPin.trim())) {
          setAuthError("Recovery PIN must contain exactly 6 digits");
          return;
        }
        try {
          const response = await fetch("/api/organizer/verify-reset-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: authEmail.trim().toLowerCase(), resetPin: authResetPin.trim() }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success || !data.resetToken) {
            setAuthError(data.error || "Invalid email or Reset PIN.");
            return;
          }
          // This state now stores a short-lived signed reset token, not an organizer id.
          setVerifiedResetOrganizerId(data.resetToken);
          setForgotStep(2);
          setAuthError("");
        } catch (err: any) {
          setAuthError(err?.message || "Password recovery is temporarily unavailable.");
        }
        return;
      }

      if (!newPassword || !confirmNewPassword) {
        setAuthError("Please fill in both password fields");
        return;
      }
      if (newPassword.length < 6) {
        setAuthError("New password must be at least 6 characters long");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setAuthError("Passwords do not match. Please try again.");
        return;
      }
      if (!verifiedResetOrganizerId) {
        setForgotStep(1);
        setAuthError("Your Reset PIN verification has expired. Please verify your Reset PIN again.");
        return;
      }
      try {
        const response = await fetch("/api/organizer/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToken: verifiedResetOrganizerId, newPassword }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          if (response.status === 401) {
            setVerifiedResetOrganizerId(null);
            setForgotStep(1);
          }
          setAuthError(data.error || "Failed to update password");
          return;
        }
        setForgotSuccess("Password reset successfully! Please sign in with your new password.");
        setAuthMode("LOGIN");
        setAuthPassword("");
        setAuthResetPin("");
        setNewPassword("");
        setConfirmNewPassword("");
        setVerifiedResetOrganizerId(null);
        setForgotStep(1);
      } catch (err: any) {
        setAuthError(err?.message || "Failed to update password");
      }
      return;
    }

    // Login: Admin is verified by the server; Organizer is verified by Supabase Auth.
    if (!authEmail || !authPassword) {
      setAuthError("Please enter your email and password");
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user && data.adminTabToken) {
        setAdminTabToken(data.adminTabToken);
        setAuthUser(data.user);
        setActivePortal("ADMIN");
        setAuthMode("NONE");
        resetAuthForm();
        // The page may have loaded as a visitor before login. Force an Admin
        // refresh now so pending/approved/manage lists are immediately complete.
        void syncAllDataFromSupabase("ADMIN");
        return;
      }
    } catch (err) {
      console.warn("Admin authentication endpoint unavailable", err);
    }

    try {
      const authData = await signInWithSupabase(authEmail.trim().toLowerCase(), authPassword);
      const sbUser = authData.user;
      if (!sbUser || sbUser.user_metadata?.role !== "ORGANIZER") {
        await signOutWithSupabase().catch(() => undefined);
        setAuthError("Invalid email or password");
        return;
      }
      const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
      if (freshOrgs && Array.isArray(freshOrgs)) setOrganizers(ensureOrganizerSlugs(freshOrgs));
      const organizer = freshOrgs?.find((o) => o.authUserId === sbUser.id || o.id === sbUser.id || o.email?.toLowerCase().trim() === sbUser.email?.toLowerCase().trim());
      if (!organizer) {
        await signOutWithSupabase().catch(() => undefined);
        setAuthError("Organizer profile was not found. Please contact support.");
        return;
      }
      if (organizer.isSuspended) {
        await signOutWithSupabase().catch(() => undefined);
        setAuthError("Your account has been suspended. Please contact support.");
        return;
      }
      setAuthUser({
        id: sbUser.id,
        email: sbUser.email || authEmail.trim().toLowerCase(),
        role: "ORGANIZER",
        name: organizer.contactPerson || organizer.organizationName || "Organizer",
        organizerId: organizer.id,
      });
      setActivePortal("ORGANIZER");
      setAuthMode("NONE");
      resetAuthForm();
    } catch {
      // Existing installations may still have Organizer accounts from the old
      // browser-hash login. Verify them once on the server, migrate the account
      // into Supabase Auth, then retry the normal sign-in.
      try {
        const migrateResponse = await fetch("/api/organizer/migrate-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail.trim().toLowerCase(), password: authPassword }),
        });
        const migrateData = await migrateResponse.json().catch(() => ({}));
        if (!migrateResponse.ok || !migrateData.success) {
          setAuthError("Invalid email or password");
          return;
        }
        const migratedAuth = await signInWithSupabase(authEmail.trim().toLowerCase(), authPassword);
        const sbUser = migratedAuth.user;
        if (!sbUser) throw new Error("No authenticated user");
        const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
        if (freshOrgs && Array.isArray(freshOrgs)) setOrganizers(ensureOrganizerSlugs(freshOrgs));
        const organizer = freshOrgs?.find((o) => o.authUserId === sbUser.id || o.id === sbUser.id || o.email?.toLowerCase().trim() === sbUser.email?.toLowerCase().trim());
        if (!organizer || organizer.isSuspended) {
          await signOutWithSupabase().catch(() => undefined);
          setAuthError(organizer?.isSuspended ? "Your account has been suspended. Please contact support." : "Organizer profile was not found. Please contact support.");
          return;
        }
        setAuthUser({
          id: sbUser.id,
          email: sbUser.email || authEmail.trim().toLowerCase(),
          role: "ORGANIZER",
          name: organizer.contactPerson || organizer.organizationName || "Organizer",
          organizerId: organizer.id,
        });
        setActivePortal("ORGANIZER");
        setAuthMode("NONE");
        resetAuthForm();
      } catch {
        setAuthError("Invalid email or password");
      }
    }
  };

  const handleLogout = async () => {
    const roleAtLogout = authUser?.role;
    if (roleAtLogout === "ADMIN") {
      // Admin has its own server session. Do not sign out Supabase here: that
      // would log an Organizer out in another tab of the same browser.
      try {
        await adminFetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
      } catch {}
      clearAdminTabToken();
    } else if (roleAtLogout === "ORGANIZER" && isSupabaseConfigured()) {
      // Organizer logout affects only the Supabase Organizer session; it does
      // not clear the independent Admin cookie.
      try {
        await signOutWithSupabase();
      } catch (err) {}
    }
    setAuthUser(null);
    setActivePortal("VISITOR");
    setAuthMode("NONE");
    resetAuthForm();
  };

  const resetAuthForm = () => {
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setAuthResetPin("");
    setForgotStep(1);
    setNewPassword("");
    setConfirmNewPassword("");
    setForgotSuccess("");
    setAuthError("");
  };

  // Helper functions
  const logAudit = (action: string, details: string, actor: string, role: string) => {
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      actor,
      role,
    };
    setAuditLogs((prev) => [log, ...prev]);
    if (role === "ORGANIZER") {
      const client = getSupabaseClient();
      client?.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        return fetch("/api/organizer/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ record: log }),
        });
      }).catch((e) => console.warn("Failed saving organizer audit log", e));
    } else {
      saveRecordToSupabase("audit_logs", log).catch((e) => console.warn("Failed saving audit log to Supabase", e));
    }
  };

  const addNotification = (
    title: string,
    message: string,
    type: "success" | "warning" | "info" | "error",
    orgId: string,
    relatedConferenceId?: string,
    notificationType?: string
  ) => {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizerId: orgId,
      title,
      message,
      type,
      notificationType: notificationType || type,
      relatedConferenceId: relatedConferenceId || null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      saveRecordToSupabase("notifications", notif).catch((e) => console.warn("Failed saving notification to Supabase", e));
      return updated;
    });
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === notifId ? { ...n, read: true } : n));
      const target = updated.find((n) => n.id === notifId);
      if (target) {
        saveRecordToSupabase("notifications", target).catch((e) => console.warn(e));
      }
      return updated;
    });
  };

  const handleMarkAllNotificationsRead = async (targetOrgId?: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => {
        if (!targetOrgId || n.organizerId === targetOrgId || (targetOrgId === "ADMIN" && n.organizerId === "ADMIN")) {
          return { ...n, read: true };
        }
        return n;
      });
      saveToSupabase("notifications", updated).catch((e) => console.warn(e));
      return updated;
    });
  };

  // Organizer functions
  const handleRegisterOrganizer = async (updatedOrg: Partial<OrganizerProfile>) => {
    if (!authUser) return;

    const targetOrgId = authUser.organizerId;
    const targetEmail = authUser.email?.toLowerCase().trim();

    let currentOrgs = organizers;
    try {
      const fresh = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
      if (fresh && Array.isArray(fresh)) currentOrgs = fresh;
    } catch (err) {}

    const matched = currentOrgs.find(
      (o) =>
        (targetOrgId && o.id === targetOrgId) ||
        (targetEmail && o.email?.toLowerCase().trim() === targetEmail)
    );

    const orgId = matched?.id || targetOrgId || `org-${Date.now()}`;
    const orgName = updatedOrg.organizationName || matched?.organizationName || authUser.name || "Organizer";
    const uniqueSlug = generateUniqueOrganizerSlug(orgName, currentOrgs, orgId);

    const finalOrg: OrganizerProfile = {
      id: orgId,
      email: authUser.email || matched?.email || "",
      organizationName: orgName,
      contactPerson: updatedOrg.contactPerson || matched?.contactPerson || authUser.name || "",
      logo: updatedOrg.logo || matched?.logo || "https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&w=120&h=120&q=80",
      coverImage: updatedOrg.coverImage || matched?.coverImage || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80",
      organizationWebsite: updatedOrg.organizationWebsite || matched?.organizationWebsite || "",
      aboutOrganization: updatedOrg.aboutOrganization || matched?.aboutOrganization || "",
      country: updatedOrg.country || matched?.country || "Japan",
      city: updatedOrg.city || matched?.city || "Tokyo",
      isVerified: matched?.isVerified ?? false,
      isSuspended: matched?.isSuspended ?? false,
      isFeatured: matched?.isFeatured ?? false,
      isProfileComplete: true,
      createdAt: matched?.createdAt || new Date().toISOString(),
      slug: uniqueSlug,
      ...updatedOrg,
    };

    // Save record to Supabase
    try {
      const saveRes = await saveRecordToSupabase("organizers", finalOrg);
      if (!saveRes.success) {
        console.warn("Notice saving organizer profile to Supabase:", saveRes.error);
      }
    } catch (saveErr) {
      console.warn("Exception saving organizer profile to Supabase:", saveErr);
    }

    if (!authUser.organizerId || authUser.organizerId !== finalOrg.id) {
      setAuthUser({ ...authUser, organizerId: finalOrg.id });
    }

    // Refresh actual database state
    const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
    if (freshOrgs && Array.isArray(freshOrgs) && freshOrgs.length > 0) {
      const merged = freshOrgs.map(o => o.id === finalOrg.id ? { ...o, ...finalOrg } : o);
      if (!merged.some(o => o.id === finalOrg.id)) merged.push(finalOrg);
      setOrganizers(ensureOrganizerSlugs(merged));
    } else {
      setOrganizers((prev) => ensureOrganizerSlugs([...prev.filter(o => o.id !== finalOrg.id), finalOrg]));
    }
    triggerBroadcastSync();

    if (finalOrg.organizationName) {
      addNotification(
        "Profile Submitted to Admin Portal! ⏳",
        "Your organizer profile setup is complete and has been sent to the Admin Portal for review and activation.",
        "info",
        finalOrg.id
      );
      addNotification(
        "New Organizer Registration 👤",
        `Organizer '${finalOrg.organizationName}' (${finalOrg.email}) submitted profile setup for activation.`,
        "info",
        "ADMIN",
        finalOrg.id,
        "ORGANIZER_REGISTRATION"
      );
      logAudit(
        "Organizer Profile Completed",
        `Organizer '${finalOrg.organizationName}' completed profile setup and sent to Admin Portal for activation.`,
        authUser.name || authUser.email,
        "ORGANIZER"
      );
    }
  };

  const handleSubmitConference = async (newConf: Partial<Conference>, isDraft: boolean = false) => {
    let freshOrgs = organizers;
    try {
      const fetched = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
      if (fetched && Array.isArray(fetched)) freshOrgs = fetched;
    } catch (err) {}

    let matchedOrg = freshOrgs.find(
      (o) =>
        (authUser?.organizerId && o.id === authUser.organizerId) ||
        (authUser?.email && o.email?.toLowerCase().trim() === authUser.email.toLowerCase().trim())
    );

    if (!matchedOrg) {
      const fallbackOrgId = authUser?.organizerId || newConf.organizerId || `org-${Date.now()}`;
      const fallbackOrgName = newConf.organizerName || authUser?.name || "Organizer";
      matchedOrg = {
        id: fallbackOrgId,
        organizationName: fallbackOrgName,
        email: authUser?.email || newConf.contactEmail || "",
        contactPerson: authUser?.name || "",
        logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&w=120&h=120&q=80",
        coverImage: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80",
        organizationWebsite: newConf.organizerWebsite || "",
        aboutOrganization: "",
        country: newConf.country || "Japan",
        city: newConf.city || "Tokyo",
        isVerified: false,
        isSuspended: false,
        isFeatured: false,
        isProfileComplete: true,
        createdAt: new Date().toISOString(),
        slug: generateUniqueOrganizerSlug(fallbackOrgName, freshOrgs, fallbackOrgId)
      };
      await saveRecordToSupabase("organizers", matchedOrg);
      const reloadedOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
      if (reloadedOrgs) setOrganizers(ensureOrganizerSlugs(reloadedOrgs));
    }

    if (authUser?.role === "ORGANIZER") {
      if (!matchedOrg?.organizationName) {
        addNotification(
          "Complete Your Profile First",
          "Please complete your organizer profile before submitting conferences.",
          "warning",
          authUser?.organizerId || matchedOrg?.id || ""
        );
        return { error: "Please complete your organizer profile first." };
      }
    }

    const orgId = matchedOrg?.id || authUser?.organizerId || newConf.organizerId || `org-${Date.now()}`;
    const orgName = matchedOrg?.organizationName || authUser?.name || "Organizer";
    const contactEmail = newConf.contactEmail || authUser?.email || matchedOrg?.email || "";

    const isEdit = Boolean(newConf.id && conferences.some((c) => c.id === newConf.id));
    const confId = isEdit ? newConf.id! : (newConf.id || `conf-${Date.now()}`);

    // Check the latest database state, not only this browser's cached list.
    // A title is reserved to its first organizer. That organizer may publish
    // additional editions with numbered URLs; other organizers must rename it.
    let duplicateSource = conferences;
    try {
      const latestConferences = await fetchFromSupabase<Conference[]>("conferences", true);
      if (Array.isArray(latestConferences)) duplicateSource = latestConferences;
    } catch {}

    const normalizeDuplicateField = (value: unknown) => String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const normalizedNewTitle = (newConf.title || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (normalizedNewTitle) {
      const titleOwnedByAnotherOrganizer = duplicateSource.find((conference) => {
        if (conference.id === confId) return false;
        if (normalizeDuplicateField(conference.title) !== normalizedNewTitle) return false;

        const existingOwner = normalizeDuplicateField(conference.organizerId || conference.organizerName);
        const submittingOwner = normalizeDuplicateField(orgId || orgName);
        return existingOwner !== submittingOwner;
      });

      if (titleOwnedByAnotherOrganizer) {
        return {
          error: `The conference title "${titleOwnedByAnotherOrganizer.title}" is already used by another organizer. Please change the title and submit again.`,
        };
      }
    }

    const existingConf = conferences.find((c) => c.id === confId);
    const titleForSlug = newConf.title || newConf.shortTitle || existingConf?.title || "conference";
    const uniqueSlug = generateUniqueConferenceSlug(titleForSlug, duplicateSource, confId, existingConf?.slug);

    let conferenceItem: Conference;

    if (isEdit && existingConf) {
      conferenceItem = {
        ...existingConf,
        ...newConf,
        organizerId: orgId,
        organizerName: orgName,
        contactEmail: contactEmail || existingConf.contactEmail,
        slug: uniqueSlug,
        status: isDraft
          ? ConferenceStatus.Draft
          : authUser?.role === "ADMIN"
          ? newConf.status || ConferenceStatus.Approved
          : ConferenceStatus.PendingReview,
        history: [
          ...(Array.isArray(existingConf.history) ? existingConf.history : []),
          {
            timestamp: new Date().toISOString(),
            action: isDraft ? "Updated Draft" : "Submitted Updates for Review",
            actor: authUser?.name || orgName,
          },
        ],
      };
    } else {
      conferenceItem = {
        ...(newConf as Conference),
        id: confId,
        slug: uniqueSlug,
        status: isDraft
          ? ConferenceStatus.Draft
          : authUser?.role === "ADMIN"
          ? newConf.status || ConferenceStatus.Approved
          : ConferenceStatus.PendingReview,
        liveStatus: LiveStatus.Upcoming,
        organizerId: orgId,
        organizerName: orgName,
        contactEmail: contactEmail,
        isVerified: false,
        isFeatured: false,
        views: 0,
        registrationClicks: 0,
        createdAt: new Date().toISOString(),
        history: [
          {
            timestamp: new Date().toISOString(),
            action: isDraft ? "Created Draft" : "Submitted for Review",
            actor: authUser?.name || orgName,
          },
        ],
      };
    }

    // Write to Supabase
    const saveRes = await saveRecordToSupabase("conferences", conferenceItem);
    if (!saveRes.success) {
      return { error: saveRes.error || "Failed to save conference to database." };
    }

    // Refresh database state
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    } else {
      setConferences((prev) =>
        isEdit ? prev.map((c) => (c.id === confId ? conferenceItem : c)) : [conferenceItem, ...prev]
      );
    }
    triggerBroadcastSync();

    logAudit(
      isEdit ? "Updated Conference" : isDraft ? "Saved Draft" : "Submitted Conference",
      `Saved entry '${conferenceItem.title}'`,
      authUser?.name || orgName,
      authUser?.role || "ORGANIZER"
    );

    if (!isDraft && (orgId || authUser?.organizerId)) {
      addNotification(
        "Submission Received 📬",
        `Your conference '${conferenceItem.title}' has been submitted for review.`,
        "info",
        orgId || authUser?.organizerId || ""
      );
      addNotification(
        "New Conference Submitted 📝",
        `Conference '${conferenceItem.title}' was submitted for review by ${orgName}.`,
        "info",
        "ADMIN",
        conferenceItem.id,
        "CONFERENCE_SUBMITTED"
      );
    }
    return {};
  };

  const handleResubmitConference = async (confId: string, updatedConf: Partial<Conference>) => {
    let freshOrgs = organizers;
    try {
      const fetched = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
      if (fetched && Array.isArray(fetched)) freshOrgs = fetched;
    } catch (err) {}

    let matchedOrg = freshOrgs.find(
      (o) =>
        (authUser?.organizerId && o.id === authUser.organizerId) ||
        (authUser?.email && o.email?.toLowerCase().trim() === authUser.email.toLowerCase().trim())
    );

    const orgId = matchedOrg?.id || authUser?.organizerId;
    const orgName = matchedOrg?.organizationName || "Organizer";
    const contactEmail = updatedConf.contactEmail || authUser?.email || matchedOrg?.email || "";

    const existingConf = conferences.find((c) => c.id === confId);
    const titleForSlug = updatedConf.title || existingConf?.title || "conference";
    const uniqueSlug = generateUniqueConferenceSlug(titleForSlug, conferences, confId, existingConf?.slug);

    if (!existingConf) return { error: "Conference not found." };

    const conferenceItem: Conference = {
      ...existingConf,
      ...updatedConf,
      organizerId: orgId || existingConf.organizerId,
      organizerName: orgName || existingConf.organizerName,
      contactEmail: contactEmail || existingConf.contactEmail,
      slug: uniqueSlug,
      status: ConferenceStatus.PendingReview,
      rejectionReason: undefined,
      history: [
        ...(Array.isArray(existingConf.history) ? existingConf.history : []),
        { 
          timestamp: new Date().toISOString(), 
          action: "Resubmitted for Admin Review", 
          actor: orgName 
        },
      ],
    };

    const saveRes = await saveRecordToSupabase("conferences", conferenceItem);
    if (!saveRes.success) {
      return { error: saveRes.error || "Failed to resubmit conference to database." };
    }

    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    logAudit("Resubmitted Conference", `Resubmitted conference '${titleForSlug}'`, orgName, authUser?.role || "ORGANIZER");

    if (orgId) {
      addNotification(
        "Resubmission Received 📬",
        `Your conference '${titleForSlug}' has been resubmitted for admin review.`,
        "info",
        orgId
      );
    }
    addNotification(
      "Conference Edited 📝",
      `Conference '${titleForSlug}' was updated and resubmitted for review by ${orgName}.`,
      "info",
      "ADMIN",
      confId,
      "CONFERENCE_RESUBMITTED"
    );
    return {};
  };

  const handleToggleConferenceActive = async (confId: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (!conf) return { success: false, isActive: false, error: "Conference not found." };

    const nextDeactivated = !conf.isDeactivated;
    const updatedConf = { ...conf, isDeactivated: nextDeactivated };

    // Update the button/status immediately, then persist and roll back on failure.
    setConferences((current) => current.map((item) => item.id === confId ? updatedConf : item));
    const saved = await saveRecordToSupabase("conferences", updatedConf);
    if (!saved.success) {
      setConferences((current) => current.map((item) => item.id === confId ? conf : item));
      return { success: false, isActive: !conf.isDeactivated, error: saved.error || "Database update failed." };
    }
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    logAudit(
      conf.isDeactivated ? "Activated Conference" : "Deactivated Conference",
      `Toggled active status for '${conf.title}'`,
      authUser?.name || (authUser?.role === "ADMIN" ? "Super Admin" : "Organizer"),
      authUser?.role || "ORGANIZER"
    );
    return { success: true, isActive: !nextDeactivated };
  };

  const handleDeleteConference = async (confId: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (conf && conf.bannerImage) {
      const storageInfo = extractStoragePathFromUrl(conf.bannerImage);
      if (storageInfo) {
        try {
          const client = getSupabaseClient();
          if (client) {
            await client.storage.from(storageInfo.bucket).remove([storageInfo.path]);
          }
        } catch (err) {
          console.error("Storage image removal error:", err);
        }
      }
    }
    await deleteRecordFromSupabase("conferences", confId);
    await deleteFromSupabase("conferences", confId);

    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    } else {
      setConferences((prev) => prev.filter((c) => c.id !== confId));
    }
    triggerBroadcastSync();

    if (conf) {
      if (conf.organizerId && authUser?.role === "ADMIN") {
        addNotification(
          "Conference Deleted 🗑️",
          `Your conference '${conf.title}' was deleted by Admin.`,
          "warning",
          conf.organizerId
        );
      }
      logAudit(
        "Deleted Conference",
        `Permanently removed conference '${conf.title}'`,
        authUser?.name || (authUser?.role === "ADMIN" ? "Super Admin" : "Organizer"),
        authUser?.role || "ORGANIZER"
      );
    }
  };

  const handleDeleteDraft = async (confId: string) => {
    await deleteRecordFromSupabase("conferences", confId);
    await deleteFromSupabase("conferences", confId);
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    } else {
      setConferences((prev) => prev.filter((c) => c.id !== confId));
    }
    triggerBroadcastSync();
    logAudit("Deleted Draft", `Removed draft conference ID ${confId}`, "Organizer", "ORGANIZER");
  };

  // Admin functions
  const handleApproveConference = async (confId: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (!conf) return;

    // Only already-published conferences reserve public URL slugs. Pending,
    // rejected and draft duplicates must never force a lone public event to -1.
    const publicSlugSource = conferences.filter(
      (item) => item.id !== confId && item.status === ConferenceStatus.Approved
    );
    const publicSlug = generateUniqueConferenceSlug(conf.title || conf.shortTitle || "conference", publicSlugSource, confId);

    const approvedConf: Conference = {
      ...conf,
      slug: publicSlug,
      status: ConferenceStatus.Approved,
      isDeactivated: false,
      history: [
        ...(Array.isArray(conf.history) ? conf.history : []),
        { 
          timestamp: new Date().toISOString(), 
          action: "Approved by Admin", 
          actor: "Super Admin" 
        }
      ],
    };

    const saveResult = await saveRecordToSupabase("conferences", approvedConf);
    if (!saveResult.success) {
      console.error("Failed to approve conference:", saveResult.error);
      return;
    }
    // Update immediately so Admin/Organizer views do not depend on a second read.
    setConferences((prev) => ensureConferenceSlugs(prev.map((item) => item.id === confId ? approvedConf : item)));
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    addNotification(
      "Conference Approved! 🎉",
      `Your conference '${conf.title}' has been published.`,
      "success",
      conf.organizerId
    );
    logAudit("Approved Submission", `Approved and published conference '${conf.title}'`, "Super Admin", "ADMIN");
  };

  const handleRejectConference = async (confId: string, reason: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (!conf) return;

    const rejectedConf: Conference = {
      ...conf,
      status: ConferenceStatus.Rejected,
      rejectionReason: reason,
      history: [
        ...(Array.isArray(conf.history) ? conf.history : []),
        { 
          timestamp: new Date().toISOString(), 
          action: `Rejected: ${reason}`, 
          actor: "Super Admin" 
        }
      ],
    };

    const saveResult = await saveRecordToSupabase("conferences", rejectedConf);
    if (!saveResult.success) {
      console.error("Failed to reject conference:", saveResult.error);
      return;
    }
    setConferences((prev) => ensureConferenceSlugs(prev.map((item) => item.id === confId ? rejectedConf : item)));
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    addNotification(
      "Conference Rejected",
      `Your conference '${conf.title}' was rejected by the administrator.`,
      "error",
      conf.organizerId
    );
    logAudit("Rejected Submission", `Rejected conference '${conf.title}'. Reason: ${reason}`, "Super Admin", "ADMIN");
  };

  const handleToggleFeatureConference = async (confId: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (!conf) return;

    const toggledConf = { ...conf, isFeatured: !conf.isFeatured };
    await saveRecordToSupabase("conferences", toggledConf);
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    logAudit("Toggled Featured Conference", `Changed featured flag for '${conf.title}'`, "Super Admin", "ADMIN");
  };

  const handleToggleVerifyConference = async (confId: string) => {
    const conf = conferences.find((c) => c.id === confId);
    if (!conf) return;

    const toggledConf = { ...conf, isVerified: !conf.isVerified };
    await saveRecordToSupabase("conferences", toggledConf);
    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs && Array.isArray(freshConfs)) {
      setConferences(ensureConferenceSlugs(freshConfs));
    }
    triggerBroadcastSync();

    logAudit("Toggled Verified Conference", `Changed verification badge for '${conf.title}'`, "Super Admin", "ADMIN");
  };

  const handleVerifyOrganizer = async (orgId: string) => {
    const org = organizers.find((o) => o.id === orgId);
    if (!org) return;

    const nextState = !org.isVerified;
    const toggledOrg = { ...org, isVerified: nextState };

    await saveRecordToSupabase("organizers", toggledOrg);
    const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
    if (freshOrgs && Array.isArray(freshOrgs)) {
      setOrganizers(ensureOrganizerSlugs(freshOrgs));
    }
    triggerBroadcastSync();

    if (nextState) {
      addNotification("Account Verified ✅", "Your organization has been verified!", "success", orgId);
    }
    logAudit("Vetted Organizer", `Toggled verification badge for organizer ID ${orgId}`, "Super Admin", "ADMIN");
  };

  const handleToggleSuspendOrganizer = async (orgId: string) => {
    const org = organizers.find((o) => o.id === orgId);
    if (!org) return { success: false, isActive: false, error: "Organizer not found." };

    const nextSuspended = !org.isSuspended;
    const toggledOrg = { ...org, isSuspended: nextSuspended };

    setOrganizers((current) => current.map((item) => item.id === orgId ? toggledOrg : item));
    const saved = await saveRecordToSupabase("organizers", toggledOrg);
    if (!saved.success) {
      setOrganizers((current) => current.map((item) => item.id === orgId ? org : item));
      return { success: false, isActive: !org.isSuspended, error: saved.error || "Database update failed." };
    }
    const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
    if (freshOrgs && Array.isArray(freshOrgs)) {
      setOrganizers(ensureOrganizerSlugs(freshOrgs));
    }
    triggerBroadcastSync();

    if (nextSuspended) {
      addNotification(
        "Account Status Updated ⚠️",
        "Your organizer profile activation was changed to suspended.",
        "warning",
        orgId
      );
    } else {
      addNotification(
        "Account Approved & Activated 🎉",
        "Your organizer account has been approved and activated by Admin!",
        "success",
        orgId
      );
    }
    logAudit("Suspended Organizer", `Toggled suspension flag for organizer ID ${orgId}`, "Super Admin", "ADMIN");
    return { success: true, isActive: !nextSuspended };
  };

  const handleDeleteOrganizer = async (orgId: string) => {
    await deleteRecordFromSupabase("organizers", orgId);
    await deleteFromSupabase("organizers", orgId);

    const orgConfs = conferences.filter((c) => c.organizerId === orgId);
    for (const c of orgConfs) {
      await deleteRecordFromSupabase("conferences", c.id);
      await deleteFromSupabase("conferences", c.id);
    }

    const freshOrgs = await fetchFromSupabase<OrganizerProfile[]>("organizers", true);
    if (freshOrgs) setOrganizers(ensureOrganizerSlugs(freshOrgs));

    const freshConfs = await fetchFromSupabase<Conference[]>("conferences", true);
    if (freshConfs) setConferences(ensureConferenceSlugs(freshConfs));

    triggerBroadcastSync();
    logAudit("Deleted Organizer", `Fully purged organizer ID ${orgId} and their conferences`, "Super Admin", "ADMIN");
  };

const handleAddCategory = async (cat: Partial<Category>) => {
  if (!cat.name?.trim()) return;

  const nameTrimmed = toUpperCaseName(
    cat.name.trim()
  );

  const existing = categories.find(
    (c) =>
      c.name.trim().toUpperCase() ===
      nameTrimmed
  );

  const id =
    existing?.id ||
    cat.id ||
    `cat-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;

 const topic: Category = {
  id,
  name: nameTrimmed,
  description:
    cat.description ||
    existing?.description ||
    "",
  slug:
    existing?.slug ||
    cat.slug ||
    nameTrimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
};

  const result =
    await saveRecordToSupabase(
      "categories",
      topic
    );

  if (!result.success) {
    console.error(
      "Topic save failed:",
      result.error
    );
    return;
  }

  const freshCats =
    await fetchFromSupabase<Category[]>(
      "categories",
      true
    );

  if (
    freshCats &&
    Array.isArray(freshCats)
  ) {
    setCategories(
      deduplicateCategories(freshCats)
    );
  } else {
    setCategories((prev) => {
      const withoutSameName =
        prev.filter(
          (item) =>
            item.name
              .trim()
              .toUpperCase() !==
            nameTrimmed
        );

      return [
        ...withoutSameName,
        topic,
      ];
    });
  }

  triggerBroadcastSync();

  logAudit(
    existing
      ? "Updated Category"
      : "Added Category",
    existing
      ? `Replaced existing topic '${nameTrimmed}'`
      : `Created system topic '${nameTrimmed}'`,
    "Super Admin",
    "ADMIN"
  );
};
const handleAddBulkCategories = async (
  catsList: Partial<Category>[]
) => {
  if (!catsList || catsList.length === 0) return;

  try {
    const workingMap = new Map<
      string,
      Category
    >();

    // Existing topics first
    categories.forEach((cat) => {
      const normalized =
        String(cat.name || "")
          .trim()
          .toUpperCase();

      if (!normalized) return;

      workingMap.set(normalized, {
      id: cat.id,
      name: toUpperCaseName(cat.name),
      description: cat.description || "",
      slug:
        cat.slug ||
        normalized
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
    });
    });

    let addedCount = 0;
    let replacedCount = 0;

    catsList.forEach((cat) => {
      if (!cat.name?.trim()) return;

      const nameTrimmed =
        toUpperCaseName(cat.name.trim());

      const normalizedName =
        nameTrimmed.toUpperCase();

      const existing =
        workingMap.get(normalizedName);

      const id =
        existing?.id ||
        cat.id ||
        `cat-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 7)}`;

      const topic: Category = {
        id,
        name: nameTrimmed,
        description:
          cat.description ||
          existing?.description ||
          "",
        slug:
          existing?.slug ||
          cat.slug ||
          nameTrimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
      };

      if (existing) {
        replacedCount++;
      } else {
        addedCount++;
      }

      // Same name always replaces previous entry
      workingMap.set(
        normalizedName,
        topic
      );
    });

    const finalTopics =
      Array.from(
        workingMap.values()
      );

    if (finalTopics.length === 0) {
      return;
    }

    for (const topic of finalTopics) {
      const result =
        await saveRecordToSupabase(
          "categories",
          topic
        );

      if (!result.success) {
        console.error(
          `Topic save failed for "${topic.name}":`,
          result.error
        );
      }
    }

    const freshCats =
      await fetchFromSupabase<Category[]>(
        "categories",
        true
      );

    if (
      freshCats &&
      Array.isArray(freshCats)
    ) {
      setCategories(
        deduplicateCategories(freshCats)
      );
    } else {
      setCategories(
        deduplicateCategories(
          finalTopics
        )
      );
    }

    triggerBroadcastSync();

    logAudit(
      "Bulk Upserted Categories",
      `${addedCount} new topic(s), ${replacedCount} duplicate topic(s) replaced`,
      "Super Admin",
      "ADMIN"
    );
  } catch (error) {
    console.error(
      "Bulk topic upload failed:",
      error
    );
  }
};

const handleEditCategory = async (
  catId: string,
  updated: Partial<Category>
) => {
  try {
    const existing =
      categories.find(
        (c) => c.id === catId
      );

    if (!existing) {
      console.error(
        "Topic not found for update:",
        catId
      );
      return;
    }

    const nameTrimmed =
      updated.name?.trim()
        ? toUpperCaseName(
            updated.name.trim()
          )
        : existing.name;

    const merged: Category = {
      id: existing.id,
      name: nameTrimmed,
      slug:
        updated.slug ||
        existing.slug ||
        nameTrimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
          description: updated.description?.trim() || existing.description || "",
    };

    const result =
      await saveRecordToSupabase(
        "categories",
        merged
      );

    if (!result.success) {
      console.error(
        "Topic update failed:",
        result.error
      );
      return;
    }

    const freshCats =
      await fetchFromSupabase<Category[]>(
        "categories",
        true
      );

    if (
      freshCats &&
      Array.isArray(freshCats)
    ) {
      setCategories(
        deduplicateCategories(
          freshCats
        )
      );
    } else {
      setCategories((prev) =>
        prev.map((item) =>
          item.id === catId
            ? merged
            : item
        )
      );
    }

    triggerBroadcastSync();

    logAudit(
      "Updated Category",
      `Updated topic '${merged.name}'`,
      "Super Admin",
      "ADMIN"
    );
  } catch (error) {
    console.error(
      "Topic update failed:",
      error
    );
  }
};

    const handleDeleteCategory = async (catId: string) => {
    try {
      const result = await deleteRecordFromSupabase(
        "categories",
        catId
      );

      if (!result.success) {
        console.error(
          "Topic deletion failed:",
          result.error
        );
        return;
      }

      // Remove deleted topic from screen immediately
      setCategories((prev) =>
        prev.filter((c) => c.id !== catId)
      );

      // Get latest topics from database
      const freshCats =
        await fetchFromSupabase<Category[]>(
          "categories",
          true
        );

      if (freshCats && Array.isArray(freshCats)) {
        setCategories(
          deduplicateCategories(freshCats)
        );
      }

      triggerBroadcastSync();

      logAudit(
        "Deleted Category",
        `Permanently deleted topic ID ${catId}`,
        "Super Admin",
        "ADMIN"
      );
    } catch (error) {
      console.error(
        "Topic deletion failed:",
        error
      );
    }
  };

 const handleDeleteAllCategories = async () => {
  try {
    const ids = categories
      .map((category) => category.id)
      .filter(Boolean);

    if (ids.length === 0) {
      setCategories([]);
      return;
    }

    const results = await Promise.all(
      ids.map((id) =>
        deleteRecordFromSupabase(
          "categories",
          id
        )
      )
    );

    const failed = results.filter(
      (result) => !result.success
    );

    if (failed.length > 0) {
      console.error(
        "Some topics could not be deleted:",
        failed
      );
    }

    const freshCats =
      await fetchFromSupabase<Category[]>(
        "categories",
        true
      );

    if (freshCats && Array.isArray(freshCats)) {
      setCategories(
        deduplicateCategories(freshCats)
      );
    } else {
      setCategories([]);
    }

    triggerBroadcastSync();

    logAudit(
      "Deleted All Categories",
      `Permanently deleted ${ids.length - failed.length} topic(s)`,
      "Super Admin",
      "ADMIN"
    );
  } catch (error) {
    console.error(
      "Delete all topics failed:",
      error
    );
  }
};

  const handleRegisterClick = (_confId: string) => {
  // Profile visit / registration click tracking disabled.
};

  const handleSelectConference = (_conf: Conference) => {
  // View tracking removed.
    };

  const handleClearNotifications = () => {
    if (!authUser?.organizerId) return;
    setNotifications((prev) => prev.filter((n) => n.organizerId !== authUser.organizerId));
  };

  const similarConferences = useMemo(() => {
    if (!selectedConference) return [];
    return processedConferences.filter(
      (c) =>
        c.category === selectedConference.category &&
        c.id !== selectedConference.id &&
        c.status === ConferenceStatus.Approved &&
        !isConferenceCompleted(c)
    ).slice(0, 4);
  }, [processedConferences, selectedConference]);

  const activeOrganizerProfile = useMemo(() => {
    if (!authUser) return null;
    return organizers.find(
      (org) =>
        (authUser.organizerId && org.id === authUser.organizerId) ||
        (authUser.email && org.email?.toLowerCase().trim() === authUser.email.toLowerCase().trim())
    ) || null;
  }, [organizers, authUser]);

  // Check if organizer profile is complete
  const isOrganizerProfileComplete = useMemo(() => {
    if (!authUser?.organizerId && !authUser?.email) return false;
    const org = organizers.find(
      (o) =>
        (authUser.organizerId && o.id === authUser.organizerId) ||
        (authUser.email && o.email?.toLowerCase().trim() === authUser.email.toLowerCase().trim())
    );
    if (!org) return false;
    if (org.isProfileComplete === true) return true;
    return Boolean(
      org.organizationName &&
      org.organizationName.trim().length > 0
    );
  }, [organizers, authUser]);

  // Render Auth Modal
  const renderAuthModal = () => {
    if (authMode === "NONE") return null;

    const isLogin = authMode === "LOGIN";
    const isSignup = authMode === "SIGNUP";
    const isForgot = authMode === "FORGOT_PASSWORD";

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setAuthMode("NONE")}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setAuthMode("NONE")}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
              {isLogin && <LogIn className="h-8 w-8 text-white" />}
              {isSignup && <UserPlus className="h-8 w-8 text-white" />}
              {isForgot && <Key className="h-8 w-8 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-display">
              {isLogin && "Welcome Back"}
              {isSignup && "Create Account"}
              {isForgot && (forgotStep === 1 ? "Forgot Password" : "Create New Password")}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin && "Sign in to access your organizer dashboard"}
              {isSignup && "Register as an organizer to publish conferences"}
              {isForgot && (forgotStep === 1 ? "Enter your registered email and Reset PIN" : "Enter your new password below")}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignup && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Sarah Jenkins"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            )}

            {(isLogin || isSignup || (isForgot && forgotStep === 1)) && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder={isSignup ? "organizer@institution.edu" : "your@email.com"}
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            )}

            {(isLogin || isSignup) && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Password
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("FORGOT_PASSWORD");
                        setAuthError("");
                        setForgotSuccess("");
                        setForgotStep(1);
                        setAuthResetPin("");
                        setVerifiedResetOrganizerId(null);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            )}

            {isSignup && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" /> Reset PIN (Security Recovery Code)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  placeholder="Create a 6-digit PIN"
                  value={authResetPin}
                  onChange={(e) => setAuthResetPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400">
                  🔒 Save these six digits safely. They are required to recover a forgotten password, and the PIN itself is never stored.
                </p>
              </div>
            )}

            {isForgot && forgotStep === 1 && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                  <Key className="h-3.5 w-3.5" /> Reset PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  placeholder="Enter your 6-digit Recovery PIN"
                  value={authResetPin}
                  onChange={(e) => setAuthResetPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            )}

            {isForgot && forgotStep === 2 && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Create New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                </div>
              </>
            )}

            {isSignup && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                <p>📌 You're signing up as an <strong>Organizer</strong>. After registration, you'll complete your profile and start submitting conferences.</p>
              </div>
            )}

            {forgotSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl p-3 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {authError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-start gap-2">
                <span className="text-red-500 text-lg leading-none">⚠</span>
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#37494E] hover:bg-[#2b3a3e] text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLogin && <><LogIn className="h-4 w-4" /> Sign In</>}
              {isSignup && <><UserPlus className="h-4 w-4" /> Create Account</>}
              {isForgot && (forgotStep === 1 ? <><Key className="h-4 w-4" /> Verify PIN & Continue</> : <><Lock className="h-4 w-4" /> Set New Password</>)}
            </button>
          </form>

          <div className="mt-6 text-center">
            {isForgot ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("LOGIN");
                  setAuthError("");
                  setForgotSuccess("");
                  setVerifiedResetOrganizerId(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode(isLogin ? "SIGNUP" : "LOGIN");
                  setAuthError("");
                  setForgotSuccess("");
                  setVerifiedResetOrganizerId(null);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
              >
                {isLogin 
                  ? "Don't have an account? Sign Up" 
                  : "Already have an account? Sign In"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const handleNavClick = (tabId: string) => {
    setActivePortal("VISITOR");
    setSelectedConference(null);
    setSelectedOrganizerId(null);
    setSelectedCountry("All");
    setSelectedCity("All");
    setPublicTab(tabId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render Navbar
  const renderNavbar = () => {
    const navItems = [
      { label: "Home", tabId: "HOME" },
      { label: "Conferences", tabId: "EVENTS" },
      { label: "Media Partner", tabId: "MEDIAPARTNER" },
      { label: "Our Associates", tabId: "ASSOCIATES" },
      { label: "About Us", tabId: "ABOUT" },
      { label: "Contact Us", tabId: "CONTACT" },
    ];

    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100/85 shadow-sm px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
        {/* Left Side: Website Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => {
            if (authUser?.role === "ADMIN") {
              setActivePortal("ADMIN");
            } else if (authUser?.role === "ORGANIZER") {
              setActivePortal("ORGANIZER");
            } else {
              setActivePortal("VISITOR");
              setSelectedConference(null);
              setSelectedOrganizerId(null);
              setSelectedCountry("All");
              setSelectedCity("All");
              setPublicTab("HOME");
            }
            setIsMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="w-[130px] h-10 xs:w-[145px] sm:w-[175px] sm:h-12 md:w-[190px] md:h-14 flex items-center justify-start shrink-0 group-hover:scale-105 transition-transform">
            <img
              src="/company-logo.png"
              alt="International Conference Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Right Side: Navigation & Auth Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 min-w-0 shrink-0">
          {/* Desktop Nav Links - Hidden in Admin / Organizer Portal */}
          {authUser?.role !== "ADMIN" && authUser?.role !== "ORGANIZER" && activePortal !== "ADMIN" && activePortal !== "ORGANIZER" && (
            <nav className="hidden md:flex items-center gap-6 mr-2">
              {navItems.map((item) => {
                const isActive = activePortal === "VISITOR" && publicTab === item.tabId;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.tabId)}
                    className={`text-sm font-semibold transition-all relative py-1 cursor-pointer ${
                      isActive
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Desktop Auth Actions */}
          <div className="hidden md:flex items-center gap-2">
            {authUser ? (
              <>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {authUser.name?.charAt(0) || "U"}
                  </div>
                  <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">
                    {authUser.name || authUser.email}
                  </span>
                  <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    authUser.role === "ADMIN" 
                      ? "bg-purple-100 text-purple-700" 
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {authUser.role}
                  </span>
                </div>

                {authUser.role === "ADMIN" && (
                  <button
                    onClick={() => setActivePortal("ADMIN")}
                    className="px-3 py-1.5 text-xs font-bold bg-[#37494E] text-white hover:bg-[#2c3b3f] rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all flex items-center gap-1.5 border border-red-100 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthMode("LOGIN")}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" /> Login
                </button>
                <button
                  onClick={() => setAuthMode("SIGNUP")}
                  className="px-4 py-2 text-sm font-semibold bg-[#37494E] hover:bg-[#2b3a3e] text-white rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" /> Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden w-10 h-10 p-0 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700 cursor-pointer flex items-center justify-center shrink-0"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Overlay Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl px-3 sm:px-4 py-3 flex flex-col gap-2 md:hidden z-50 max-h-[calc(100dvh-64px)] overflow-y-auto overscroll-contain">
            {authUser?.role !== "ADMIN" && authUser?.role !== "ORGANIZER" && activePortal !== "ADMIN" && activePortal !== "ORGANIZER" && navItems.map((item) => {
              const isActive = activePortal === "VISITOR" && publicTab === item.tabId;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.tabId)}
                  className={`text-left w-full py-2.5 px-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "text-blue-600 bg-blue-50/50"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {authUser?.role !== "ADMIN" && authUser?.role !== "ORGANIZER" && activePortal !== "ADMIN" && activePortal !== "ORGANIZER" && <hr className="border-gray-100 my-1" />}

            {authUser ? (
              <div className="space-y-3 px-3">
                <div className="flex items-center gap-2 py-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {authUser.name?.charAt(0) || "U"}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-semibold text-gray-800 truncate">{authUser.name || authUser.email}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">{authUser.role}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-center py-2.5 px-3 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1.5 border border-red-100 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 px-1">
                <button
                  onClick={() => {
                    setAuthMode("LOGIN");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" /> Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode("SIGNUP");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    );
  };

  const renderConferenceDetailPage = () => {
    if (!selectedConference) return null;
    const org = organizers.find((o) => o.id === selectedConference.organizerId);
    const orgName = org ? org.organizationName : "Verified Organizer";

    return (
      <div className="space-y-8 bg-white border border-slate-150 hover:border-blue-200 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Back Button and Path */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <button
            onClick={() => {
              setSelectedConference(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </button>
          
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setSelectedConference(null);
                setSelectedOrganizerId(null);
                setPublicTab("HOME");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-blue-600 hover:underline transition-colors cursor-pointer font-medium"
            >
              Home
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={() => {
                setSelectedConference(null);
                setSelectedOrganizerId(null);
                setPublicTab("EVENTS");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-blue-600 hover:underline transition-colors cursor-pointer font-medium"
            >
              Conferences
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-bold truncate max-w-[200px] sm:max-w-[300px]">
              {selectedConference.shortTitle || selectedConference.title}
            </span>
          </div>
        </div>

        {/* Title Block */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-lg">
              {selectedConference.category}
            </span>
            {selectedConference.attendanceType && (
              <span className="text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200/80 px-3 py-1 rounded-lg">
                Mode: {selectedConference.attendanceType}
              </span>
            )}
            {selectedConference.isVerified && (
              <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300/80 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Verified Legitimate
              </span>
            )}
            <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-2xs ${
              selectedConference.liveStatus === LiveStatus.Ongoing
                ? "bg-emerald-500 text-white"
                : selectedConference.liveStatus === LiveStatus.Upcoming
                ? "bg-blue-600 text-white"
                : "bg-slate-600 text-white"
            }`}>
              {selectedConference.liveStatus}
            </span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-display leading-tight">
            {selectedConference.title}
          </h1>

          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-slate-700 text-sm font-semibold">
            <div className="flex items-center gap-2.5">
              <img
                src={getCleanImageSrc(org?.logo, "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80")}
                alt={orgName}
                className="h-8 w-8 rounded-full border border-slate-200 object-contain bg-white shrink-0 shadow-2xs"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80";
                }}
              />
              <span>Hosted by <button onClick={() => { setSelectedOrganizerId(selectedConference.organizerId); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-blue-600 hover:underline font-extrabold cursor-pointer">{orgName}</button></span>
            </div>
            {org && org.isVerified && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3 text-blue-600" /> Verified Organizer
              </span>
            )}
          </div>
        </div>

        {/* About Conference - Image with Wrapping Description */}
        <div className="bg-white border border-slate-200/90 p-5 md:p-6 rounded-2xl shadow-2xs">

          {/* Heading */}
          <h3 className="text-lg font-extrabold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            About the Conference
          </h3>

          {/* Image + Wrapping Description */}
          <div className="text-slate-600 text-sm md:text-[15px] leading-7 font-normal">

            {/* LEFT IMAGE */}
            <div className="w-full sm:w-[38%] lg:w-[30%] sm:float-left sm:mr-6 mb-4">
              <div className="w-full h-[220px] sm:h-[240px] lg:h-[260px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                <img
                  src={getCleanImageSrc(
                    selectedConference.bannerImage,
                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
                  )}
                  alt={selectedConference.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                  }}
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <p className="whitespace-pre-line">
              {selectedConference.description}
            </p>

            {/* Clear float */}
            <div className="clear-both"></div>

          </div>
        </div>


{/* Other Conference Details - 3 Equal Columns */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">

  {/* COLUMN 1 - DATE & SCHEDULE */}
  <div className="bg-blue-50/90 border border-blue-200/90 p-5 rounded-2xl shadow-2xs">
    <div className="text-blue-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-blue-200 pb-3 mb-4">
      <CalendarIcon className="h-4 w-4 text-blue-600 shrink-0" />
      Date & Schedule
    </div>

    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-blue-700 font-bold uppercase mb-1">
          Start Date
        </p>
        <p className="font-extrabold text-slate-900 text-sm">
          {formatConferenceDate(selectedConference.startDate)}
        </p>
      </div>

      <div>
        <p className="text-[11px] text-blue-700 font-bold uppercase mb-1">
          End Date
        </p>
        <p className="font-extrabold text-slate-900 text-sm">
          {formatConferenceDate(selectedConference.endDate)}
        </p>
      </div>

      {selectedConference.time && (
        <div>
          <p className="text-[11px] text-blue-700 font-bold uppercase mb-1">
            Time
          </p>
          <p className="font-semibold text-slate-800 text-sm">
            {selectedConference.time}
          </p>
        </div>
      )}

      {selectedConference.timeZone && (
        <div>
          <p className="text-[11px] text-blue-700 font-bold uppercase mb-1">
            Time Zone
          </p>
          <p className="font-semibold text-slate-800 text-sm">
            {selectedConference.timeZone}
          </p>
        </div>
      )}
    </div>
  </div>


  {/* COLUMN 2 - VENUE & LOCATION */}
  <div className="bg-emerald-50/90 border border-emerald-200/90 p-5 rounded-2xl shadow-2xs">
    <div className="text-emerald-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-3 mb-4">
      <MapPinIcon className="h-4 w-4 text-emerald-600 shrink-0" />
      Venue & Location
    </div>

    <div className="space-y-3">
      {selectedConference.venue && (
        <div>
          <p className="text-[11px] text-emerald-700 font-bold uppercase mb-1">
            Venue
          </p>
          <p className="font-extrabold text-slate-900 text-sm">
            {selectedConference.venue}
          </p>
        </div>
      )}

      {selectedConference.city && (
        <div>
          <p className="text-[11px] text-emerald-700 font-bold uppercase mb-1">
            City
          </p>
          <p className="font-semibold text-slate-800 text-sm">
            {selectedConference.city}
          </p>
        </div>
      )}

      {selectedConference.country && (
        <div>
          <p className="text-[11px] text-emerald-700 font-bold uppercase mb-1">
            Country
          </p>
          <p className="font-semibold text-slate-800 text-sm">
            {selectedConference.country}
          </p>
        </div>
      )}
    </div>
  </div>


  {/* COLUMN 3 - OTHER DETAILS */}
  <div className="bg-purple-50/90 border border-purple-200/90 p-5 rounded-2xl shadow-2xs">
    <div className="text-purple-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-purple-200 pb-3 mb-4">
      <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
      Other Details
    </div>

    <div className="space-y-4">

      {/* Category + Attendance */}
      <div>
        <p className="text-[11px] text-purple-700 font-bold uppercase mb-2">
          Topic & Attendance
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-extrabold bg-white text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg">
            {selectedConference.category}
          </span>

          {selectedConference.attendanceType && (
            <span className="text-xs font-extrabold bg-purple-600 text-white px-2.5 py-1 rounded-lg">
              {selectedConference.attendanceType}
            </span>
          )}
        </div>
      </div>

      {/* Contact */}
      {(selectedConference.contactEmail || org?.email) && (
        <div>
          <p className="text-[11px] text-purple-700 font-bold uppercase mb-1 flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            Official Contact
          </p>

          <a
            href={`mailto:${selectedConference.contactEmail || org?.email}`}
            className="font-semibold text-sm text-slate-800 hover:text-purple-700 hover:underline break-all"
          >
            {selectedConference.contactEmail || org?.email}
          </a>
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-2.5 pt-2">

        <button
          onClick={() => {
            setSelectedOrganizerId(selectedConference.organizerId);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border border-blue-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          Organizer Profile
          <Users className="h-4 w-4 shrink-0" />
        </button>

        <a
          href={selectedConference.conferenceWebsite || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all border border-slate-300 hover:border-blue-400 text-center block cursor-pointer"
        >
          Official Conference Website
        </a>

        <button
          onClick={handleShareClick}
          className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all border flex items-center justify-center gap-2 cursor-pointer ${
            copied
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-blue-400"
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Copied Link!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 text-slate-500 shrink-0" />
              Share Event
            </>
          )}
        </button>

      </div>
    </div>
  </div>
</div>

        {/* Similar Conferences - Full Width Container below details card */}
        {similarConferences.length > 0 && (
          <div className="space-y-4 bg-slate-50/80 border border-slate-200/80 p-6 rounded-2xl shadow-2xs mt-8">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 font-display text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" /> Similar Conferences
              </h4>
              <span className="text-xs text-slate-500 font-medium">{similarConferences.length} related events</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {similarConferences.slice(0, 4).map((sc, scIdx) => {
                const scSlug = getConferenceSlug(sc, conferences);
                const scUrl = `/conference/${scSlug}`;
                return (
                  <a
                    key={sc.id || `sc-${scIdx}`}
                    href={scUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white hover:bg-blue-50/50 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-2.5 text-left shadow-2xs hover:shadow-sm group h-full justify-between"
                  >
                    <div className="space-y-2 flex-1 flex flex-col">
                      <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                        {sc.title}
                      </span>

                      {sc.description && (
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {sc.description}
                        </p>
                      )}

                      <span className="text-[11px] text-slate-500 block font-medium pt-1 mt-auto">
                        📍 {sc.city}, {sc.country}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrganizerDetailPage = () => {
    if (!selectedOrganizerId) return null;
    const org = organizers.find((o) => o.id === selectedOrganizerId);
    if (!org) return null;

    if (org.isSuspended) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Organizer Account Inactive</h3>
          <p className="text-sm text-slate-500">
            This organizer profile is currently inactive or pending review by an administrator.
          </p>
          <button
            onClick={() => {
              setSelectedOrganizerId(null);
              setPublicTab("ORGANIZERS");
            }}
            className="px-5 py-2.5 bg-[#37494E] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Organizers Directory
          </button>
        </div>
      );
    }

    const publishedConferencesList = processedConferences.filter(
      (c) => c.organizerId === selectedOrganizerId && c.status === ConferenceStatus.Approved && !isConferenceCompleted(c)
    );

    const scrollOrgConferences = (direction: "left" | "right") => {
      if (orgConferencesScrollRef.current) {
        const scrollAmount = 380;
        orgConferencesScrollRef.current.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    };

    return (
      <div className="space-y-8 bg-white border border-slate-150 hover:border-blue-200 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Back Button and Path */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <button
            onClick={() => {
              setSelectedOrganizerId(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Back {selectedConference ? "to Conference" : "to Directory"}
          </button>
          
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setSelectedOrganizerId(null);
                setSelectedConference(null);
                setPublicTab("HOME");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-blue-600 hover:underline transition-colors cursor-pointer font-medium"
            >
              Home
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={() => {
                setSelectedOrganizerId(null);
                setSelectedConference(null);
                setPublicTab("HOME");
                setTimeout(() => {
                  const el = document.getElementById("organizers");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  } else {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }, 100);
              }}
              className="hover:text-blue-600 hover:underline transition-colors cursor-pointer font-medium"
            >
              Organizers
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-bold truncate max-w-[200px] sm:max-w-[300px]">
              {org.organizationName || "Details"}
            </span>
          </div>
        </div>

        {/* Cover image banner */}
        {(() => {
          const coverUrl = getCleanImageSrc(org.coverImage);
          const logoUrl = getCleanImageSrc(org.logo, "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80");
          return (
            <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden bg-slate-900 shadow-sm border border-slate-150">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="h-full w-full object-contain opacity-60" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-full w-full bg-slate-900 opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 flex flex-col sm:flex-row items-center sm:items-end gap-4">
                <img
                  src={logoUrl}
                  alt={org.organizationName}
                  className="h-24 w-24 rounded-2xl border-4 border-white object-contain bg-slate-50 shadow-md shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80";
                  }}
                />
                <div className="text-center sm:text-left text-white pb-1">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
                      {org.organizationName || "Organizer"}
                    </h1>
                    {org.isVerified && (
                      <span className="bg-blue-600 text-white p-1 rounded-full shrink-0 border border-blue-500 shadow-sm" title="Verified Organizer">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-xs mt-1.5 flex items-center justify-center sm:justify-start gap-1 font-medium">
                    <MapPinIcon className="h-3.5 w-3.5 text-slate-400" /> {org.city}, {org.country}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Main section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          <div className="lg:col-span-2 space-y-6">
            {/* Dedicated Card for About the Organization */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                <Building className="h-5 w-5 text-blue-600 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 font-display">About the Organization</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-line">
                {org.aboutOrganization || "No description provided."}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="font-bold text-slate-900 font-display text-base">Contact & Social Profiles</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wider">Contact Person</span>
                  <span className="text-sm text-slate-700 font-bold">{org.contactPerson || "N/A"}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <span className="block font-bold text-slate-400 uppercase text-[10px] tracking-wider">Email Address</span>
                  <span className="text-sm text-slate-700 font-bold">{org.email || "N/A"}</span>
                </div>
              </div>

              {/* Social Media Links Section */}
              <div className="bg-slate-50/80 border border-slate-100 p-5 rounded-2xl space-y-3">
                <span className="block font-bold text-slate-500 uppercase text-[11px] tracking-wider">
                  Official Social Media Channels & Website
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {org.twitter && (
                    <a
                      href={org.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Twitter / X"
                    >
                      <Twitter className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.linkedin && (
                    <a
                      href={org.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.facebook && (
                    <a
                      href={org.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-blue-50 text-blue-800 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Facebook"
                    >
                      <Facebook className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.instagram && (
                    <a
                      href={org.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-pink-50 text-pink-600 border border-slate-200 hover:border-pink-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Instagram"
                    >
                      <Instagram className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.youtube && (
                    <a
                      href={org.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="YouTube"
                    >
                      <Youtube className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.whatsapp && (
                    <a
                      href={org.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="WhatsApp"
                    >
                      <WhatsAppIcon className="h-4.5 w-4.5 text-emerald-600" />
                    </a>
                  )}
                  {org.telegram && (
                    <a
                      href={org.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-sky-50 text-sky-600 border border-slate-200 hover:border-sky-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Telegram"
                    >
                      <TelegramIcon className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.tiktok && (
                    <a
                      href={org.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="TikTok"
                    >
                      <TikTokIcon className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.github && (
                    <a
                      href={org.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="GitHub"
                    >
                      <GithubIcon className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.pinterest && (
                    <a
                      href={org.pinterest}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Pinterest"
                    >
                      <PinterestIcon className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {org.organizationWebsite && (
                    <a
                      href={org.organizationWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all shadow-2xs hover:shadow-xs hover:scale-105"
                      title="Official Website"
                    >
                      <Globe className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {!org.twitter && !org.linkedin && !org.facebook && !org.instagram && !org.youtube && !org.whatsapp && !org.telegram && !org.tiktok && !org.github && !org.pinterest && !org.organizationWebsite && (
                    <span className="text-xs text-slate-400 italic">No social media or website links provided.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Organizer details Card */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-4 sticky top-24">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Organizer Details</h3>
              
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-400">Location:</span>
                  <span className="font-bold text-slate-700">{org.city}, {org.country}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-400">Verification:</span>
                  <span className="font-bold text-blue-600">{org.isVerified ? "Verified Legitimate" : "Standard"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-400">Published Events:</span>
                  <span className="font-bold text-slate-800">
                    {publishedConferencesList.length}
                  </span>
                </div>
              </div>

              {org.organizationWebsite && (
                <div className="pt-2">
                  <a
                    href={org.organizationWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all border border-blue-500 hover:border-blue-600 shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    Visit Official Website <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conferences Published - 4 Column Grid Layout Section */}
        <div className="border-t border-slate-100 pt-8 space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 font-display text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" /> Conferences Published
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Browse all verified conferences hosted and published by this organization.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100 shadow-2xs">
                {publishedConferencesList.length} Published {publishedConferencesList.length === 1 ? "Event" : "Events"}
              </span>
            </div>
          </div>

          {publishedConferencesList.length === 0 ? (
            <p className="text-slate-400 text-xs italic font-medium p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
              No active conferences published yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 w-full pt-1">
              {publishedConferencesList.map((sc, scIdx) => {
                const scSlug = getConferenceSlug(sc, conferences);
                const scUrl = `/conference/${scSlug}`;
                return (
                  <div
                    key={sc.id || `pub-sc-${scIdx}`}
                    onClick={() => {
                      window.open(scUrl, "_blank");
                    }}
                    className="group bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md text-left h-full"
                  >
                    <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 sm:space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] sm:text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg tracking-wider uppercase">
                            {sc.category}
                          </span>
                          <span className={`text-[8px] sm:text-[9px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs ${
                            sc.liveStatus === LiveStatus.Ongoing
                              ? "bg-emerald-500 text-white"
                              : sc.liveStatus === LiveStatus.Upcoming
                              ? "bg-blue-500 text-white"
                              : "bg-slate-500 text-white"
                          }`}>
                            {sc.liveStatus}
                          </span>
                          {sc.attendanceType && (
                            <span className="text-[8px] sm:text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full shrink-0">
                              {sc.attendanceType}
                            </span>
                          )}
                        </div>

                        <h5 className="font-bold text-slate-900 text-xs sm:text-base group-hover:text-blue-600 transition-colors font-display leading-snug break-words">
                          {sc.title}
                        </h5>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium flex items-center gap-1">
                          <MapPinIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                          <span>{sc.city}, {sc.country}</span>
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed font-normal pt-0.5 sm:pt-1 break-words">
                          {sc.description && sc.description.length > 200
                            ? `${sc.description.slice(0, 200)}...`
                            : sc.description}
                        </p>
                      </div>
                      <div className="pt-2 sm:pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] sm:text-xs text-slate-500 font-semibold mt-auto gap-1 sm:gap-0">
                        <span className="flex items-center gap-1 text-slate-600 truncate">
                          <CalendarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{formatConferenceDate(sc.startDate)}</span>
                        </span>
                        <a
                          href={scUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="text-blue-600 font-bold flex items-center gap-0.5 sm:gap-1 group-hover:translate-x-1 transition-transform shrink-0 cursor-pointer hover:underline"
                        >
                          View More <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Content
  const renderContent = () => {
    if (selectedOrganizerId && (activePortal === "VISITOR" || !authUser)) {
      return renderOrganizerDetailPage();
    }

    if (selectedConference && (activePortal === "VISITOR" || !authUser)) {
      return renderConferenceDetailPage();
    }

    if (activePortal === "VISITOR" || !authUser) {
      return (
        <PublicPortal
          conferences={processedConferences}
          categories={categories}
          organizers={organizers}
          banners={banners}
          bannerContents={bannerContents}
          userFeedbacks={userFeedbacks}
          subscriberEmails={subscriberEmails}
          onUpdateUserFeedbacks={setUserFeedbacks}
          onUpdateSubscriberEmails={setSubscriberEmails}
          onAddNotification={addNotification}
          onRegisterClick={handleRegisterClick}
          onSelectOrganizer={setSelectedOrganizerId}
          onSelectConference={handleSelectConference}
          onLoginClick={() => {
            setAuthError("");
            setAuthMode("LOGIN");
          }}
          onSignUpClick={() => {
            setAuthError("");
            setAuthMode("SIGNUP");
          }}
          currentTab={publicTab}
          onTabChange={setPublicTab}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          countriesList={countriesList}
          citiesList={citiesList}
          inactiveCountries={inactiveCountries}
          inactiveCities={inactiveCities}
        />
      );
    }

    if (authUser.role === "ORGANIZER") {
      return (
        <OrganizerPortal
          conferences={organizerConferences}
          categories={categories}
          organizers={currentOrganizerProfiles}
          notifications={notifications.filter((n) => n.organizerId === authUser.organizerId)}
          activeOrgId={authUser.organizerId || null}
          onRegisterOrganizer={handleRegisterOrganizer}
          onUpdateOrganizer={handleRegisterOrganizer}
          onSubmitConference={handleSubmitConference}
          onResubmitConference={handleResubmitConference}
          onDeleteDraft={handleDeleteDraft}
          onAddNotification={addNotification}
          onClearNotifications={handleClearNotifications}
          authUser={authUser}
          isProfileComplete={isOrganizerProfileComplete}
          onNavigatePublic={handleNavClick}
          onLogout={handleLogout}
          onDeleteConference={handleDeleteConference}
          onToggleConferenceActive={handleToggleConferenceActive}
          countriesList={countriesList}
          citiesList={citiesList}
          inactiveCountries={inactiveCountries}
          inactiveCities={inactiveCities}
        />
      );
    }

    return null;
  };

  // If Organizer user is logged in and activePortal is ORGANIZER, render dedicated full-screen OrganizerPortal layout without public navbar wrapper
  if (authUser?.role === "ORGANIZER" && activePortal === "ORGANIZER") {
    return (
      <Suspense fallback={<PortalLoading />}>
      <div className="h-screen w-screen overflow-hidden bg-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        <OrganizerPortal
          conferences={organizerConferences}
          categories={categories}
          organizers={currentOrganizerProfiles}
          notifications={notifications.filter((n) => n.organizerId === authUser.organizerId)}
          activeOrgId={authUser.organizerId || null}
          onRegisterOrganizer={handleRegisterOrganizer}
          onUpdateOrganizer={handleRegisterOrganizer}
          onSubmitConference={handleSubmitConference}
          onResubmitConference={handleResubmitConference}
          onDeleteDraft={handleDeleteDraft}
          onAddNotification={addNotification}
          onClearNotifications={handleClearNotifications}
          authUser={authUser}
          isProfileComplete={isOrganizerProfileComplete}
          onNavigatePublic={(tab) => {
            setActivePortal("VISITOR");
            setPublicTab(tab || "HOME");
          }}
          onLogout={handleLogout}
          onDeleteConference={handleDeleteConference}
          onToggleConferenceActive={handleToggleConferenceActive}
          countriesList={countriesList}
          citiesList={citiesList}
          inactiveCountries={inactiveCountries}
          inactiveCities={inactiveCities}
        />
        {renderAuthModal()}
      </div>
      </Suspense>
    );
  }

  // If Admin user is logged in and activePortal is ADMIN, render dedicated full-screen AdminPortal layout without public navbar wrapper
  if (authUser?.role === "ADMIN" && activePortal === "ADMIN") {
    return (
      <Suspense fallback={<PortalLoading />}>
      <div className="h-screen w-screen overflow-hidden bg-slate-100 font-sans selection:bg-blue-600 selection:text-white">
        <AdminPortal
          conferences={processedConferences}
          categories={categories}
          organizers={organizers}
          auditLogs={auditLogs}
          banners={banners}
          onUpdateBanners={setBanners}
          bannerContents={bannerContents}
          onUpdateBannerContents={setBannerContents}
          userFeedbacks={userFeedbacks}
          onUpdateUserFeedbacks={setUserFeedbacks}
          subscriberEmails={subscriberEmails}
          onUpdateSubscriberEmails={setSubscriberEmails}
          onApproveConference={handleApproveConference}
          onRejectConference={handleRejectConference}
          onToggleConferenceActive={handleToggleConferenceActive}
          onDeleteConference={handleDeleteConference}
          onToggleFeatureConference={handleToggleFeatureConference}
          onToggleVerifyConference={handleToggleVerifyConference}
          onVerifyOrganizer={handleVerifyOrganizer}
          onToggleSuspendOrganizer={handleToggleSuspendOrganizer}
          onDeleteOrganizer={handleDeleteOrganizer}
          onAddCategory={handleAddCategory}
          onAddBulkCategories={handleAddBulkCategories}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onDeleteAllCategories={handleDeleteAllCategories}
          authUser={authUser}
          onNavigatePublic={(tab) => {
            setActivePortal("VISITOR");
            setPublicTab(tab || "HOME");
          }}
          onLogout={handleLogout}
          onSubmitConference={(conf, isDraft = false) => handleSubmitConference(conf, isDraft)}
          countriesList={countriesList}
          onUpdateCountries={setCountriesList}
          citiesList={citiesList}
          onUpdateCities={setCitiesList}
          inactiveCountries={inactiveCountries}
          onUpdateInactiveCountries={setInactiveCountries}
          inactiveCities={inactiveCities}
          onUpdateInactiveCities={setInactiveCities}
          
          notifications={notifications.filter((n) => n.organizerId === "ADMIN" || !n.organizerId)}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={() => handleMarkAllNotificationsRead("ADMIN")}
          onClearNotifications={handleClearNotifications}
        />
        {renderAuthModal()}
      </div>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans selection:bg-blue-600 selection:text-white flex flex-col pt-[68px] sm:pt-[76px]">
      {renderNavbar()}
      
      <main className="flex-1 w-full min-w-0 px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePortal + (authUser?.id || "anonymous")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PortalLoading />}>
              {initialRouteResolved ? renderContent() : <PortalLoading />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {renderAuthModal()}
    </div>
  );
}
