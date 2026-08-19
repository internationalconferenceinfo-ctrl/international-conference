import React, { useState, useMemo, useEffect, useRef } from "react";
import { adminFetch } from "../shared/utils/adminSession";
import { 
  saveToSupabase, fetchFromSupabase, subscribeToSupabase, deleteFromSupabase, 
  getSupabaseClient, uploadBannerImageToSupabase, deleteBannerImageFromSupabase,
  saveRecordToSupabase, deleteRecordFromSupabase
} from "../database/supabase";
import { 
  Check, X, ShieldAlert, Award, ShieldCheck, Flag, Ban, 
  Edit2, Edit3, Trash2, Calendar, MapPin, Eye, EyeOff, ExternalLink, 
  RefreshCw, Layers, Plus, FileText, Activity, LayoutDashboard,
  Users, BookOpen, Settings, Menu, AlertCircle,
  CheckCircle2, XCircle, Clock, Image, Home, Radio, Info, Mail,
  Phone, Globe, Share2, Twitter, Linkedin, Facebook, Instagram, Youtube,
  ChevronDown, ChevronRight, Search, Download, Star, MessageSquare, Send,
  UserCheck, Filter, ArrowUpDown, LogOut, Building, CheckSquare, Square, Save,
  Upload, FileSpreadsheet, Tag, Lock, Key, Shield, AlertTriangle, RotateCcw, Database
} from "lucide-react";
import { 
  Conference, Category, OrganizerProfile, ConferenceStatus, AuditLog, 
  Notification, Banner, formatConferenceDate, LiveStatus,
  BannerContentItem, UserFeedback, SubscriberItem
} from "../shared/types";
import { ImageUploaderField } from "../shared/components/ImageUploaderField";
import { isConferenceCompleted, extractStoragePathFromUrl } from "../shared/utils/expirationUtils";
import { safeSetLocalStorage } from "../shared/utils/storageUtils";
import { slugify, getConferenceSlug } from "../shared/utils/slugUtils";
import { toUpperCaseName } from "../shared/utils/textUtils";
import { OFFICIAL_CONTACT_INFO, OFFICIAL_SOCIAL_LINKS, ContactInfo, SocialLinks } from "../constants/contactConfig";

const getCleanImageSrc = (src?: string, fallback = ""): string => {
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

const DEFAULT_CONFERENCE_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";

interface AdminPortalProps {
  conferences: Conference[];
  categories: Category[];
  organizers: OrganizerProfile[];
  auditLogs: AuditLog[];
  banners: Banner[];
  onUpdateBanners: (banners: Banner[]) => void;
  bannerContents?: BannerContentItem[];
  onUpdateBannerContents?: (contents: BannerContentItem[]) => void;
  userFeedbacks?: UserFeedback[];
  onUpdateUserFeedbacks?: (feedbacks: UserFeedback[]) => void;
  subscriberEmails?: SubscriberItem[];
  onUpdateSubscriberEmails?: (subscribers: SubscriberItem[]) => void;
  onApproveConference: (confId: string) => void;
  onRejectConference: (confId: string, reason: string) => void;
  onToggleConferenceActive?: (confId: string) => Promise<{ success: boolean; isActive: boolean; error?: string }>;
  onDeleteConference?: (confId: string) => void;
  onToggleFeatureConference: (confId: string) => void;
  onToggleVerifyConference: (confId: string) => void;
  onVerifyOrganizer: (orgId: string) => void;
  onToggleSuspendOrganizer: (orgId: string) => Promise<{ success: boolean; isActive: boolean; error?: string }>;
  onDeleteOrganizer: (orgId: string) => void;
  onAddCategory: (cat: Partial<Category>) => void;
  onAddBulkCategories?: (cats: Partial<Category>[]) => void;
  onEditCategory: (catId: string, updated: Partial<Category>) => void;
  onDeleteCategory: (catId: string) => void;
  onDeleteAllCategories?: () => Promise<void> | void;
  authUser: any;
  onNavigatePublic?: (tabId: string) => void;
  onLogout?: () => void;
  onSubmitConference?: (conf: Partial<Conference>, isDraft?: boolean) => void;
  countriesList?: string[];
  onUpdateCountries?: (countries: string[]) => void;
  citiesList?: Array<{ name: string; country: string }>;
  onUpdateCities?: (cities: Array<{ name: string; country: string }>) => void;
  inactiveCountries?: string[];
  onUpdateInactiveCountries?: (inactive: string[]) => void;
  inactiveCities?: string[];
  onUpdateInactiveCities?: (inactive: string[]) => void;
  inactiveTopics?: string[];
  onUpdateInactiveTopics?: (inactive: string[]) => void;
  notifications?: Notification[];
  onMarkNotificationRead?: (notifId: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearNotifications?: () => void;
}

type MenuKey = 
  | "DASHBOARD_OVERVIEW"
  | "MANAGE_ORGANIZERS"
  | "APPROVED_CONFERENCES"
  | "MANAGE_CONFERENCES"
  | "COMPLETED_CONFERENCES"
  | "EVENT_FORM"
  | "MANAGE_MEDIA_PARTNERS"
  | "MANAGE_ASSOCIATES"
  | "ADD_BANNER"
  | "MANAGE_BANNERS"
  | "ADD_BANNER_TITLE"
  | "MANAGE_BANNER_TITLES"
  | "ADD_BANNER_DESC"
  | "MANAGE_BANNER_DESCS"
  | "ADD_COUNTRY"
  | "MANAGE_COUNTRIES"
  | "ADD_CITY"
  | "MANAGE_CITIES"
  | "ADD_TOPICS"
  | "MANAGE_TOPICS"
  | "ABOUT_INFO"
  | "APPROVED_FEEDBACK"
  | "MANAGE_FEEDBACK"
  | "SUBSCRIBER_EMAILS"
  | "ADMIN_PROFILE"
  | "ADMIN_PASSWORD"
  | "DATABASE_RESET";

type DatabaseResetScope =
  | "conferences"
  | "organizers"
  | "banners"
  | "topics"
  | "locations"
  | "media_partners"
  | "associates"
  | "feedback"
  | "subscribers"
  | "contact_inquiries"
  | "notifications"
  | "audit_logs"
  | "public_contact";

const DATABASE_RESET_OPTIONS: Array<{ value: DatabaseResetScope; label: string; description: string }> = [
  { value: "conferences", label: "Conferences", description: "Deletes conferences in every status and their linked notifications and audit entries." },
  { value: "organizers", label: "Organizer Accounts", description: "Deletes organizer accounts, their conferences, notifications, and organizer audit entries." },
  { value: "banners", label: "Banners & Banner Content", description: "Deletes homepage banners, banner titles, descriptions, and linked banner content." },
  { value: "topics", label: "Topics & Categories", description: "Deletes all topics, categories, and inactive-topic settings." },
  { value: "locations", label: "Countries & Cities", description: "Deletes countries, cities, and inactive-location settings." },
  { value: "media_partners", label: "Media Partners", description: "Deletes all media partner applications and records." },
  { value: "associates", label: "Associates", description: "Deletes all associate applications and records." },
  { value: "feedback", label: "User Feedback", description: "Deletes approved, pending, and rejected feedback." },
  { value: "subscribers", label: "Subscribers", description: "Deletes every subscriber email record." },
  { value: "contact_inquiries", label: "Contact Inquiries", description: "Deletes all Contact Us submissions." },
  { value: "notifications", label: "Notifications", description: "Deletes all Admin and Organizer notifications." },
  { value: "audit_logs", label: "Audit Logs", description: "Deletes the complete administration audit history." },
  { value: "public_contact", label: "Public Contact & Social Links", description: "Deletes saved public contact details and social links." },
];

interface MediaPartner {
  id: string;
  name: string;
  title?: string;
  type?: string;
  logo: string;
  website: string;
  description?: string;
  email?: string;
  submittedAt?: string;
  status: "Approved" | "Pending" | "Deactivated";
}

interface Associate {
  id: string;
  name: string;
  title?: string;
  category?: string;
  logo: string;
  website: string;
  description?: string;
  email?: string;
  submittedAt?: string;
  status: "Approved" | "Pending" | "Deactivated";
}

interface TextItem {
  id: string;
  content: string;
  status: "Active" | "Inactive";
}

export default function AdminPortal({
  conferences,
  categories,
  organizers,
  auditLogs,
  banners,
  onUpdateBanners,
  bannerContents: bannerContentsProp,
  onUpdateBannerContents,
  userFeedbacks: userFeedbacksProp,
  onUpdateUserFeedbacks,
  subscriberEmails: subscriberEmailsProp,
  onUpdateSubscriberEmails,
  onApproveConference,
  onRejectConference,
  onToggleConferenceActive,
  onDeleteConference,
  onToggleFeatureConference,
  onToggleVerifyConference,
  onVerifyOrganizer,
  onToggleSuspendOrganizer,
  onDeleteOrganizer,
  onAddCategory,
  onAddBulkCategories,
  onEditCategory,
  onDeleteCategory,
  onDeleteAllCategories,
  authUser,
  onNavigatePublic,
  onLogout,
  onSubmitConference,
  countriesList: countriesListProp,
  onUpdateCountries,
  citiesList: citiesListProp,
  onUpdateCities,
  inactiveCountries: inactiveCountriesProp,
  onUpdateInactiveCountries,
  inactiveCities: inactiveCitiesProp,
  onUpdateInactiveCities,
  inactiveTopics: inactiveTopicsProp,
  onUpdateInactiveTopics,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
}: AdminPortalProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("DASHBOARD_OVERVIEW");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Expanded menu accordion groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ [key]: !prev[key] }));
  };

  // Shared state sourced from Supabase
  const [mediaPartners, setMediaPartners] = useState<MediaPartner[]>([]);
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [bannerTitles, setBannerTitles] = useState<TextItem[]>([]);
  const [bannerDescs, setBannerDescs] = useState<TextItem[]>([]);
  const [bannerContents, setBannerContents] = useState<BannerContentItem[]>([]);

  const countriesList = countriesListProp || [];

  const setCountriesList = async (val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === "function" ? val(countriesList) : val;
    if (onUpdateCountries) {
      onUpdateCountries(next);
    }
    await saveToSupabase("countries", next);
  };

  const citiesList = citiesListProp || [];

  const setCitiesList = async (val: Array<{ name: string; country: string }> | ((prev: Array<{ name: string; country: string }>) => Array<{ name: string; country: string }>)) => {
    const next = typeof val === "function" ? val(citiesList) : val;
    if (onUpdateCities) {
      onUpdateCities(next);
    }
    await saveToSupabase("cities", next);
  };

  const inactiveCountries = inactiveCountriesProp || [];
  const setInactiveCountries = async (val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === "function" ? val(inactiveCountries) : val;
    if (onUpdateInactiveCountries) {
      onUpdateInactiveCountries(next);
    }
    await saveToSupabase("inactive_countries", next);
  };

  const inactiveCities = inactiveCitiesProp || [];
  const setInactiveCities = async (val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === "function" ? val(inactiveCities) : val;
    if (onUpdateInactiveCities) {
      onUpdateInactiveCities(next);
    }
    await saveToSupabase("inactive_cities", next);
  };

  const inactiveTopics = inactiveTopicsProp || [];
  const setInactiveTopics = async (val: string[] | ((prev: string[]) => string[])) => {
    const next = typeof val === "function" ? val(inactiveTopics) : val;
    if (onUpdateInactiveTopics) {
      onUpdateInactiveTopics(next);
    }
    await saveToSupabase("inactive_topics", next);
  };

  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedback[]>(userFeedbacksProp || []);
  const [subscriberEmails, setSubscriberEmails] = useState<Array<{ id: string; email: string; date: string }>>([]);

  const triggerBroadcastSync = () => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("gch_realtime_sync");
        bc.postMessage({ type: "DATA_UPDATED", timestamp: Date.now() });
        bc.close();
      }
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const isAdminLoaded = useRef(false);

  // Initial fetch for Admin Portal settings directly from Supabase
  useEffect(() => {
    Promise.all([
      fetchFromSupabase<MediaPartner[]>("media_partners", true),
      fetchFromSupabase<Associate[]>("associates", true),
      fetchFromSupabase<TextItem[]>("banner_titles", true),
      fetchFromSupabase<TextItem[]>("banner_descs", true),
      fetchFromSupabase<BannerContentItem[]>("banner_contents", true),
      fetchFromSupabase<SubscriberItem[]>("subscriber_emails", true),
      fetchFromSupabase<UserFeedback[]>("user_feedbacks", true)
    ]).then(([mpData, assocData, btData, bdData, bcData, subData, fbData]) => {
      if (mpData !== null && Array.isArray(mpData)) setMediaPartners(mpData);
      if (assocData !== null && Array.isArray(assocData)) setAssociates(assocData);
      if (btData !== null && Array.isArray(btData)) setBannerTitles(btData);
      if (bdData !== null && Array.isArray(bdData)) setBannerDescs(bdData);
      if (bcData !== null && Array.isArray(bcData)) setBannerContents(bcData);
      if (subData !== null && Array.isArray(subData)) setSubscriberEmails(subData);
      if (fbData !== null && Array.isArray(fbData)) setUserFeedbacks(fbData);
      isAdminLoaded.current = true;
    }).catch(() => {
      isAdminLoaded.current = true;
    });
  }, []);

  // Real-time sync for media partners & associates
  useEffect(() => {
    const syncFromSupabase = () => {
      fetchFromSupabase<MediaPartner[]>("media_partners", true).then((val) => {
        if (val !== null && Array.isArray(val)) {
          setMediaPartners(val);
        }
      });
      fetchFromSupabase<Associate[]>("associates", true).then((val) => {
        if (val !== null && Array.isArray(val)) {
          setAssociates(val);
        }
      });
    };

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("gch_realtime_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "DATA_UPDATED") {
            syncFromSupabase();
          }
        };
      } catch (e) {}
    }

    const unsubMP = subscribeToSupabase("media_partners", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        setMediaPartners(list as MediaPartner[]);
      }
    });

    const unsubAssoc = subscribeToSupabase("associates", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        setAssociates(list as Associate[]);
      }
    });

    window.addEventListener("focus", syncFromSupabase);
    return () => {
      if (bc) bc.close();
      unsubMP();
      unsubAssoc();
      window.removeEventListener("focus", syncFromSupabase);
    };
  }, []);

  // Real-time sync for User Feedbacks and Subscribers in Admin Portal
  useEffect(() => {
    const unsubFeedbacks = subscribeToSupabase("user_feedbacks", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        const deduplicated = Array.from(
          new Map((list as UserFeedback[]).map((f) => [f.id || `${f.name}-${f.text}`, f])).values()
        );
        setUserFeedbacks(deduplicated);
        if (onUpdateUserFeedbacks) onUpdateUserFeedbacks(deduplicated);
      }
    });

    const unsubSubscribers = subscribeToSupabase("subscriber_emails", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        setSubscriberEmails(list as SubscriberItem[]);
        if (onUpdateSubscriberEmails) onUpdateSubscriberEmails(list as SubscriberItem[]);
      }
    });

    return () => {
      unsubFeedbacks();
      unsubSubscribers();
    };
  }, [onUpdateUserFeedbacks, onUpdateSubscriberEmails]);



  useEffect(() => {
    if (userFeedbacksProp && Array.isArray(userFeedbacksProp)) {
      setUserFeedbacks((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(userFeedbacksProp)) return prev;
        return userFeedbacksProp;
      });
    }
  }, [userFeedbacksProp]);

  useEffect(() => {
    if (subscriberEmailsProp && Array.isArray(subscriberEmailsProp)) {
      setSubscriberEmails((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(subscriberEmailsProp)) return prev;
        return subscriberEmailsProp;
      });
    }
  }, [subscriberEmailsProp]);

  // Excel Bulk Upload and Demo File Download Handlers for Location Management
  const downloadDemoExcel = async () => {
    const XLSX = await import("xlsx");
    // Sample Data showing Country in Column A and Cities (comma-separated or single) in Column B
    const sampleData = [
      { Country: "United States", City: "New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas" },
      { Country: "India", City: "Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Surat" },
      { Country: "United Kingdom", City: "London, Manchester, Birmingham, Edinburgh, Glasgow, Liverpool, Bristol, Leeds, Sheffield" },
      { Country: "Japan", City: "Tokyo, Osaka, Yokohama, Nagoya, Sapporo, Kobe, Kyoto, Fukuoka" },
      { Country: "Germany", City: "Berlin, Munich, Frankfurt, Hamburg, Cologne, Stuttgart, Düsseldorf" },
      { Country: "France", City: "Paris, Marseille, Lyon, Toulouse, Nice, Nantes, Strasbourg" },
      { Country: "Australia", City: "Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Gold Coast" }
    ];

    const instructionsData = [
      {
        "Bulk Upload Format Guide": "Write Country in Column A ('United States') and list all cities in Column B separated by commas (e.g. 'New York, Los Angeles, Chicago, Houston, Phoenix...')."
      },
      {
        "Bulk Upload Format Guide": "You can list 1 city or 100+ cities in a single cell separated by commas, semicolons, or pipes."
      },
      {
        "Bulk Upload Format Guide": "Note: The uploader automatically trims whitespace, formats city names, and prevents duplicate entries."
      }
    ];

    const wsLocations = XLSX.utils.json_to_sheet(sampleData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsLocations, "Locations Demo");
    XLSX.utils.book_append_sheet(workbook, wsInstructions, "Instructions");

    XLSX.writeFile(workbook, "Location_Bulk_Upload_Demo.xlsx");
    showToast("Downloaded demo Excel file!");
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

        if (!data || data.length === 0) {
          showToast("Excel file is empty or could not be read.");
          return;
        }

        let addedCountriesCount = 0;
        let replacedCountriesCount = 0;
        let addedCitiesCount = 0;
        let replacedCitiesCount = 0;

        let currentCountries = [...countriesList];
        let currentCities = [...citiesList];

        data.forEach((row) => {
          const keys = Object.keys(row);
          if (keys.length === 0) return;

          const countryKey = keys.find(k => k.trim().toLowerCase().includes("country")) || keys[0];
          const cityKey = keys.find(k => k.trim().toLowerCase().includes("city")) || keys[1];

          const countryVal = String(row[countryKey] || "").trim().toUpperCase();
          const rawCityVal = String(row[cityKey] || "").trim();

          if (countryVal) {
            // Find existing matching country or add new
            const countryIndex = currentCountries.findIndex(c => c.trim().toUpperCase() === countryVal);
            let targetCountry = countryVal;
            if (countryIndex === -1) {
              currentCountries.push(countryVal);
              addedCountriesCount++;
            } else {
              const previousCountry = currentCountries[countryIndex];
              currentCountries[countryIndex] = countryVal;
              currentCities = currentCities.map((city) =>
                city.country.trim().toUpperCase() === countryVal
                  ? { ...city, country: countryVal }
                  : city
              );
              if (previousCountry !== countryVal) replacedCountriesCount++;
            }

            if (rawCityVal) {
              // Split cities by comma, semicolon, pipe, or newline (allows 100 cities in 1 cell!)
              const cityNames = rawCityVal
                .split(/[,;|\n]+/)
                .map(c => c.trim().toUpperCase())
                .filter(c => c.length > 0);

              cityNames.forEach((cityName) => {
                const existingCityIndex = currentCities.findIndex(
                  ct => ct.name.trim().toUpperCase() === cityName && ct.country.trim().toUpperCase() === targetCountry
                );
                if (existingCityIndex === -1) {
                  currentCities.push({ name: cityName, country: targetCountry! });
                  addedCitiesCount++;
                } else {
                  const previousCity = currentCities[existingCityIndex];
                  currentCities[existingCityIndex] = { ...previousCity, name: cityName, country: targetCountry };
                  replacedCitiesCount++;
                }
              });
            }
          }
        });

        setCountriesList(currentCountries);
        setCitiesList(currentCities);

        showToast(`Bulk upload complete: ${addedCountriesCount} countries and ${addedCitiesCount} cities added; ${replacedCountriesCount} countries and ${replacedCitiesCount} cities replaced.`);
      } catch (err) {
        console.error(err);
        showToast("Error parsing Excel file. Please ensure it's a valid .xlsx, .xls, or .csv file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Excel Bulk Upload and Demo File Download Handlers for Topic & Discipline Management
  const downloadDemoTopicsExcel = async () => {
    const XLSX = await import("xlsx");
    const sampleTopicData = [
      { "Topic Name": "Artificial Intelligence & Machine Learning", "Description": "Covering deep learning, neural networks, computer vision, and AI ethics." },
      { "Topic Name": "Computer Science & Engineering", "Description": "Algorithms, software engineering, systems architecture, and computing." },
      { "Topic Name": "Data Science & Big Analytics", "Description": "Data mining, predictive analytics, statistical modelling, and cloud data." },
      { "Topic Name": "Cybersecurity & Network Defense", "Description": "Information security, cryptography, network safety, and threat intelligence." },
      { "Topic Name": "Quantum Computing & Cryptography", "Description": "Quantum algorithms, quantum hardware, and post-quantum encryption." },
      { "Topic Name": "Robotics & Automation Systems", "Description": "Autonomous robotics, mechatronics, industrial automation, and control systems." },
      { "Topic Name": "Biomedical Engineering & Health Tech", "Description": "Bioinformatics, medical devices, health informatics, and clinical tech." },
      { "Topic Name": "Renewable Energy & Sustainability", "Description": "Clean tech, solar/wind energy, environmental engineering, and green power." }
    ];

    const instructionsData = [
      {
        "Bulk Upload Format Guide": "Write Topic Name in Column A (e.g. 'Artificial Intelligence & Machine Learning')."
      },
      {
        "Bulk Upload Format Guide": "Optionally write Description in Column B."
      },
      {
        "Bulk Upload Format Guide": "You can also list multiple topics in Column A separated by commas or newlines."
      }
    ];

    const wsTopics = XLSX.utils.json_to_sheet(sampleTopicData);
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsTopics, "Topics Demo");
    XLSX.utils.book_append_sheet(workbook, wsInstructions, "Instructions");

    XLSX.writeFile(workbook, "Topic_Discipline_Bulk_Upload_Demo.xlsx");
    showToast("Downloaded demo Excel file for topics!");
  };

  const handleTopicsExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

        if (!data || data.length === 0) {
          showToast("Excel file is empty or could not be read.");
          return;
        }

        const bulkItems: Partial<Category>[] = [];
        data.forEach((row) => {
          const keys = Object.keys(row);
          if (keys.length === 0) return;

          const nameKey = keys.find(k => k.trim().toLowerCase().includes("topic") || k.trim().toLowerCase().includes("category") || k.trim().toLowerCase().includes("name")) || keys[0];
          const descKey = keys.find(k => k.trim().toLowerCase().includes("desc")) || keys[1];

          const rawNameVal = String(row[nameKey] || "").trim();
          const descVal = descKey ? String(row[descKey] || "").trim() : "";

          if (rawNameVal) {
            const topicNames = rawNameVal.includes("\n")
              ? rawNameVal.split("\n").map(t => t.trim()).filter(Boolean)
              : [rawNameVal];

            topicNames.forEach(tName => {
              if (tName) {
                bulkItems.push({
                  name: tName,
                  slug: tName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  description: descVal || undefined
                });
              }
            });
          }
        });

        if (bulkItems.length > 0) {
          if (onAddBulkCategories) {
            onAddBulkCategories(bulkItems);
          } else {
            bulkItems.forEach(item => onAddCategory(item));
          }
        }

        showToast(`Bulk upload complete! Processed ${bulkItems.length} topic(s).`);
      } catch (err) {
        console.error(err);
        showToast("Error parsing Excel file. Please ensure it's a valid .xlsx, .xls, or .csv file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const isPendingStatus = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === "pending review" || s === "pending_review" || s === "pending" || s === "draft";
  };

  // Dashboard Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalConfs = conferences.length;
    const completedConfs = conferences.filter((c) => isConferenceCompleted(c)).length;
    const pendingConfs = conferences.filter((c) => isPendingStatus(c.status) && !isConferenceCompleted(c)).length;
    const approvedConfs = conferences.filter((c) => (c.status === ConferenceStatus.Approved || String(c.status).toLowerCase().trim() === "approved") && !isConferenceCompleted(c)).length;
    const totalOrgs = organizers.length;
    const mediaPartnerReqs = mediaPartners.filter((m) => m.status === "Pending").length;
    const associateReqs = associates.filter((a) => a.status === "Pending").length;
    const feedbackCount = userFeedbacks.length;
    const subscriberCount = subscriberEmails.length;

    return {
      totalOrgs,
      totalConfs,
      completedConfs,
      pendingConfs,
      approvedConfs,
      mediaPartnerReqs,
      associateReqs,
      feedbackCount,
      subscriberCount
    };
  }, [conferences, organizers, mediaPartners, associates, userFeedbacks, subscriberEmails]);

  // Table Search, Filter, Pagination, Bulk Actions local states
  const [searchTerm, setSearchTerm] = useState("");

  // Reset list filters whenever the Admin changes conference sections so an
  // old search/topic selection cannot make a valid approved record look missing.
  useEffect(() => {
    if (activeMenu === "APPROVED_CONFERENCES" || activeMenu === "MANAGE_CONFERENCES" || activeMenu === "COMPLETED_CONFERENCES") {
      setSearchTerm("");
      setCategoryFilter("All");
      setCurrentPage(1);
    }
  }, [activeMenu]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 48;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<string[]>([]);

  // Reset pagination on search/filter/menu change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
    setSelectedCompletedIds([]);
  }, [activeMenu, statusFilter, categoryFilter, searchTerm]);

  // Form States for CRUD
  const [eventFormState, setEventFormState] = useState({
    title: "",
    shortTitle: "",
    category: categories[0]?.name || "Artificial Intelligence & ML",
    startDate: "",
    endDate: "",
    venue: "",
    city: "Boston",
    country: "United States",
    description: "",
    websiteUrl: "",
    contactEmail: "",
    bannerImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    organizerId: organizers[0]?.id || "org-1"
  });

  const [inactiveConferences, setInactiveConferences] = useState<string[]>([]);
  const [viewingConfDetails, setViewingConfDetails] = useState<Conference | null>(null);
  const [viewingOrgDetails, setViewingOrgDetails] = useState<OrganizerProfile | null>(null);

  // Organizers view mode (Cards vs Table)
  const [organizerViewMode, setOrganizerViewMode] = useState<"cards" | "table">("cards");

  // Editing state modals
  const [editingPartner, setEditingPartner] = useState<MediaPartner | null>(null);
  const [editingAssociate, setEditingAssociate] = useState<Associate | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingCountryIdx, setEditingCountryIdx] = useState<number | null>(null);
  const [editCountryName, setEditCountryName] = useState("");
  
  const [editingCityIdx, setEditingCityIdx] = useState<number | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [editCityCountry, setEditCityCountry] = useState("");

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicName, setEditTopicName] = useState("");
  const [editTopicDesc, setEditTopicDesc] = useState("");

  const [showBulkTopicModal, setShowBulkTopicModal] = useState(false);
  const [bulkTopicText, setBulkTopicText] = useState("");
  const [topicSearchQuery, setTopicSearchQuery] = useState("");
  const [topicStatusFilter, setTopicStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [showAddCountryForm, setShowAddCountryForm] = useState(false);
  const [showAddCityForm, setShowAddCityForm] = useState(false);
  const [showAddTopicForm, setShowAddTopicForm] = useState(false);

  // Feedback management states
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editFbName, setEditFbName] = useState("");
  const [editFbImage, setEditFbImage] = useState("");
  const [editFbText, setEditFbText] = useState("");
  const [editFbRating, setEditFbRating] = useState(5);
  const [editFbCountry, setEditFbCountry] = useState("");
  const [editFbStatus, setEditFbStatus] = useState<"Approved" | "Pending">("Approved");

  const [fbSearchQuery, setFbSearchQuery] = useState("");
  const [fbStatusFilter, setFbStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const syncUserFeedbacksToStorageAndRtdb = async (updatedList: UserFeedback[]) => {
    const deduplicated = Array.from(
      new Map(updatedList.map((item) => [item.id || `${item.name}-${item.text}`, item])).values()
    );
    setUserFeedbacks(deduplicated);
    if (onUpdateUserFeedbacks) onUpdateUserFeedbacks(deduplicated);
    safeSetLocalStorage("gch_feedbacks", deduplicated);
    await saveToSupabase("user_feedbacks", deduplicated);
  };

  // Subscriber management states
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  const syncSubscriberEmailsToStorageAndRtdb = (updatedList: SubscriberItem[]) => {
    setSubscriberEmails(updatedList);
    if (onUpdateSubscriberEmails) onUpdateSubscriberEmails(updatedList);
    saveToSupabase("subscriber_emails", updatedList);
  };

  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerType, setNewPartnerType] = useState("");
  const [newPartnerLogo, setNewPartnerLogo] = useState("");
  const [newPartnerWebsite, setNewPartnerWebsite] = useState("");

  const [newAssocName, setNewAssocName] = useState("");
  const [newAssocCat, setNewAssocCat] = useState("");
  const [newAssocLogo, setNewAssocLogo] = useState("");
  const [newAssocWebsite, setNewAssocWebsite] = useState("");

  const [newBannerImage, setNewBannerImage] = useState("");
  const [newBannerTitleText, setNewBannerTitleText] = useState("");
  const [newBannerDescText, setNewBannerDescText] = useState("");
  const [showAddBannerForm, setShowAddBannerForm] = useState(false);
  const [newBannerOrder, setNewBannerOrder] = useState<number | "">("");
  const [newBannerStatus, setNewBannerStatus] = useState<"Active" | "Inactive">("Active");
  const [bannerStatusFilter, setBannerStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  const [showAddBannerContentForm, setShowAddBannerContentForm] = useState(false);
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentDescription, setNewContentDescription] = useState("");
  const [newContentBannerId, setNewContentBannerId] = useState("");
  const [newContentStatus, setNewContentStatus] = useState<"Approved" | "Pending" | "Rejected">("Approved");
  const [editingBannerContent, setEditingBannerContent] = useState<BannerContentItem | null>(null);
  const [bannerContentStatusFilter, setBannerContentStatusFilter] = useState("All");

  const [newCountryName, setNewCountryName] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [newCityCountry, setNewCityCountry] = useState(countriesList[0] || "United States");

  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Admin Profile & Security States
  const [adminProfile, setAdminProfile] = useState<{
    name: string;
    email: string;
    avatar: string;
  }>({
    name: authUser?.name || "Super Admin",
    email: authUser?.email || "",
    avatar: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [publicContactInfo, setPublicContactInfo] = useState<ContactInfo>({ ...OFFICIAL_CONTACT_INFO });
  const [publicSocialLinks, setPublicSocialLinks] = useState<SocialLinks>({ ...OFFICIAL_SOCIAL_LINKS });
  const [isSavingPublicContact, setIsSavingPublicContact] = useState(false);

  // Load Admin Profile from backend
  useEffect(() => {
    adminFetch("/api/admin/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.profile) {
          setAdminProfile((previous) => ({
            name: data.profile.name || previous.name,
            email: data.profile.email || previous.email,
            avatar: data.profile.avatar || "",
          }));
        }
      })
      .catch((err) => console.warn("Could not load admin profile:", err));

    fetchFromSupabase<any>("contact_info", true).then((data) => {
      const contact = Array.isArray(data) ? data[0] : data;
      if (contact) setPublicContactInfo({
        email: contact.email || OFFICIAL_CONTACT_INFO.email,
        phone: contact.phone || OFFICIAL_CONTACT_INFO.phone,
        address: contact.address || OFFICIAL_CONTACT_INFO.address,
      });
    });
    fetchFromSupabase<any>("social_links", true).then((data) => {
      const links = Array.isArray(data) ? data[0] : data;
      if (links) setPublicSocialLinks({ ...OFFICIAL_SOCIAL_LINKS, ...links });
    });
  }, []);

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await adminFetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: adminProfile.name, avatar: adminProfile.avatar })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast("Admin profile updated successfully!");
      } else {
        showToast(data.error || "Failed to update profile.");
      }
    } catch (err: any) {
      showToast("Error updating admin profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePublicContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPublicContact(true);
    try {
      await saveToSupabase("contact_info", { id: "primary", ...publicContactInfo });
      await saveToSupabase("social_links", { id: "primary", ...publicSocialLinks });
      triggerBroadcastSync();
      showToast("Public Contact Us details and footer updated successfully!");
    } catch (_error) {
      showToast("Unable to update public contact details.");
    } finally {
      setIsSavingPublicContact(false);
    }
  };

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", msg: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: "error", msg: "New password must be at least 6 characters long." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await adminFetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setPasswordFeedback({ type: "success", msg: data.message || "Admin password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast("Password updated!");
      } else {
        setPasswordFeedback({ type: "error", msg: data.error || "Failed to change password." });
      }
    } catch (err: any) {
      setPasswordFeedback({ type: "error", msg: "Server connection failed while updating password." });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Database Reset States
  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [resetScope, setResetScope] = useState<DatabaseResetScope>("conferences");
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleResetDatabase = async (scope: DatabaseResetScope | "all") => {
    setResetStatus(null);

    if (!resetAdminPassword) {
      setResetStatus({ type: "error", msg: "Super Admin password is required." });
      return;
    }

    const selected = DATABASE_RESET_OPTIONS.find((option) => option.value === scope);
    const targetLabel = scope === "all" ? "the FULL application database" : selected?.label || "the selected section";
    const warning = scope === "all"
      ? "This permanently deletes every application data section. Your Super Admin login and profile will be preserved."
      : `${selected?.description || "The selected records will be permanently deleted."} This removal applies everywhere in the website.`;

    if (!window.confirm(`Permanently delete ${targetLabel}?\n\n${warning}\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsResettingDb(true);
    try {
      const res = await adminFetch("/api/admin/reset-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword: resetAdminPassword,
          scope,
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setResetStatus({ type: "success", msg: data.message || "Database successfully reset!" });
        setResetAdminPassword("");
        showToast(scope === "all" ? "Full database deletion complete!" : `${selected?.label || "Selected section"} deleted!`);
        // Refresh page after short delay to reload clean state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResetStatus({ type: "error", msg: data.error || "Failed to reset database." });
      }
    } catch (err: any) {
      setResetStatus({ type: "error", msg: "Server error executing database reset." });
    } finally {
      setIsResettingDb(false);
    }
  };

  // Reusable bulk toggle
  const toggleSelectAll = (allIds: string[]) => {
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Logout handler
  const handleLogoutClick = () => {
    if (onLogout) onLogout();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col text-slate-800 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#37494E] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Fixed Top Navbar Header */}
      <header className="h-16 bg-[#37494E] text-white px-4 md:px-6 flex items-center justify-between shadow-md z-40 shrink-0 border-b border-[#2c3b3f]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
            title="Toggle Sidebar Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
              <Globe className="h-4.5 w-4.5 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-white leading-tight font-display">
                International Conference Admin Dashboard
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveMenu("ADMIN_PROFILE")}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-left"
            title="View Admin Profile"
          >
            {adminProfile.avatar ? (
              <img 
                src={adminProfile.avatar} 
                alt={adminProfile.name}
                className="w-8 h-8 rounded-full object-contain shadow-xs border border-blue-400 shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs border border-blue-400 shrink-0">
                {adminProfile.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-none">{adminProfile.name || "Super Admin"}</p>
              <p className="text-[10px] text-slate-300 leading-none mt-1">{adminProfile.email || "Not configured"}</p>
            </div>
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Container */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Mobile Backdrop Overlay when sidebar is toggled open */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 top-16 bg-slate-900/50 backdrop-blur-xs z-20 transition-opacity"
          />
        )}
        
        {/* Left Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static top-16 bottom-0 left-0 z-30 h-[calc(100vh-4rem)] lg:h-full
            ${isSidebarOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-16"}
            bg-[#37494E] text-slate-200 shrink-0 transition-all duration-300 shadow-xl border-r border-[#2c3b3f] flex flex-col justify-between overflow-hidden
          `}
        >
          <div className="p-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Navigation Items */}
            <nav className="space-y-1 text-xs font-medium">
              
              {/* 1. 🏠 Dashboard Overview */}
              <button
                onClick={() => {
                  setActiveMenu("DASHBOARD_OVERVIEW");
                  setOpenGroups({});
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeMenu === "DASHBOARD_OVERVIEW"
                    ? "bg-white text-[#37494E] font-bold shadow-md"
                    : "hover:bg-white/10 text-slate-300"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {isSidebarOpen && <span>Dashboard Overview</span>}
              </button>

              {/* 2. 👤 Manage Organisers */}
              <button
                onClick={() => {
                  setActiveMenu("MANAGE_ORGANIZERS");
                  setOpenGroups({});
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeMenu === "MANAGE_ORGANIZERS"
                    ? "bg-white text-[#37494E] font-bold shadow-md"
                    : "hover:bg-white/10 text-slate-300"
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                {isSidebarOpen && <span>Manage Organisers</span>}
              </button>

              {/* 3. 📅 Conferences */}
              <div>
                <button
                  onClick={() => toggleGroup("conferences")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-slate-300 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span className="font-semibold">Conferences</span>}
                  </div>
                  {isSidebarOpen && (openGroups.conferences ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                </button>
                {isSidebarOpen && openGroups.conferences && (
                  <div className="pl-8 pt-1 space-y-1 border-l border-white/10 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveMenu("APPROVED_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "APPROVED_CONFERENCES" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Pending Conferences
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "MANAGE_CONFERENCES" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Manage Conferences
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("COMPLETED_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        activeMenu === "COMPLETED_CONFERENCES" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span>Completed Conferences</span>
                      {summaryMetrics.completedConfs > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
                          {summaryMetrics.completedConfs}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 4. 🤝 Media & Associates */}
              <div>
                <button
                  onClick={() => toggleGroup("media")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-slate-300 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span className="font-semibold truncate">Media & Associates</span>}
                  </div>
                  {isSidebarOpen && (openGroups.media ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                </button>
                {isSidebarOpen && openGroups.media && (
                  <div className="pl-8 pt-1 space-y-1 border-l border-white/10 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_MEDIA_PARTNERS");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        activeMenu === "MANAGE_MEDIA_PARTNERS" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span>Media Partners</span>
                      {summaryMetrics.mediaPartnerReqs > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[10px]">
                          {summaryMetrics.mediaPartnerReqs}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_ASSOCIATES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        activeMenu === "MANAGE_ASSOCIATES" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span>Our Associates</span>
                      {summaryMetrics.associateReqs > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[10px]">
                          {summaryMetrics.associateReqs}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* 5. 🏡 Home */}
              <div>
                <button
                  onClick={() => toggleGroup("home")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-slate-300 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Home className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span className="font-semibold">Home</span>}
                  </div>
                  {isSidebarOpen && (openGroups.home ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                </button>
                {isSidebarOpen && openGroups.home && (
                  <div className="pl-8 pt-1 space-y-1 border-l border-white/10 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_BANNERS");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "MANAGE_BANNERS" || activeMenu === "ADD_BANNER" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Banner
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_COUNTRIES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "MANAGE_COUNTRIES" || activeMenu === "ADD_COUNTRY" || activeMenu === "MANAGE_CITIES" || activeMenu === "ADD_CITY" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Locations
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_TOPICS");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "MANAGE_TOPICS" || activeMenu === "ADD_TOPICS" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Topics
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("MANAGE_FEEDBACK");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "MANAGE_FEEDBACK" || activeMenu === "APPROVED_FEEDBACK" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Feedback
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("SUBSCRIBER_EMAILS");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "SUBSCRIBER_EMAILS" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Subscribers
                    </button>
                  </div>
                )}
              </div>

              {/* 6. ⚙️ Settings & System Governance */}
              <div>
                <button
                  onClick={() => toggleGroup("settings")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-slate-300 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 shrink-0" />
                    {isSidebarOpen && <span className="font-semibold">Settings & Security</span>}
                  </div>
                  {isSidebarOpen && (openGroups.settings ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}
                </button>
                {isSidebarOpen && openGroups.settings && (
                  <div className="pl-8 pt-1 space-y-1 border-l border-white/10 ml-5 my-1">
                    <button
                      onClick={() => {
                        setActiveMenu("ADMIN_PROFILE");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "ADMIN_PROFILE" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Admin Profile
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("ADMIN_PASSWORD");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "ADMIN_PASSWORD" ? "text-white font-bold bg-white/20" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu("DATABASE_RESET");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer text-rose-300 hover:text-rose-100 ${
                        activeMenu === "DATABASE_RESET" ? "text-white font-bold bg-rose-500/30" : ""
                      }`}
                    >
                      Reset Database
                    </button>
                  </div>
                )}
              </div>



            </nav>
          </div>

          {/* Sidebar Footer & Logout */}
          <div className="p-3 border-t border-white/10 mt-auto shrink-0 bg-[#37494E]">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-xl transition-all text-xs font-bold border border-rose-500/30 cursor-pointer shadow-sm"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {isSidebarOpen && <span>Logout Account</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area beside Sidebar */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden bg-slate-100 h-full">
          
          {/* Section Header */}
          <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-2xs sticky top-0 z-20 shrink-0">
            <h2 className="text-sm md:text-base font-bold font-display text-[#37494E]">
              {activeMenu.replace(/_/g, " ")}
            </h2>
          </div>

          {/* Content Body Container */}
          <div className="p-4 md:p-6 space-y-6">

          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeMenu === "DASHBOARD_OVERVIEW" && (
            <div className="space-y-6">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-[#37494E]">{summaryMetrics.totalOrgs}</span>
                    <div className="p-2.5 bg-slate-100 rounded-xl text-[#37494E] hover-icon-scale"><Users className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Total Organizers</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-600">{summaryMetrics.totalConfs}</span>
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 hover-icon-scale"><FileText className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Total Conferences</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-600">{summaryMetrics.pendingConfs}</span>
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 hover-icon-scale"><Clock className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Pending Conferences</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-600">{summaryMetrics.approvedConfs}</span>
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 hover-icon-scale"><CheckCircle2 className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Approved Conferences</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-purple-600">{summaryMetrics.mediaPartnerReqs}</span>
                    <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 hover-icon-scale"><Award className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Media Partner Requests</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-indigo-600">{summaryMetrics.associateReqs}</span>
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 hover-icon-scale"><Building className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Associate Requests</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-rose-600">{summaryMetrics.feedbackCount}</span>
                    <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 hover-icon-scale"><MessageSquare className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Feedback Count</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-600">{summaryMetrics.subscriberCount}</span>
                    <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 hover-icon-scale"><Mail className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Subscriber Count</p>
                </div>
              </div>

              {/* Quick Actions & Audit Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-[#37494E] flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" /> Pending Conference Queue
                    </h3>
                    <button onClick={() => setActiveMenu("MANAGE_CONFERENCES")} className="text-xs text-blue-600 font-bold hover:underline">
                      View All
                    </button>
                  </div>

                  {conferences.filter((c) => c.status === ConferenceStatus.PendingReview).length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">All caught up!</p>
                      <p className="text-[11px] text-slate-400">No pending conference submissions awaiting audit.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conferences
                        .filter((c) => c.status === ConferenceStatus.PendingReview)
                        .slice(0, 4)
                        .map((conf, confIdx) => (
                          <div key={conf.id ? `${conf.id}-${confIdx}` : `pending-conf-${confIdx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={getCleanImageSrc(conf.bannerImage, "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80")}
                                alt={conf.title}
                                className="h-14 w-20 rounded-lg object-contain bg-slate-200 border border-slate-200 shrink-0 shadow-xs"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                                }}
                              />
                              <div>
                                <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">{conf.category}</span>
                                <a
                                  href={`/conference/${getConferenceSlug(conf, conferences)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline mt-1 leading-snug break-words flex items-center gap-1 group cursor-pointer"
                                  title="Open live Conference Details in new tab"
                                >
                                  <span>{conf.title}</span>
                                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                </a>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {conf.city}, {conf.country} • {formatConferenceDate(conf.startDate)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  onApproveConference(conf.id);
                                  showToast("Conference approved successfully!");
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  onRejectConference(conf.id, "Does not meet guidelines");
                                  showToast("Conference rejected.");
                                }}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-[#37494E] flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Activity className="h-4 w-4 text-blue-500" /> Recent System Audit Logs
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs custom-scrollbar">
                    {auditLogs.slice(0, 6).map((log, logIdx) => (
                      <div key={log.id ? `${log.id}-${logIdx}` : `audit-log-${logIdx}`} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#37494E]">{log.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{typeof log.details === "string" ? log.details : JSON.stringify(log.details ?? "")}</p>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">By: {log.actor} ({log.role})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 13. ADMIN PROFILE MANAGEMENT VIEW */}
          {activeMenu === "ADMIN_PROFILE" && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#37494E]">Super Admin Profile</h2>
                    <p className="text-xs text-slate-500 mt-1">Manage your platform administration credentials and display details.</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    Master Administrator
                  </span>
                </div>

                <form onSubmit={handleSaveAdminProfile} className="space-y-6">
                  {/* Avatar Upload / Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    {adminProfile.avatar ? (
                      <img 
                        src={adminProfile.avatar} 
                        alt={adminProfile.name}
                        className="w-20 h-20 rounded-full object-contain border-2 border-white shadow-md shrink-0" 
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#37494E] text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                        {adminProfile.name?.charAt(0) || "A"}
                      </div>
                    )}
                    <div className="flex-1 space-y-2 w-full">
                      <ImageUploaderField
                        label="Admin Profile Avatar / Photo"
                        value={adminProfile.avatar}
                        onChange={(val) => setAdminProfile({ ...adminProfile, avatar: val })}
                        placeholder="Paste image URL or upload image (Max 20 KB)"
                        aspectHint="Square avatar, max 20 KB"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={adminProfile.name}
                        onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>{isSavingProfile ? "Saving Profile..." : "Save Profile Details"}</span>
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
                <div className="border-b border-slate-100 pb-5 mb-6">
                  <h2 className="text-xl font-extrabold text-[#37494E]">Public Contact Us Details</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    These details appear on the User Portal Contact Us page and footer. Your private Admin Profile is not published here.
                  </p>
                </div>

                <form onSubmit={handleSavePublicContact} className="space-y-6 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Public Email Address</label>
                      <input
                        type="email"
                        required
                        value={publicContactInfo.email}
                        onChange={(e) => setPublicContactInfo({ ...publicContactInfo, email: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Public Contact Number</label>
                      <input
                        type="text"
                        required
                        value={publicContactInfo.phone}
                        onChange={(e) => setPublicContactInfo({ ...publicContactInfo, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Public Office Address</label>
                      <textarea
                        rows={3}
                        required
                        value={publicContactInfo.address}
                        onChange={(e) => setPublicContactInfo({ ...publicContactInfo, address: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#37494E]">Public Social Media Links</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Add or update any channel. Leave a field empty to hide that channel publicly.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        ["facebook", "Facebook URL"],
                        ["instagram", "Instagram URL"],
                        ["linkedin", "LinkedIn URL"],
                        ["twitter", "Twitter / X URL"],
                        ["other", "Other Browser / Website URL"],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="space-y-1.5">
                          <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">{label}</label>
                          <input
                            type="url"
                            value={publicSocialLinks[key] || ""}
                            onChange={(e) => setPublicSocialLinks({ ...publicSocialLinks, [key]: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSavingPublicContact}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPublicContact ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>{isSavingPublicContact ? "Updating Contact Us..." : "Save Public Contact Details"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 14. ADMIN PASSWORD CHANGE VIEW */}
          {activeMenu === "ADMIN_PASSWORD" && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#37494E]">Change Admin Password</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Update your Super Admin access key with secure server-side verification.</p>
                  </div>
                </div>

                {passwordFeedback && (
                  <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 mb-5 ${
                    passwordFeedback.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}>
                    {passwordFeedback.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{passwordFeedback.msg}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">New Password (Min 6 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new strong password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full py-3 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isChangingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      <span>{isChangingPassword ? "Updating Password..." : "Update Password"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 15. DATABASE RESET & SYSTEM PURGE VIEW */}
          {activeMenu === "DATABASE_RESET" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border-2 border-rose-200">
                <div className="flex items-center gap-3.5 border-b border-rose-100 pb-5 mb-6">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-rose-900">Delete Database Records</h2>
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">Delete one section or reset the full application database</p>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 leading-relaxed mb-6">
                  <p className="font-extrabold">Every delete operation requires the current Super Admin password.</p>
                  <p className="mt-1 text-amber-800">Deleted data is removed from its database tables and matching application storage. Super Admin login and profile details are always preserved.</p>
                </div>

                {resetStatus && (
                  <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 mb-5 ${
                    resetStatus.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}>
                    {resetStatus.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{resetStatus.msg}</span>
                  </div>
                )}

                <div className="space-y-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Select the data section to delete</label>
                    <select
                      value={resetScope}
                      onChange={(event) => setResetScope(event.target.value as DatabaseResetScope)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold text-slate-800 cursor-pointer"
                    >
                      {DATABASE_RESET_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p className="px-1 text-[11px] leading-relaxed text-slate-500">
                      {DATABASE_RESET_OPTIONS.find((option) => option.value === resetScope)?.description}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800">Enter current Super Admin password</label>
                    <input
                      type="password"
                      value={resetAdminPassword}
                      onChange={(e) => setResetAdminPassword(e.target.value)}
                      placeholder="Super Admin Password"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleResetDatabase(resetScope)}
                      disabled={isResettingDb || !resetAdminPassword}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isResettingDb ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      <span>{isResettingDb ? "Deleting Records..." : "Delete Selected Section"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetDatabase("all")}
                      disabled={isResettingDb || !resetAdminPassword}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isResettingDb ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      <span>{isResettingDb ? "Deleting Records..." : "Delete Full Database"}</span>
                    </button>
                  </div>

                  <p className="text-center text-[10px] font-semibold text-rose-600">
                    Full database deletion removes every listed section and cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: MANAGE ORGANIZERS */}
          {activeMenu === "MANAGE_ORGANIZERS" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E]">Organizer Management</h3>
                  <p className="text-xs text-slate-500">
                    Review completed organizer profiles, activate or deactivate accounts, verify organizers, and manage organizer access.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full border border-slate-200">
                    Total: {organizers.length}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-200">
                    Active: {organizers.filter((o) => !o.isSuspended).length}
                  </span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full border border-amber-200">
                    Pending/Inactive: {organizers.filter((o) => o.isSuspended).length}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, contact, country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#37494E]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Inactive">Inactive / Pending Activation</option>
                    <option value="Verified">Verified Only</option>
                  </select>
                </div>
              </div>

              {/* Organizers Cards Grid */}
              {(() => {
                const filteredOrgs = organizers.filter((o) => {
                  const q = searchTerm.toLowerCase();
                  const matchesSearch =
                    o.organizationName.toLowerCase().includes(q) ||
                    o.contactPerson.toLowerCase().includes(q) ||
                    o.email.toLowerCase().includes(q) ||
                    o.country.toLowerCase().includes(q);

                  const matchesStatus =
                    statusFilter === "All" ||
                    (statusFilter === "Active" && !o.isSuspended) ||
                    (statusFilter === "Inactive" && o.isSuspended) ||
                    (statusFilter === "Verified" && o.isVerified);

                  return matchesSearch && matchesStatus;
                });

                if (filteredOrgs.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No Organizers Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or filter selection.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrgs.map((org, orgIdx) => {
                      const pubCount = conferences.filter((c) => c.organizerId === org.id && c.status === ConferenceStatus.Approved).length;

                      return (
                        <div
                          key={org.id ? `${org.id}-${orgIdx}` : `org-mgmt-${orgIdx}`}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {org.logo ? (
                                  <img
                                    src={org.logo}
                                    alt={org.organizationName}
                                    className="w-12 h-12 rounded-xl object-contain border border-slate-200 shadow-xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                                    {org.organizationName?.charAt(0) || "O"}
                                  </div>
                                )}
                                <div>
                                  <a
                                    href={`/organizers/${org.slug || org.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-sm text-slate-900 hover:text-blue-600 hover:underline leading-snug break-words inline-flex items-center gap-1 group cursor-pointer"
                                    title="View unique public profile"
                                  >
                                    <span>{org.organizationName || "Unnamed Organization"}</span>
                                    <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                  </a>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {org.email}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                              <p className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Contact:{" "}
                                <span className="font-bold text-slate-800">{org.contactPerson || "Not provided"}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Location:{" "}
                                <span className="font-bold text-slate-800">
                                  {[org.city, org.country].filter(Boolean).join(", ") || "Global"}
                                </span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              {org.isSuspended ? (
                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full border border-amber-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                  Inactive / Pending Activation
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Active
                                </span>
                              )}
                              {org.isVerified ? (
                                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full flex items-center gap-1 border border-blue-200">
                                  <CheckCircle2 className="h-3 w-3 text-blue-600" /> Verified
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">
                                  Unverified
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => setViewingOrgDetails(org)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center gap-1"
                              title="View Organizer Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => {
                                onVerifyOrganizer(org.id);
                                showToast(org.isVerified ? "Organizer set to unverified." : "Organizer verified successfully!");
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                            >
                              {org.isVerified ? "Unverify" : "Verify"}
                            </button>

                            <button
                              onClick={async () => {
                                const result = await onToggleSuspendOrganizer(org.id);
                                showToast(result.success
                                  ? (result.isActive ? `Activated organizer "${org.organizationName}"` : `Deactivated organizer "${org.organizationName}"`)
                                  : (result.error || "Unable to update organizer status."));
                              }}
                              className={`px-3 py-1.5 font-bold rounded-xl text-xs cursor-pointer transition-colors ${
                                org.isSuspended ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs" : "bg-amber-500 hover:bg-amber-600 text-white"
                              }`}
                            >
                              {org.isSuspended ? "Activate" : "Deactivate"}
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to permanently delete organizer "${org.organizationName || org.email}"?`)) {
                                  onDeleteOrganizer(org.id);
                                  showToast(`Organizer "${org.organizationName || org.email}" deleted.`);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer transition-colors"
                              title="Delete Organizer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SECTION 3: CONFERENCES (Pending, Manage & Completed) */}
          {(activeMenu === "APPROVED_CONFERENCES" || activeMenu === "MANAGE_CONFERENCES" || activeMenu === "COMPLETED_CONFERENCES") && (() => {
            const ADMIN_ITEMS_PER_PAGE = 48;
            const filteredAdminConferences = conferences
              .filter((c) => {
                if (activeMenu === "APPROVED_CONFERENCES") {
                  return isPendingStatus(c.status) && !isConferenceCompleted(c);
                }
                if (activeMenu === "MANAGE_CONFERENCES") {
                  const matchesStatus = String(c.status || "").trim().toLowerCase() === "approved" && !isConferenceCompleted(c);
                  const query = searchTerm.trim().toLowerCase();
                  const matchesSearch = !query || [c.title, c.shortTitle, c.city, c.country, c.venue, c.category]
                    .some((value) => String(value || "").toLowerCase().includes(query));
                  const matchesTopic = categoryFilter === "All" || c.category === categoryFilter;
                  return matchesStatus && matchesSearch && matchesTopic;
                }
                if (activeMenu === "COMPLETED_CONFERENCES") {
                  const matchesStatus = isConferenceCompleted(c);
                  const query = searchTerm.trim().toLowerCase();
                  const matchesSearch = !query || [c.title, c.shortTitle, c.city, c.country, c.venue, c.category]
                    .some((value) => String(value || "").toLowerCase().includes(query));
                  const matchesTopic = categoryFilter === "All" || c.category === categoryFilter;
                  return matchesStatus && matchesSearch && matchesTopic;
                }
                return false;
              })
              .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (timeA !== timeB) return timeB - timeA;
                return String(b.id || "").localeCompare(String(a.id || ""));
              });

            const totalAdminPages = Math.max(1, Math.ceil(filteredAdminConferences.length / ADMIN_ITEMS_PER_PAGE));
            const paginatedAdminConferences = filteredAdminConferences.slice(
              (currentPage - 1) * ADMIN_ITEMS_PER_PAGE,
              currentPage * ADMIN_ITEMS_PER_PAGE
            );

            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#37494E]">
                      {activeMenu === "APPROVED_CONFERENCES" 
                        ? "Pending Conferences" 
                        : activeMenu === "MANAGE_CONFERENCES"
                        ? "Manage Conferences"
                        : "Completed Conferences"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeMenu === "APPROVED_CONFERENCES"
                        ? "Review pending conference submissions and approve or reject them."
                        : activeMenu === "MANAGE_CONFERENCES"
                        ? "Filter, search, activate, deactivate, feature, or delete published conferences."
                        : "View all completed conferences. Completed conferences cannot be edited. Select single or multiple items to delete them."}
                    </p>
                  </div>
                </div>

                {/* Filters & Bulk Operations Bar */}
                {(activeMenu === "MANAGE_CONFERENCES" || activeMenu === "COMPLETED_CONFERENCES") && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search title, city, country, topic..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#37494E]"
                        />
                      </div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        <option value="All">All Topics</option>
                        {categories.map((cat, idx) => (
                          <option key={`${cat.id}-${idx}`} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {activeMenu === "MANAGE_CONFERENCES" && selectedIds.length > 0 && (
                      <div className="flex items-center gap-2 bg-[#37494E] text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                        <span>{selectedIds.length} Selected</span>
                        <button
                          onClick={async () => {
                            const deleteCount = selectedIds.length;
                            if (confirm(`Are you sure you want to permanently delete ${deleteCount} selected conference(s)?`)) {
                              for (const id of selectedIds) {
                                await onDeleteConference?.(id);
                              }
                              setSelectedIds([]);
                              showToast(`Deleted ${deleteCount} selected conference(s).`);
                            } else {
                              showToast("Delete action cancelled.");
                            }
                          }}
                          className="px-2 py-1 bg-rose-500 hover:bg-rose-600 rounded text-[10px] cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete Selected
                        </button>
                      </div>
                    )}

                    {activeMenu === "COMPLETED_CONFERENCES" && (
                      <div className="flex items-center gap-2">
                        {selectedCompletedIds.length > 0 && (
                          <button
                            onClick={async () => {
                              const deleteCount = selectedCompletedIds.length;
                              if (confirm(`Are you sure you want to permanently delete ${deleteCount} completed conference(s)?`)) {
                                for (const id of selectedCompletedIds) {
                                  await onDeleteConference(id);
                                }
                                setSelectedCompletedIds([]);
                                showToast(`Deleted ${deleteCount} completed conference(s).`);
                              } else {
                                showToast("Delete action cancelled.");
                              }
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Selected ({selectedCompletedIds.length})
                          </button>
                        )}
                        {filteredAdminConferences.length > 0 && (
                          <button
                            onClick={async () => {
                              if (confirm(`Are you sure you want to permanently delete all ${filteredAdminConferences.length} completed conference(s)?`)) {
                                const allIds = filteredAdminConferences.map((c) => c.id);
                                for (const id of allIds) {
                                  await onDeleteConference(id);
                                }
                                setSelectedCompletedIds([]);
                                showToast(`Deleted all completed conferences.`);
                              } else {
                                showToast("Delete action cancelled.");
                              }
                            }}
                            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-rose-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete All
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                        {activeMenu === "MANAGE_CONFERENCES" && (
                          <th className="p-3 rounded-l-lg w-8">
                            <input
                              type="checkbox"
                              onChange={() => {
                                const filtered = conferences.filter((c) => c.status === ConferenceStatus.Approved && !isConferenceCompleted(c));
                                toggleSelectAll(filtered.map((f) => f.id));
                              }}
                              checked={selectedIds.length > 0}
                              className="cursor-pointer"
                            />
                          </th>
                        )}
                        {activeMenu === "COMPLETED_CONFERENCES" && (
                          <th className="p-3 rounded-l-lg w-8">
                            <input
                              type="checkbox"
                              onChange={() => {
                                const allCompleted = filteredAdminConferences.map((c) => c.id);
                                if (selectedCompletedIds.length === allCompleted.length) {
                                  setSelectedCompletedIds([]);
                                } else {
                                  setSelectedCompletedIds(allCompleted);
                                }
                              }}
                              checked={filteredAdminConferences.length > 0 && selectedCompletedIds.length === filteredAdminConferences.length}
                              className="cursor-pointer"
                            />
                          </th>
                        )}
                        <th className={`p-3 ${activeMenu === "APPROVED_CONFERENCES" ? "rounded-l-lg" : ""}`}>Conference Title</th>
                        <th className="p-3">Topics</th>
                        <th className="p-3">Location & Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right rounded-r-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAdminConferences.map((conf, confIdx) => {
                        const isDeactivated = Boolean(conf.isDeactivated) || inactiveConferences.includes(conf.id);
                        const isCompleted = isConferenceCompleted(conf);
                        return (
                          <tr key={conf.id ? `${conf.id}-${confIdx}` : `admin-conf-row-${confIdx}`} className="hover:bg-slate-50 transition-colors">
                            {activeMenu === "MANAGE_CONFERENCES" && (
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(conf.id)}
                                  onChange={() => toggleSelectOne(conf.id)}
                                  className="cursor-pointer"
                                />
                              </td>
                            )}
                            {activeMenu === "COMPLETED_CONFERENCES" && (
                              <td className="p-3">
                                <input
                                  type="checkbox"
                                  checked={selectedCompletedIds.includes(conf.id)}
                                  onChange={() => {
                                    if (selectedCompletedIds.includes(conf.id)) {
                                      setSelectedCompletedIds(selectedCompletedIds.filter((id) => id !== conf.id));
                                    } else {
                                      setSelectedCompletedIds([...selectedCompletedIds, conf.id]);
                                    }
                                  }}
                                  className="cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getCleanImageSrc(conf.bannerImage, "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80")}
                                  alt={conf.title}
                                  className="h-10 w-14 rounded-lg object-contain bg-slate-200 border border-slate-200 shrink-0 shadow-xs"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                                  }}
                                />
                                <div>
                                  {activeMenu === "MANAGE_CONFERENCES" ? (
                                    <a
                                      href={`/conference/${getConferenceSlug(conf, conferences)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline leading-snug break-words inline-flex items-center gap-1.5 group cursor-pointer transition-colors"
                                      title="Open live Conference Details in new tab"
                                    >
                                      <span>{conf.title}</span>
                                      <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="font-bold text-slate-900 leading-snug break-words">
                                      {conf.title}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-slate-700">{conf.category}</td>
                            <td className="p-3 text-slate-600">
                              {conf.city}, {conf.country}<br />
                              <span className="text-[10px] text-slate-400">{formatConferenceDate(conf.startDate)}</span>
                            </td>
                            <td className="p-3">
                              {isCompleted ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                                  Completed
                                </span>
                              ) : isDeactivated ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Deactivated
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  conf.status === ConferenceStatus.Approved ? "bg-emerald-100 text-emerald-700" :
                                  conf.status === ConferenceStatus.PendingReview ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                  {conf.status}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              {activeMenu === "COMPLETED_CONFERENCES" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setViewingConfDetails(conf)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                                    title="View completed conference details"
                                  >
                                    <Eye className="h-3 w-3" /> View
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to permanently delete completed conference "${conf.title}"?`)) {
                                        onDeleteConference(conf.id);
                                        showToast(`Deleted completed conference "${conf.title}".`);
                                      } else {
                                        showToast("Delete action cancelled.");
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-2xs"
                                    title="Delete completed conference"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              ) : activeMenu === "APPROVED_CONFERENCES" ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setViewingConfDetails(conf)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="h-3 w-3" /> View
                                  </button>

                                  <button
                                    onClick={() => {
                                      onApproveConference(conf.id);
                                      showToast("Conference approved!");
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer transition-colors"
                                    title="Approve conference"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => {
                                      const reason = prompt("Enter rejection reason:", "Submission parameters non-compliant");
                                      if (reason) {
                                        onRejectConference(conf.id, reason);
                                        showToast("Conference rejected.");
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[11px] cursor-pointer transition-colors"
                                    title="Reject conference"
                                  >
                                    Reject
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete "${conf.title}"?`)) {
                                        onDeleteConference(conf.id);
                                        showToast("Conference deleted.");
                                      }
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer transition-colors"
                                    title="Delete conference"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setViewingConfDetails(conf)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                                    title="View details"
                                  >
                                    <Eye className="h-3 w-3" /> View
                                  </button>

                                  {conf.status !== ConferenceStatus.Approved && (
                                    <button
                                      onClick={() => {
                                        onApproveConference(conf.id);
                                        showToast("Conference approved!");
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer transition-colors"
                                      title="Approve conference"
                                    >
                                      Approve
                                    </button>
                                  )}

                                  <button
                                    onClick={async () => {
                                      if (onToggleConferenceActive) {
                                        const result = await onToggleConferenceActive(conf.id);
                                        showToast(
                                          result.success
                                            ? (result.isActive ? "Conference activated!" : "Conference deactivated and disabled!")
                                            : (result.error || "Unable to update conference status.")
                                        );
                                      } else {
                                        if (isDeactivated) {
                                          setInactiveConferences(inactiveConferences.filter(id => id !== conf.id));
                                        } else {
                                          setInactiveConferences([...inactiveConferences, conf.id]);
                                        }
                                        showToast(isDeactivated ? "Conference activated!" : "Conference deactivated and disabled!");
                                      }
                                    }}
                                    className={`px-2.5 py-1 font-bold rounded text-[11px] cursor-pointer transition-colors ${
                                      isDeactivated ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                    }`}
                                  >
                                    {isDeactivated ? "Activate" : "Deactivate"}
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete "${conf.title}"?`)) {
                                        onDeleteConference(conf.id);
                                        showToast("Conference deleted.");
                                      }
                                    }}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer transition-colors"
                                    title="Delete conference"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
                  <div>
                    Showing {filteredAdminConferences.length === 0 ? 0 : (currentPage - 1) * ADMIN_ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ADMIN_ITEMS_PER_PAGE, filteredAdminConferences.length)} of {filteredAdminConferences.length} conferences
                  </div>
                  {totalAdminPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2 font-bold text-slate-800">
                        Page {currentPage} of {totalAdminPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalAdminPages, p + 1))}
                        disabled={currentPage >= totalAdminPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* SECTION 3C: EVENT FORM */}
          {activeMenu === "EVENT_FORM" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-[#37494E]">
                  Create New Conference Event
                </h3>
                <p className="text-xs text-slate-500">Fill in event parameters to publish directly to the global directory.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const todayStr = new Date().toISOString().split("T")[0];
                  if (eventFormState.startDate && eventFormState.startDate < todayStr) {
                    showToast("Start date cannot be in the past.");
                    return;
                  }
                  if (eventFormState.endDate && eventFormState.endDate < (eventFormState.startDate || todayStr)) {
                    showToast("End date cannot be prior to start date or today.");
                    return;
                  }
                  if (onSubmitConference) {
                    onSubmitConference({
                      ...eventFormState,
                      bannerImage: eventFormState.bannerImage?.trim() ? eventFormState.bannerImage.trim() : DEFAULT_CONFERENCE_IMAGE,
                      id: `conf-${Date.now()}`,
                      status: ConferenceStatus.Approved
                    });
                  }
                  showToast("Conference event saved & published!");
                  setActiveMenu("MANAGE_CONFERENCES");
                }}
                className="space-y-4 text-xs font-medium"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Full Conference Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 15th International Conference on Artificial Intelligence"
                      value={eventFormState.title || ""}
                      onChange={(e) => setEventFormState({ ...eventFormState, title: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Short Acronym / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. ICAI 2026"
                      value={eventFormState.shortTitle || ""}
                      onChange={(e) => setEventFormState({ ...eventFormState, shortTitle: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Topic *</label>
                    <select
                      value={eventFormState.category || ""}
                      onChange={(e) => setEventFormState({ ...eventFormState, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    >
                      {categories.map((cat, idx) => (
                        <option key={`${cat.id}-${idx}`} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Organizer *</label>
                    <select
                      value={eventFormState.organizerId || ""}
                      onChange={(e) => setEventFormState({ ...eventFormState, organizerId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    >
                      {organizers.map((org, orgIdx) => (
                        <option key={org.id ? `${org.id}-${orgIdx}` : `org-opt-${orgIdx}`} value={org.id}>{org.organizationName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Start Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={eventFormState.startDate || ""}
                      onChange={(e) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        if (e.target.value && e.target.value < todayStr) {
                          showToast("Past dates cannot be selected.");
                          setEventFormState({ ...eventFormState, startDate: todayStr });
                        } else {
                          setEventFormState({ ...eventFormState, startDate: e.target.value });
                        }
                      }}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">End Date *</label>
                    <input
                      type="date"
                      required
                      min={eventFormState.startDate || new Date().toISOString().split("T")[0]}
                      value={eventFormState.endDate || ""}
                      onChange={(e) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const minVal = eventFormState.startDate || todayStr;
                        if (e.target.value && e.target.value < minVal) {
                          showToast("End date cannot be in the past or prior to start date.");
                          setEventFormState({ ...eventFormState, endDate: minVal });
                        } else {
                          setEventFormState({ ...eventFormState, endDate: e.target.value });
                        }
                      }}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Country *</label>
                    <select
                      value={eventFormState.country || ""}
                      onChange={(e) => {
                        const newC = e.target.value;
                        const matchingCities = citiesList
                          .filter((ct) => ct.country.trim().toLowerCase() === newC.trim().toLowerCase())
                          .map((ct) => ct.name);
                        setEventFormState({ ...eventFormState, country: newC, city: matchingCities[0] || "" });
                      }}
                      className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                    >
                      <option value="">Select Country</option>
                      {countriesList.map((c, cIdx) => (
                        <option key={`${c}-${cIdx}`} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">City *</label>
                    <select
                      required
                      disabled={!eventFormState.country}
                      value={eventFormState.city || ""}
                      onChange={(e) => setEventFormState({ ...eventFormState, city: e.target.value })}
                      className={`w-full border rounded-xl p-2.5 focus:outline-none focus:border-[#37494E] ${
                        !eventFormState.country ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-slate-800"
                      }`}
                    >
                      <option value="">{eventFormState.country ? "Select City" : "Select Country First"}</option>
                      {citiesList
                        .filter((ct) => ct.country.trim().toLowerCase() === (eventFormState.country || "").trim().toLowerCase())
                        .map((ct, ctIdx) => (
                          <option key={`${ct.name}-${ctIdx}`} value={ct.name}>{ct.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <ImageUploaderField
                  label="Conference Banner Image"
                  value={eventFormState.bannerImage || ""}
                  onChange={(val) => setEventFormState({ ...eventFormState, bannerImage: val })}
                  placeholder="Paste banner image URL (https://...)"
                  aspectHint="Landscape banner (1200x500px recommended)"
                />

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@conference.org"
                    value={eventFormState.contactEmail || ""}
                    onChange={(e) => setEventFormState({ ...eventFormState, contactEmail: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Venue Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Boston Convention & Exhibition Center"
                    value={eventFormState.venue || ""}
                    onChange={(e) => setEventFormState({ ...eventFormState, venue: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Description / Call for Papers *</label>
                  <textarea
                    rows={4}
                    required
                    value={eventFormState.description || ""}
                    onChange={(e) => setEventFormState({ ...eventFormState, description: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-[#37494E]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveMenu("MANAGE_CONFERENCES")}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#37494E] hover:bg-[#2b3a3e] text-white font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    Save & Publish Event
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: MEDIA PARTNERS & ASSOCIATES */}
          {activeMenu === "MANAGE_MEDIA_PARTNERS" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E]">Manage Media Partners</h3>
                  <p className="text-xs text-slate-500">
                    Review submitted media partners, approve pending requests, or deactivate/delete existing listings.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {mediaPartners.length} Partners
                  </span>
                  {mediaPartners.filter((m) => m.status === "Pending").length > 0 && (
                    <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      {mediaPartners.filter((m) => m.status === "Pending").length} Pending
                    </span>
                  )}
                </div>
              </div>

              {mediaPartners.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Globe className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Media Partners Submitted</p>
                  <p className="text-xs text-slate-400 mt-1">Submitted media partners will appear here for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mediaPartners.map((mp, mpIdx) => (
                    <div
                      key={mp.id || `mp-${mpIdx}`}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header: Logo, Name, Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={mp.logo || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=120&h=120&q=80"}
                              alt={mp.name}
                              className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-slate-50 shrink-0 p-0.5"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 break-words" title={mp.name}>{mp.name}</h4>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              mp.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : mp.status === "Pending"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {mp.status}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-line">
                            {mp.description || "Submitted media partner providing press coverage, journal indexation, and event distribution."}
                          </p>
                        </div>

                        {/* Submitted Details */}
                        <div className="space-y-1.5 text-xs">
                          {mp.website && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <a
                                href={mp.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate font-medium flex items-center gap-1"
                              >
                                {mp.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}
                          {mp.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{mp.email}</span>
                            </div>
                          )}
                          {mp.submittedAt && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Submitted: {mp.submittedAt}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        {mp.status === "Pending" && (
                          <button
                            onClick={async () => {
                              const updated = mediaPartners.map((m) => {
                                const isTarget = (m.id && mp.id) ? m.id === mp.id : m.name === mp.name;
                                return isTarget ? { ...m, status: "Approved" } : m;
                              });
                              setMediaPartners(updated);
                              await saveToSupabase("media_partners", updated);
                              triggerBroadcastSync();
                              showToast("Media Partner approved!");
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                          >
                            Approve
                          </button>
                        )}

                        {mp.status === "Approved" && (
                          <button
                            onClick={async () => {
                              const updated = mediaPartners.map((m) => {
                                const isTarget = (m.id && mp.id) ? m.id === mp.id : m.name === mp.name;
                                return isTarget ? { ...m, status: "Deactivated" } : m;
                              });
                              setMediaPartners(updated);
                              await saveToSupabase("media_partners", updated);
                              triggerBroadcastSync();
                              showToast("Media Partner deactivated.");
                            }}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Deactivate
                          </button>
                        )}

                        {mp.status === "Deactivated" && (
                          <button
                            onClick={async () => {
                              const updated = mediaPartners.map((m) => {
                                const isTarget = (m.id && mp.id) ? m.id === mp.id : m.name === mp.name;
                                return isTarget ? { ...m, status: "Approved" } : m;
                              });
                              setMediaPartners(updated);
                              await saveToSupabase("media_partners", updated);
                              triggerBroadcastSync();
                              showToast("Media Partner activated!");
                            }}
                            className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Activate
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to permanently delete media partner "${mp.name}"?`)) {
                              const targetId = mp.id;
                              if (mp.logo) {
                                const info = extractStoragePathFromUrl(mp.logo);
                                if (info) {
                                  try {
                                    const client = getSupabaseClient();
                                    if (client) await client.storage.from(info.bucket).remove([info.path]);
                                  } catch (e) {}
                                }
                              }
                              const updated = mediaPartners.filter((m) => {
                                if (targetId && m.id) return m.id !== targetId;
                                return m.name !== mp.name;
                              });
                              setMediaPartners(updated);
                              if (targetId) {
                                await deleteFromSupabase("media_partners", targetId);
                              }
                              await saveToSupabase("media_partners", updated);
                              triggerBroadcastSync();
                              showToast("Media Partner deleted.");
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === "MANAGE_ASSOCIATES" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E]">Manage Our Associates</h3>
                  <p className="text-xs text-slate-500">
                    Review submitted associates, control scientific councils, research boards, and academic affiliations.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {associates.length} Associates
                  </span>
                  {associates.filter((a) => a.status === "Pending").length > 0 && (
                    <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      {associates.filter((a) => a.status === "Pending").length} Pending
                    </span>
                  )}
                </div>
              </div>

              {associates.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Building className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Associates Submitted</p>
                  <p className="text-xs text-slate-400 mt-1">Submitted associates will appear here for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {associates.map((assoc, assocIdx) => (
                    <div
                      key={assoc.id || `assoc-${assocIdx}`}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Header: Logo, Name, Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={assoc.logo || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&h=120&q=80"}
                              alt={assoc.name}
                              className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-slate-50 shrink-0 p-0.5"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 break-words" title={assoc.name}>{assoc.name}</h4>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              assoc.status === "Approved"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : assoc.status === "Pending"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {assoc.status}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-line">
                            {assoc.description || "Submitted scientific association partner providing academic governance, peer networking, and audit oversight."}
                          </p>
                        </div>

                        {/* Submitted Details */}
                        <div className="space-y-1.5 text-xs">
                          {assoc.website && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <a
                                href={assoc.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline truncate font-medium flex items-center gap-1"
                              >
                                {assoc.website.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}
                          {assoc.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{assoc.email}</span>
                            </div>
                          )}
                          {assoc.submittedAt && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>Submitted: {assoc.submittedAt}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        {assoc.status === "Pending" && (
                          <button
                            onClick={async () => {
                              const updated = associates.map((a) => {
                                const isTarget = (a.id && assoc.id) ? a.id === assoc.id : a.name === assoc.name;
                                return isTarget ? { ...a, status: "Approved" } : a;
                              });
                              setAssociates(updated);
                              await saveToSupabase("associates", updated);
                              triggerBroadcastSync();
                              showToast("Associate approved!");
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                          >
                            Approve
                          </button>
                        )}

                        {assoc.status === "Approved" && (
                          <button
                            onClick={async () => {
                              const updated = associates.map((a) => {
                                const isTarget = (a.id && assoc.id) ? a.id === assoc.id : a.name === assoc.name;
                                return isTarget ? { ...a, status: "Deactivated" } : a;
                              });
                              setAssociates(updated);
                              await saveToSupabase("associates", updated);
                              triggerBroadcastSync();
                              showToast("Associate deactivated.");
                            }}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Deactivate
                          </button>
                        )}

                        {assoc.status === "Deactivated" && (
                          <button
                            onClick={async () => {
                              const updated = associates.map((a) => {
                                const isTarget = (a.id && assoc.id) ? a.id === assoc.id : a.name === assoc.name;
                                return isTarget ? { ...a, status: "Approved" } : a;
                              });
                              setAssociates(updated);
                              await saveToSupabase("associates", updated);
                              triggerBroadcastSync();
                              showToast("Associate activated!");
                            }}
                            className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Activate
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to permanently delete associate "${assoc.name}"?`)) {
                              const targetId = assoc.id;
                              if (assoc.logo) {
                                const info = extractStoragePathFromUrl(assoc.logo);
                                if (info) {
                                  try {
                                    const client = getSupabaseClient();
                                    if (client) await client.storage.from(info.bucket).remove([info.path]);
                                  } catch (e) {}
                                }
                              }
                              const updated = associates.filter((a) => {
                                if (targetId && a.id) return a.id !== targetId;
                                return a.name !== assoc.name;
                              });
                              setAssociates(updated);
                              if (targetId) {
                                await deleteFromSupabase("associates", targetId);
                              }
                              await saveToSupabase("associates", updated);
                              triggerBroadcastSync();
                              showToast("Associate deleted.");
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: HOME - BANNERS & BANNER MANAGEMENT */}
          {(activeMenu === "ADD_BANNER" || activeMenu === "MANAGE_BANNERS") && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#37494E] flex items-center gap-2">
                    <Image className="h-5 w-5 text-blue-600" />
                    <span>Banner Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add hero banners, set display order Place (1, 2, 3...), edit title & description, and control active/inactive visibility on the website.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {banners.length}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    Active: {banners.filter((b) => b.status === "Active" || !b.status).length}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                    Inactive: {banners.filter((b) => b.status === "Inactive" || b.status === "Deactivated").length}
                  </span>
                  <button
                    onClick={() => setShowAddBannerForm(!showAddBannerForm)}
                    className="px-4 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ml-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{showAddBannerForm ? "Close Form" : "Add Banner"}</span>
                  </button>
                </div>
              </div>

              {/* Add Banner Form (toggled via button or activeMenu === 'ADD_BANNER') */}
              {(showAddBannerForm || activeMenu === "ADD_BANNER") && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newBannerTitleText.trim()) {
                      showToast("Please enter a banner title.");
                      return;
                    }
                    if (!newBannerDescText.trim()) {
                      showToast("Please enter a banner description.");
                      return;
                    }
                    if (newBannerTitleText.trim().length > 50) {
                      showToast("Banner title must be 50 characters or fewer.");
                      return;
                    }
                    if (newBannerDescText.trim().length > 100) {
                      showToast("Banner description must be 100 characters or fewer.");
                      return;
                    }

                    const bannerId = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    let bannerImg = newBannerImage.trim() || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
                    let uploadedStoragePath = "";

                    if (bannerImg.startsWith("data:")) {
                      const uploadRes = await uploadBannerImageToSupabase(bannerImg, bannerId);
                      if (uploadRes && uploadRes.publicUrl) {
                        bannerImg = uploadRes.publicUrl;
                        uploadedStoragePath = uploadRes.storagePath;
                      }
                    }

                    const assignedPlace = newBannerOrder !== "" ? Number(newBannerOrder) : banners.length + 1;
                    const newB: Banner = {
                      id: bannerId,
                      image: bannerImg,
                      image_url: bannerImg,
                      title: newBannerTitleText.trim(),
                      description: newBannerDescText.trim(),
                      content: newBannerDescText.trim(),
                      order: assignedPlace,
                      place: assignedPlace,
                      status: newBannerStatus,
                      active: newBannerStatus === "Active"
                    };

                    const updated = [newB, ...banners];
                    const deduplicated = Array.from(new Map(updated.map((b) => [b.id, b])).values());
                    
                    const saveOk = await saveToSupabase("banners", deduplicated);
                    if (!saveOk) {
                      if (uploadedStoragePath) {
                        await deleteBannerImageFromSupabase(uploadedStoragePath);
                      }
                      showToast("Failed to save banner to Supabase database. Please try again.");
                      return;
                    }

                    onUpdateBanners(deduplicated);
                    safeSetLocalStorage("gch_banners", deduplicated);
                    triggerBroadcastSync();

                    try {
                      const fresh = await fetchFromSupabase<Banner[]>("banners");
                      if (fresh && Array.isArray(fresh) && fresh.length > 0) {
                        onUpdateBanners(fresh);
                        safeSetLocalStorage("gch_banners", fresh);
                      }
                    } catch (err) {}

                    // Reset form fields
                    setNewBannerImage("");
                    setNewBannerTitleText("");
                    setNewBannerDescText("");
                    setNewBannerOrder("");
                    setNewBannerStatus("Active");
                    setShowAddBannerForm(false);
                    showToast("New banner added and saved to Supabase successfully!");
                    if (activeMenu === "ADD_BANNER") setActiveMenu("MANAGE_BANNERS");
                  }}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs animate-fadeIn shadow-inner"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <h4 className="font-bold text-sm text-[#37494E] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-blue-600" />
                      <span>Add & Configure New Banner</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      Hero Banner Section
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Banner Image Input & File Upload */}
                    <ImageUploaderField
                      label="Banner Image"
                      value={newBannerImage}
                      onChange={setNewBannerImage}
                      placeholder="Paste image URL (https://...)"
                      aspectHint="Landscape banner (1200x500px recommended)"
                      maxWidth={1000}
                      maxHeight={500}
                      quality={0.75}
                      className="md:col-span-2"
                    />


                      {/* Quick Sample Presets */}
                      <div className="md:col-span-2 pt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium">Sample Banner Presets:</span>
                        {[
                          { name: "Academic Hall", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80" },
                          { name: "Keynote Speaker", url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=2000&q=80" },
                          { name: "Research Forum", url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2000&q=80" },
                          { name: "Tech Summit", url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=2000&q=80" },
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setNewBannerImage(preset.url)}
                            className="text-[10px] px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-medium cursor-pointer transition-colors"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>

                    {/* Banner Title */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700 block">Banner Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Premier Academic Summits & Keynote Conferences 2026"
                        value={newBannerTitleText}
                        onChange={(e) => setNewBannerTitleText(e.target.value)}
                        maxLength={50}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                      />
                      <p className="text-[10px] text-right text-slate-400">{newBannerTitleText.length}/50 characters</p>
                    </div>

                    {/* Banner Description */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="font-bold text-slate-700 block">Banner Description *</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Discover vetted international academic conferences, submit research papers, and connect with peer-reviewed scientific councils worldwide."
                        value={newBannerDescText}
                        onChange={(e) => setNewBannerDescText(e.target.value)}
                        maxLength={100}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-[10px] text-right text-slate-400">{newBannerDescText.length}/100 characters</p>
                    </div>

                    {/* Position / Order Place */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Display Position / Place *</label>
                      <select
                        value={newBannerOrder !== "" ? newBannerOrder : banners.length + 1}
                        onChange={(e) => setNewBannerOrder(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((placeNum) => (
                          <option key={placeNum} value={placeNum}>
                            Place {placeNum} {placeNum === 1 ? "(First Slide on Homepage)" : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">Determines the display order (Place 1 appears first, Place 2 second, etc.)</p>
                    </div>

                    {/* Banner Status */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Initial Status *</label>
                      <select
                        value={newBannerStatus}
                        onChange={(e) => setNewBannerStatus(e.target.value as "Active" | "Inactive")}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                      >
                        <option value="Active">Active (Visible on User Portal)</option>
                        <option value="Inactive">Inactive (Hidden from Website)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">Only Active banners will appear in the Hero Banner section.</p>
                    </div>
                  </div>

                  {/* Live Banner Slide Card Preview */}
                  {newBannerImage && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <label className="font-bold text-slate-600 text-[11px] block flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Homepage Banner Slide Preview:</span>
                      </label>
                      <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-md">
                        <img
                          src={newBannerImage}
                          alt="Banner Preview"
                          className="w-full h-full object-contain opacity-80"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent" />
                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-white text-[10px] font-extrabold">
                          Place {newBannerOrder !== "" ? newBannerOrder : banners.length + 1}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                          <h4 className="font-extrabold text-base leading-snug break-words">
                            {newBannerTitleText || "Your Banner Title"}
                          </h4>
                          <p className="text-xs text-slate-200 max-w-lg break-words">
                            {newBannerDescText || "Your banner description text will appear here on the homepage hero section."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBannerForm(false);
                        setNewBannerImage("");
                        setNewBannerTitleText("");
                        setNewBannerDescText("");
                        setNewBannerOrder("");
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Banner</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Banner Modal */}
              {editingBanner && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-base text-[#37494E] flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-blue-600" />
                        <span>Edit Banner Details</span>
                      </h4>
                      <button
                        onClick={() => setEditingBanner(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      <ImageUploaderField
                        label="Banner Image"
                        value={editingBanner.image || ""}
                        onChange={(val) => setEditingBanner({ ...editingBanner, image: val })}
                        placeholder="Paste image URL (https://...)"
                        aspectHint="Landscape banner (1200x500px recommended)"
                        maxWidth={1000}
                        maxHeight={500}
                        quality={0.75}
                      />

                      {/* Image Preview */}
                      {editingBanner.image && (
                        <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                          <img
                            src={editingBanner.image}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Title Tagline */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 block">Banner Title *</label>
                        <input
                          type="text"
                          value={editingBanner.title || ""}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          maxLength={50}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                          placeholder="Banner title"
                        />
                        <p className="text-[10px] text-right text-slate-400">{(editingBanner.title || "").length}/50 characters</p>
                      </div>

                      {/* Banner Description */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 block">Banner Description *</label>
                        <textarea
                          rows={3}
                          value={editingBanner.description || (editingBanner as any).content || ""}
                          onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value, content: e.target.value })}
                          maxLength={100}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Banner description text for hero section"
                        />
                        <p className="text-[10px] text-right text-slate-400">{(editingBanner.description || (editingBanner as any).content || "").length}/100 characters</p>
                      </div>

                      {/* Position Place & Status */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700 block">Display Position / Place</label>
                          <select
                            value={editingBanner.order ?? (editingBanner as any).place ?? 1}
                            onChange={(e) => setEditingBanner({ ...editingBanner, order: Number(e.target.value), place: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <option key={num} value={num}>Place {num}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-700 block">Status</label>
                          <select
                            value={editingBanner.status === "Inactive" || editingBanner.status === "Deactivated" ? "Inactive" : "Active"}
                            onChange={(e) => setEditingBanner({ ...editingBanner, status: e.target.value as Banner["status"] })}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                          >
                            <option value="Active">Active (Visible)</option>
                            <option value="Inactive">Inactive (Hidden)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingBanner(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingBanner) return;
                          const desc = (editingBanner.description || (editingBanner as any).content || "").trim();
                          const title = (editingBanner.title || "").trim();
                          if (!title) {
                            showToast("Please enter a banner title.");
                            return;
                          }
                          if (!desc) {
                            showToast("Please enter a banner description.");
                            return;
                          }
                          if (title.length > 50) {
                            showToast("Banner title must be 50 characters or fewer.");
                            return;
                          }
                          if (desc.length > 100) {
                            showToast("Banner description must be 100 characters or fewer.");
                            return;
                          }
                          let img = editingBanner.image || (editingBanner as any).image_url || "";
                          let uploadedStoragePath = "";

                          if (img.startsWith("data:")) {
                            const uploadRes = await uploadBannerImageToSupabase(img, String(editingBanner.id));
                            if (uploadRes && uploadRes.publicUrl) {
                              img = uploadRes.publicUrl;
                              uploadedStoragePath = uploadRes.storagePath;
                            }
                          }

                          const ord = Number(editingBanner.order) || Number((editingBanner as any).place) || 1;
                          const normalizedEdit: Banner = {
                            ...editingBanner,
                            id: String(editingBanner.id),
                            title,
                            description: desc,
                            content: desc,
                            image: img,
                            image_url: img,
                            order: ord,
                            place: ord,
                            status: editingBanner.status || "Active",
                            active: (editingBanner.status || "Active") === "Active"
                          };
                          const updated = banners.map((b) => (String(b.id) === String(editingBanner.id) ? normalizedEdit : b));
                          const deduplicated = Array.from(new Map(updated.map((b) => [b.id, b])).values());
                          
                          const saveOk = await saveToSupabase("banners", deduplicated);
                          if (!saveOk) {
                            if (uploadedStoragePath) {
                              await deleteBannerImageFromSupabase(uploadedStoragePath);
                            }
                            showToast("Failed to update banner in Supabase.");
                            return;
                          }

                          onUpdateBanners(deduplicated);
                          safeSetLocalStorage("gch_banners", deduplicated);
                          triggerBroadcastSync();

                          try {
                            const fresh = await fetchFromSupabase<Banner[]>("banners");
                            if (fresh && Array.isArray(fresh) && fresh.length > 0) {
                              onUpdateBanners(fresh);
                              safeSetLocalStorage("gch_banners", fresh);
                            }
                          } catch (e) {}

                          setEditingBanner(null);
                          showToast("Banner updated successfully!");
                        }}
                        className="px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Associate Modal */}
              {editingAssociate && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-base text-[#37494E] flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-blue-600" />
                        <span>Edit Our Associate</span>
                      </h4>
                      <button
                        onClick={() => setEditingAssociate(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Organization / Associate Name</label>
                        <input
                          type="text"
                          value={editingAssociate.name || ""}
                          onChange={(e) => setEditingAssociate({ ...editingAssociate, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="e.g., Global Research Affiliation"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={editingAssociate.title || ""}
                            onChange={(e) => setEditingAssociate({ ...editingAssociate, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="Academic & Scientific Associate"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Status</label>
                          <select
                            value={editingAssociate.status}
                            onChange={(e) => setEditingAssociate({ ...editingAssociate, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Deactivated">Deactivated</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={editingAssociate.description || ""}
                          onChange={(e) => setEditingAssociate({ ...editingAssociate, description: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="Brief description of the association or partnership..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Website URL</label>
                          <input
                            type="text"
                            value={editingAssociate.website || ""}
                            onChange={(e) => setEditingAssociate({ ...editingAssociate, website: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="https://example.org"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editingAssociate.email || ""}
                            onChange={(e) => setEditingAssociate({ ...editingAssociate, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="contact@example.org"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Logo URL</label>
                        <input
                          type="text"
                          value={editingAssociate.logo || ""}
                          onChange={(e) => setEditingAssociate({ ...editingAssociate, logo: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingAssociate(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingAssociate) return;
                          const updated = associates.map((a) => {
                            const isTarget = (a.id && editingAssociate.id) ? a.id === editingAssociate.id : a.name === editingAssociate.name;
                            return isTarget ? editingAssociate : a;
                          });
                          setAssociates(updated);
                          await saveToSupabase("associates", updated);
                          triggerBroadcastSync();
                          setEditingAssociate(null);
                          showToast("Associate updated successfully!");
                        }}
                        className="px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Media Partner Modal */}
              {editingPartner && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-base text-[#37494E] flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-blue-600" />
                        <span>Edit Media Partner</span>
                      </h4>
                      <button
                        onClick={() => setEditingPartner(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Partner Name</label>
                        <input
                          type="text"
                          value={editingPartner.name || ""}
                          onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="e.g., Global Science Press"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={editingPartner.title || ""}
                            onChange={(e) => setEditingPartner({ ...editingPartner, title: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="Media Distribution Partner"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Status</label>
                          <select
                            value={editingPartner.status}
                            onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Deactivated">Deactivated</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={editingPartner.description || ""}
                          onChange={(e) => setEditingPartner({ ...editingPartner, description: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="Brief description of media partnership..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Website URL</label>
                          <input
                            type="text"
                            value={editingPartner.website || ""}
                            onChange={(e) => setEditingPartner({ ...editingPartner, website: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="https://example.com"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editingPartner.email || ""}
                            onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                            placeholder="contact@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Logo URL</label>
                        <input
                          type="text"
                          value={editingPartner.logo || ""}
                          onChange={(e) => setEditingPartner({ ...editingPartner, logo: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#37494E] focus:outline-hidden"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingPartner(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingPartner) return;
                          const updated = mediaPartners.map((m) => {
                            const isTarget = (m.id && editingPartner.id) ? m.id === editingPartner.id : m.name === editingPartner.name;
                            return isTarget ? editingPartner : m;
                          });
                          setMediaPartners(updated);
                          await saveToSupabase("media_partners", updated);
                          triggerBroadcastSync();
                          setEditingPartner(null);
                          showToast("Media Partner updated successfully!");
                        }}
                        className="px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBannerStatusFilter("All")}
                    className={`px-3.5 py-1.5 font-bold text-xs rounded-xl cursor-pointer transition-all ${
                      bannerStatusFilter === "All"
                        ? "bg-[#37494E] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({banners.length})
                  </button>
                  <button
                    onClick={() => setBannerStatusFilter("Active")}
                    className={`px-3.5 py-1.5 font-bold text-xs rounded-xl cursor-pointer transition-all ${
                      bannerStatusFilter === "Active"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Active ({banners.filter((b) => b.status === "Active" || !b.status).length})
                  </button>
                  <button
                    onClick={() => setBannerStatusFilter("Inactive")}
                    className={`px-3.5 py-1.5 font-bold text-xs rounded-xl cursor-pointer transition-all ${
                      bannerStatusFilter === "Inactive"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Inactive ({banners.filter((b) => b.status === "Inactive" || b.status === "Deactivated").length})
                  </button>
                </div>

                <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                  Sorted by Place (Display Order)
                </span>
              </div>

              {/* Banners Cards Display (Sorted by Place Number) */}
              {banners.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Globe className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Banners Added</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Banner" to upload your first homepage banner.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...banners]
                    .filter((b) => {
                      if (bannerStatusFilter === "Active") return b.status === "Active" || !b.status;
                      if (bannerStatusFilter === "Inactive") return b.status === "Inactive" || b.status === "Deactivated";
                      return true;
                    })
                    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999))
                    .map((b) => {
                      const isInactive = b.status === "Deactivated" || b.status === "Inactive";
                      return (
                        <div
                          key={b.id}
                          className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                            isInactive ? "border-slate-200 bg-slate-50/80 opacity-80" : "border-slate-200"
                          }`}
                        >
                          <div>
                            {/* Banner Image & Top Badges */}
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <img
                                src={b.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"}
                                alt={b.title || "Banner"}
                                className={`w-full h-full object-contain transition-transform duration-300 ${isInactive ? "grayscale opacity-75" : ""}`}
                              />
                              <div className="absolute top-3 left-3 flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-white font-extrabold text-[11px] rounded-lg border border-white/20 shadow-xs flex items-center gap-1">
                                  <span>Place {b.order ?? 1}</span>
                                </span>
                              </div>
                              <div className="absolute top-3 right-3">
                                <span
                                  className={`px-2.5 py-1 font-extrabold text-[10px] rounded-full shadow-xs border ${
                                    !isInactive
                                      ? "bg-emerald-500 text-white border-emerald-400"
                                      : "bg-slate-700 text-slate-200 border-slate-600"
                                  }`}
                                >
                                  {!isInactive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>

                            {/* Banner Info */}
                            <div className="p-4 space-y-2">
                              <div>
                                <h4 className="font-bold text-sm text-[#37494E] break-words">
                                  {b.title || "Homepage Hero Banner"}
                                </h4>
                                {(b.description || (b as any).content) && (
                                  <p className="text-xs text-slate-600 mt-1 break-words">
                                    {b.description || (b as any).content}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                                <span className="flex items-center gap-1 font-medium">
                                  {!isInactive ? (
                                    <span className="text-emerald-600 font-bold">✓ Active on User Portal</span>
                                  ) : (
                                    <span className="text-slate-400">Hidden from User Portal</span>
                                  )}
                                </span>

                                {/* Quick Place re-order dropdown directly on card */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-bold text-slate-500">Place:</span>
                                  <select
                                    value={b.order ?? 1}
                                    onChange={async (e) => {
                                      const newPlace = Number(e.target.value);
                                      const updated = banners.map((item) =>
                                        item.id === b.id ? { ...item, order: newPlace } : item
                                      );
                                      const deduplicated = Array.from(new Map(updated.map((item) => [item.id, item])).values());
                                      onUpdateBanners(deduplicated);
                                      safeSetLocalStorage("gch_banners", deduplicated);
                                      await saveToSupabase("banners", deduplicated);
                                      triggerBroadcastSync();
                                      showToast(`Set to Place ${newPlace}`);
                                    }}
                                    className="bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] rounded-lg px-1.5 py-0.5 focus:outline-none cursor-pointer"
                                  >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                      <option key={num} value={num}>{num}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions Section - Edit, Toggle Active/Inactive, Delete */}
                          <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-1.5">
                            <button
                              onClick={() => setEditingBanner(b)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Edit Banner"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={async () => {
                                const newStatus = isInactive ? "Active" : "Inactive";
                                const updated: Banner[] = banners.map((item) => {
                                  if (item.id === b.id) {
                                    return { ...item, status: newStatus as Banner["status"] };
                                  }
                                  return item;
                                });
                                const deduplicated = Array.from(new Map(updated.map((item) => [item.id, item])).values());
                                onUpdateBanners(deduplicated);
                                safeSetLocalStorage("gch_banners", deduplicated);
                                await saveToSupabase("banners", deduplicated);
                                triggerBroadcastSync();
                                showToast(newStatus === "Active" ? "Banner activated!" : "Banner set to inactive.");
                              }}
                              className={`px-2.5 py-1.5 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                                !isInactive
                                  ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                              }`}
                              title={!isInactive ? "Deactivate Banner" : "Activate Banner"}
                            >
                              {!isInactive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              <span>{!isInactive ? "Deactivate" : "Activate"}</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete banner "${b.title || "Untitled banner"}"?`)) {
                                  const targetId = String(b.id);
                                  const bannerImg = b.image || (b as any).image_url;
                                  if (bannerImg) {
                                    const info = extractStoragePathFromUrl(bannerImg);
                                    if (info) {
                                      try {
                                        const client = getSupabaseClient();
                                        if (client) await client.storage.from(info.bucket).remove([info.path]);
                                      } catch (e) {}
                                    }
                                  }
                                  const updated = banners.filter((item) => String(item.id) !== targetId);
                                  const deduplicated = Array.from(new Map(updated.map((item) => [item.id, item])).values());
                                  onUpdateBanners(deduplicated);
                                  safeSetLocalStorage("gch_banners", deduplicated);
                                  await deleteFromSupabase("banners", targetId);
                                  await saveToSupabase("banners", deduplicated);
                                  triggerBroadcastSync();
                                  showToast("Banner deleted.");
                                }
                              }}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                              title="Delete Banner"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: LOCATION MANAGEMENT (Countries & Cities) */}
          {(activeMenu === "ADD_COUNTRY" || activeMenu === "MANAGE_COUNTRIES" || activeMenu === "ADD_CITY" || activeMenu === "MANAGE_CITIES") && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#37494E]">Location Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage countries and cities. Expand any country to view, add, edit, or deactivate cities under it.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    {countriesList.length} Countries • {citiesList.length} Cities
                  </span>

                  {/* Bulk Upload Excel File Input */}
                  <input
                    type="file"
                    id="location-excel-upload"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="location-excel-upload"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Bulk upload countries and cities via Excel (.xlsx, .xls, .csv)"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Upload Excel</span>
                  </label>

                  {/* Download Demo Excel File */}
                  <button
                    onClick={downloadDemoExcel}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                    title="Download demo sample Excel template for bulk upload"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Demo Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingCountryIdx(null);
                      setNewCountryName("");
                      setShowAddCountryForm(!showAddCountryForm);
                      setShowAddCityForm(false);
                    }}
                    className="px-3.5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Country</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCityForm(!showAddCityForm);
                      setShowAddCountryForm(false);
                      setNewCityName("");
                      if (!newCityCountry && countriesList.length > 0) {
                        setNewCityCountry(countriesList[0]);
                      }
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add City</span>
                  </button>
                </div>
              </div>

              {/* Excel Bulk Upload Guide Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Excel Bulk Upload Format Guide:</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Write <span className="font-bold">Country</span> in Column A (e.g. <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">United States</code>) and list all cities in Column B separated by commas (e.g. <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia...</code>). You can include 1 or 100+ cities in a single cell. Click <span className="font-bold">"Demo Excel"</span> above to download a sample workbook!
                  </p>
                </div>
              </div>

              {/* Add Country Form */}
              {(activeMenu === "ADD_COUNTRY" || showAddCountryForm) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = toUpperCaseName(newCountryName);
                    if (!trimmed) return;
                    const existingIndex = countriesList.findIndex((c) => c.trim().toUpperCase() === trimmed);
                    if (existingIndex >= 0) {
                      const previousName = countriesList[existingIndex];
                      const updatedCountries = countriesList.map((country, index) => index === existingIndex ? trimmed : country);
                      const updatedCities = citiesList.map((city) =>
                        city.country.trim().toUpperCase() === trimmed ? { ...city, country: trimmed } : city
                      );
                      setCountriesList(updatedCountries);
                      setCitiesList(updatedCities);
                      showToast(`Country "${previousName}" replaced with "${trimmed}" in its existing position.`);
                    } else {
                      setCountriesList([...countriesList, trimmed]);
                      showToast(`Country "${trimmed}" created successfully!`);
                    }
                    setNewCountryName("");
                    setShowAddCountryForm(false);
                    if (activeMenu === "ADD_COUNTRY") setActiveMenu("MANAGE_COUNTRIES");
                  }}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs animate-fadeIn"
                >
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>Add New Country</span>
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Enter Country Name (e.g. Italy, Brazil, Singapore)..."
                      value={newCountryName}
                      onChange={(e) => setNewCountryName(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCountryForm(false)}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="px-5 py-2.5 bg-[#37494E] text-white font-bold rounded-xl cursor-pointer shadow-xs">
                        Save Country
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Add City Form */}
              {(activeMenu === "ADD_CITY" || showAddCityForm) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmedCity = toUpperCaseName(newCityName);
                    if (!trimmedCity) return;
                    if (!newCityCountry) {
                      showToast("Please select a country first!");
                      return;
                    }
                    const normalizedCountry = toUpperCaseName(newCityCountry);
                    const existingCityIndex = citiesList.findIndex(
                      (ct) => ct.name.trim().toUpperCase() === trimmedCity && ct.country.trim().toUpperCase() === normalizedCountry
                    );
                    if (existingCityIndex >= 0) {
                      const updatedCities = citiesList.map((city, index) =>
                        index === existingCityIndex ? { ...city, name: trimmedCity, country: normalizedCountry } : city
                      );
                      setCitiesList(updatedCities);
                      showToast(`City "${trimmedCity}" replaced in its existing position under ${normalizedCountry}.`);
                    } else {
                      setCitiesList([...citiesList, { name: trimmedCity, country: normalizedCountry }]);
                      showToast(`City "${trimmedCity}" added under ${normalizedCountry}!`);
                    }
                    setNewCityName("");
                    setShowAddCityForm(false);
                    if (activeMenu === "ADD_CITY") setActiveMenu("MANAGE_CITIES");
                  }}
                  className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3 text-xs animate-fadeIn"
                >
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>Add New City</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Select Country *</label>
                      <select
                        value={newCityCountry}
                        onChange={(e) => setNewCityCountry(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {([...countriesList].map((c) => (typeof c === "string" ? c : String((c as any)?.name || (c as any)?.id || ""))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))).map((c, cIdx) => (
                          <option key={`${c}-${cIdx}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">City Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Milan, Munich, Kyoto..."
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCityForm(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs">
                      Save City
                    </button>
                  </div>
                </form>
              )}

              {/* Location Bulk Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <button
                  onClick={() => {
                    setInactiveCountries([]);
                    setInactiveCities([]);
                    showToast("All countries and cities activated!");
                  }}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Activate All
                </button>
                <button
                  onClick={() => {
                    setInactiveCountries([...countriesList]);
                    setInactiveCities(citiesList.map((city) => `${city.country}:::${city.name}`));
                    showToast("All countries and cities deactivated!");
                  }}
                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Deactivate All
                </button>
                {(countriesList.length > 0 || citiesList.length > 0) && (
                  <button
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to permanently delete all ${countriesList.length} countries and ${citiesList.length} cities?`)) {
                        showToast("Delete action cancelled.");
                        return;
                      }
                      await setCountriesList([]);
                      await setCitiesList([]);
                      await setInactiveCountries([]);
                      await setInactiveCities([]);
                      showToast("All countries and cities deleted successfully.");
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                    title="Permanently delete all countries and cities"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete All
                  </button>
                )}
              </div>

              {/* Countries List & Expandable Cities */}
              <div className="space-y-4">
                {[...countriesList]
                  .map((c) => (typeof c === "string" ? c : String((c as any)?.name || (c as any)?.id || "")))
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                  .map((countryName, cIdx) => {
                    const isDeactivated = inactiveCountries.includes(countryName);
                    const isExpanded = openGroups[`country_${cIdx}`] ?? true;
                    const associatedCities = citiesList
                      .filter((ct) => ct.country === countryName)
                      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" }));

                    return (
                      <div
                        key={countryName || `cnt-${cIdx}`}
                        className={`border rounded-2xl transition-all ${
                          !isDeactivated
                            ? "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                            : "bg-slate-100/70 border-slate-300 opacity-75"
                        }`}
                      >
                        {/* Country Card Top Bar */}
                        <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleGroup(`country_${cIdx}`)}>
                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>

                            {editingCountryIdx === cIdx ? (
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editCountryName}
                                  onChange={(e) => setEditCountryName(e.target.value)}
                                  className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                                />
                                <button
                                  onClick={() => {
                                    if (!editCountryName.trim()) return;
                                    const oldName = countryName;
                                    const newName = editCountryName.trim().toUpperCase();
                                    if (countriesList.some((c) => c !== oldName && c.trim().toUpperCase() === newName)) {
                                      showToast(`Country "${newName}" already exists!`);
                                      return;
                                    }
                                    const updatedCountries = countriesList.map((c) => (c === oldName ? newName : c));
                                    const updatedCities = citiesList.map((ct) =>
                                      ct.country === oldName ? { ...ct, country: newName } : ct
                                    );
                                    setCountriesList(updatedCountries);
                                    setCitiesList(updatedCities);
                                    setEditingCountryIdx(null);
                                    showToast(`Updated country to "${newName}"`);
                                  }}
                                className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCountryIdx(null)}
                                className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <span className="font-extrabold text-sm text-[#37494E]">{countryName}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  !isDeactivated ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-200 text-slate-600 border-slate-300"
                                }`}
                              >
                                {!isDeactivated ? "Active" : "Deactivated"}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {associatedCities.length} {associatedCities.length === 1 ? "City" : "Cities"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Country Actions */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          {/* Add City Button */}
                          <button
                            onClick={() => {
                              setNewCityCountry(countryName);
                              setShowAddCityForm(true);
                              setShowAddCountryForm(false);
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add City</span>
                          </button>

                          {/* Edit Country */}
                          <button
                            onClick={() => {
                              setEditingCountryIdx(cIdx);
                              setEditCountryName(countryName);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Deactivate Country */}
                          <button
                            onClick={() => {
                              if (isDeactivated) {
                                setInactiveCountries(inactiveCountries.filter((c) => c !== countryName));
                                showToast(`Country "${countryName}" activated!`);
                              } else {
                                setInactiveCountries([...inactiveCountries, countryName]);
                                showToast(`Country "${countryName}" deactivated!`);
                              }
                            }}
                            className={`px-2.5 py-1 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                              !isDeactivated ? "bg-amber-100 hover:bg-amber-200 text-amber-800" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                            }`}
                          >
                            {!isDeactivated ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span>{!isDeactivated ? "Deactivate" : "Activate"}</span>
                          </button>

                          {/* Delete Country (Cascades to cities) */}
                          <button
                            onClick={() => {
                              if (!confirm(`Are you sure you want to permanently delete country "${countryName}" and all its associated cities?`)) {
                                showToast("Delete action cancelled.");
                                return;
                              }
                              const updatedCountries = countriesList.filter((c) => c !== countryName);
                              const updatedCities = citiesList.filter((ct) => ct.country !== countryName);
                              setCountriesList(updatedCountries);
                              setCitiesList(updatedCities);
                              deleteFromSupabase("countries", countryName);
                              deleteFromSupabase("countries", countryName.toLowerCase());
                              const client = getSupabaseClient();
                              if (client) {
                                client.from('countries').delete().or(`id.ilike.${countryName},name.ilike.${countryName}`).then(() => {});
                                client.from('cities').delete().or(`country.ilike.${countryName}`).then(() => {});
                              }
                              showToast(`Deleted country "${countryName}" and all associated cities.`);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Associated Cities List (Expanded) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                          {associatedCities.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2 pl-2">
                              No cities added under {countryName} yet. Click "+ Add City" above to add one.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {associatedCities.map((ct, ctIdx) => {
                                const globalIdx = citiesList.findIndex(
                                  (item) => item.name === ct.name && item.country === ct.country
                                );
                                const cityKey = `${ct.country}:::${ct.name}`;
                                const isCityDeactivated = inactiveCities.includes(cityKey);

                                return (
                                  <div
                                    key={cityKey || `city-${ctIdx}`}
                                    className={`p-2.5 border rounded-xl flex items-center justify-between text-xs shadow-2xs transition-all ${
                                      !isCityDeactivated
                                        ? "bg-white border-slate-200 hover:border-slate-300"
                                        : "bg-slate-100 border-slate-300 opacity-70"
                                    }`}
                                  >
                                    {editingCityIdx === globalIdx ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <input
                                          type="text"
                                          value={editCityName}
                                          onChange={(e) => setEditCityName(e.target.value)}
                                          className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <button
                                          onClick={() => {
                                            if (!editCityName.trim()) return;
                                            const newName = editCityName.trim().toUpperCase();
                                            const oldKey = `${ct.country}:::${ct.name}`;
                                            const newKey = `${ct.country}:::${newName}`;

                                            const updated = citiesList.map((item, i) =>
                                              i === globalIdx ? { ...item, name: newName } : item
                                            );
                                            setCitiesList(updated);

                                            if (inactiveCities.includes(oldKey)) {
                                              setInactiveCities(inactiveCities.map((k) => (k === oldKey ? newKey : k)));
                                            }

                                            setEditingCityIdx(null);
                                            showToast(`City updated to "${newName}"`);
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCityIdx(null)}
                                          className="px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                          <span className="font-bold text-slate-800 truncate">{ct.name}</span>
                                          <span
                                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${
                                              !isCityDeactivated
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-slate-200 text-slate-600 border-slate-300"
                                            }`}
                                          >
                                            {!isCityDeactivated ? "Active" : "Inactive"}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={() => {
                                              setEditingCityIdx(globalIdx);
                                              setEditCityName(ct.name);
                                            }}
                                            className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                                            title="Edit city"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (isCityDeactivated) {
                                                setInactiveCities(inactiveCities.filter((k) => k !== cityKey));
                                                showToast(`City "${ct.name}" activated!`);
                                              } else {
                                                setInactiveCities([...inactiveCities, cityKey]);
                                                showToast(`City "${ct.name}" deactivated!`);
                                              }
                                            }}
                                            className={`p-1 rounded transition-colors cursor-pointer ${
                                              !isCityDeactivated ? "hover:bg-amber-100 text-amber-700" : "hover:bg-emerald-100 text-emerald-700"
                                            }`}
                                            title={!isCityDeactivated ? "Deactivate city" : "Activate city"}
                                          >
                                            {!isCityDeactivated ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (!confirm(`Are you sure you want to permanently delete city "${ct.name}"?`)) {
                                                showToast("Delete action cancelled.");
                                                return;
                                              }
                                              const updated = citiesList.filter((_, i) => i !== globalIdx);
                                              setCitiesList(updated);
                                              setInactiveCities(inactiveCities.filter((k) => k !== cityKey));
                                              deleteFromSupabase("cities", cityKey);
                                              deleteFromSupabase("cities", ct.name);
                                              const client = getSupabaseClient();
                                              if (client) {
                                                client.from('cities').delete().or(`id.eq.${cityKey},id.ilike.${ct.name},and(name.ilike.${ct.name},country.ilike.${ct.country})`).then(() => {});
                                              }
                                              showToast(`Deleted city "${ct.name}"`);
                                            }}
                                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                            title="Delete city"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 7: TOPIC MANAGEMENT */}
          {(activeMenu === "ADD_TOPICS" || activeMenu === "MANAGE_TOPICS") && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#37494E] flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <span>Topic & Discipline Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage conference categories across the platform. Added or updated topics instantly sync with User Portal filters and Organizer conference creation forms.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Hidden File Input for Excel Upload */}
                  <input
                    type="file"
                    id="topic-excel-upload"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleTopicsExcelFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="topic-excel-upload"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    title="Bulk upload topics via Excel (.xlsx, .xls, .csv)"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Upload Excel</span>
                  </label>

                  {/* Download Demo Excel File */}
                  <button
                    onClick={downloadDemoTopicsExcel}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                    title="Download demo sample Excel template for topics bulk upload"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Demo Excel</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewTopicName("");
                      setNewTopicDesc("");
                      setShowAddTopicForm(!showAddTopicForm);
                      setShowBulkTopicModal(false);
                    }}
                    className="px-4 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Single Topic</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowBulkTopicModal(!showBulkTopicModal);
                      setShowAddTopicForm(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Text Bulk Upload</span>
                  </button>
                </div>
              </div>

              {/* Excel Bulk Upload Guide Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Topic Excel Bulk Upload Format Guide:</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Write <span className="font-bold">Topic Name</span> in Column A (e.g. <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">Artificial Intelligence & Machine Learning</code>) and optional <span className="font-bold">Description</span> in Column B. You can also list multiple topics in a single cell separated by newlines or commas. Click <span className="font-bold">"Demo Excel"</span> above to download a pre-formatted Excel template!
                  </p>
                </div>
              </div>

              {/* Stats Overview Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Topics</p>
                    <p className="text-2xl font-black text-slate-800 mt-0.5">{categories.length}</p>
                  </div>
                  <div className="h-10 w-10 bg-slate-200/70 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm">
                    {categories.length}
                  </div>
                </div>

                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Topics</p>
                    <p className="text-2xl font-black text-emerald-800 mt-0.5">
                      {categories.filter((c) => !inactiveTopics.includes(c.id)).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-200/80 text-emerald-800 rounded-xl flex items-center justify-center font-bold text-xs">
                    LIVE
                  </div>
                </div>

                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Deactivated Topics</p>
                    <p className="text-2xl font-black text-amber-800 mt-0.5">
                      {categories.filter((c) => inactiveTopics.includes(c.id)).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-amber-200/80 text-amber-800 rounded-xl flex items-center justify-center font-bold text-xs">
                    OFF
                  </div>
                </div>
              </div>

              {/* Bulk Topic Upload Panel */}
              {showBulkTopicModal && (
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200 space-y-4 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-blue-600" />
                      <span>Bulk Upload Topics / Categories (Text Area)</span>
                    </h4>
                    <button
                      onClick={() => setShowBulkTopicModal(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-slate-600 text-xs">
                    Paste multiple topic names below (one topic per line).
                  </p>

                  <textarea
                    rows={5}
                    value={bulkTopicText}
                    onChange={(e) => setBulkTopicText(e.target.value)}
                    placeholder={"Artificial Intelligence & ML\nComputer Science & Engineering\nData Science & Analytics\nCybersecurity & Network Defense\nQuantum Computing"}
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                  />

                  <div className="flex justify-end gap-2 pt-2 border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => setShowBulkTopicModal(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkTopicText.trim()) return;
                        const lines = bulkTopicText.split("\n").map((l) => l.trim()).filter(Boolean);
                        const bulkItems: Partial<Category>[] = lines.map((line) => ({
                          name: line,
                          slug: line.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                        }));

                        if (bulkItems.length > 0) {
                          if (onAddBulkCategories) {
                            onAddBulkCategories(bulkItems);
                          } else {
                            bulkItems.forEach((item) => onAddCategory(item));
                          }
                          showToast(`Successfully bulk uploaded ${bulkItems.length} new topic(s)!`);
                        } else {
                          showToast("No new topics added.");
                        }
                        setBulkTopicText("");
                        setShowBulkTopicModal(false);
                      }}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Topics</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add New Topic Single Form */}
              {(activeMenu === "ADD_TOPICS" || showAddTopicForm) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmedName = newTopicName.trim();
                    if (!trimmedName) return;
                    onAddCategory({
                      name: trimmedName,
                      slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                    });
                    setNewTopicName("");
                    setNewTopicDesc("");
                    setShowAddTopicForm(false);
                    showToast(`Topic "${trimmedName}" created successfully!`);
                    if (activeMenu === "ADD_TOPICS") setActiveMenu("MANAGE_TOPICS");
                  }}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs animate-fadeIn"
                >
                  <h4 className="font-bold text-sm text-[#37494E] flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    <span>Create New Topic</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Topic Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Quantum Computing & Cryptography"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setShowAddTopicForm(false)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs">
                      Save Topic
                    </button>
                  </div>
                </form>
              )}

              {/* Search and Status Filter Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search topics by name..."
                    value={topicSearchQuery}
                    onChange={(e) => setTopicSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    value={topicStatusFilter}
                    onChange={(e) => setTopicStatusFilter(e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="INACTIVE">Deactivated Only</option>
                  </select>

                  <button
                    onClick={() => {
                      setInactiveTopics([]);
                      showToast("All topics activated!");
                    }}
                    className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Activate All
                  </button>

                  <button
                    onClick={() => {
                      const allIds = categories.map((c) => c.id);
                      setInactiveTopics(allIds);
                      showToast("All topics deactivated!");
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Deactivate All
                  </button>

                  {categories.length > 0 && (
                    <button
                      onClick={async () => {
                        const deleteCount = categories.length;
                        if (!confirm(`Are you sure you want to permanently delete all ${deleteCount} topic(s)?`)) {
                          showToast("Delete action cancelled.");
                          return;
                        }
                        await onDeleteAllCategories?.();
                        await setInactiveTopics([]);
                        showToast(`All ${deleteCount} topic(s) deleted successfully.`);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
                      title="Permanently delete all topics"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete All
                    </button>
                  )}
                </div>
              </div>

              {/* Topic List View Table */}
              {(() => {
                const filtered = categories.filter((cat) => {
                  const isDeactivated = inactiveTopics.includes(cat.id);
                  if (topicStatusFilter === "ACTIVE" && isDeactivated) return false;
                  if (topicStatusFilter === "INACTIVE" && !isDeactivated) return false;
                  if (topicSearchQuery.trim()) {
                    const q = topicSearchQuery.toLowerCase().trim();
                    const nameMatch = cat.name.toLowerCase().includes(q);
                    const descMatch = (cat.description || "").toLowerCase().includes(q);
                    if (!nameMatch && !descMatch) return false;
                  }
                  return true;
                });
                filtered.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" }));

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Tag className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No topics match your filters</p>
                      <p className="text-xs text-slate-500">Try adjusting your search query or status filter.</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 pl-6 w-16">#</th>
                            <th className="p-3.5">Topic & Discipline Name</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filtered.map((cat, idx) => {
                            const isDeactivated = inactiveTopics.includes(cat.id);

                            return (
                              <tr
                                key={cat.id ? `${cat.id}-${idx}` : `cat-idx-${idx}`}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  isDeactivated ? "bg-slate-50/60 opacity-75" : ""
                                }`}
                              >
                                <td className="p-3.5 pl-6 font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-3.5">
                                  {editingTopicId === cat.id ? (
                                    <div className="flex items-center gap-2 max-w-md">
                                      <input
                                        type="text"
                                        value={editTopicName}
                                        onChange={(e) => setEditTopicName(e.target.value)}
                                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                      <button
                                        onClick={() => {
                                          if (!editTopicName.trim()) return;
                                          onEditCategory(cat.id, {
                                            name: editTopicName.trim(),
                                          });
                                          setEditingTopicId(null);
                                          showToast(`Topic "${editTopicName.trim()}" updated!`);
                                        }}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingTopicId(null)}
                                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-bold text-slate-900 text-sm break-words">{cat.name}</span>
                                      {cat.description && (
                                        <p className="text-[11px] text-slate-400 mt-0.5 break-words">{cat.description}</p>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                                      !isDeactivated
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${!isDeactivated ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                    {!isDeactivated ? "Active" : "Deactivated"}
                                  </span>
                                </td>
                                <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingTopicId(cat.id);
                                        setEditTopicName(cat.name);
                                        setEditTopicDesc(cat.description || "");
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                                      title="Edit Topic"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                      <span>Edit</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (isDeactivated) {
                                          setInactiveTopics(inactiveTopics.filter((id) => id !== cat.id));
                                          showToast(`Topic "${cat.name}" activated!`);
                                        } else {
                                          setInactiveTopics([...inactiveTopics, cat.id]);
                                          showToast(`Topic "${cat.name}" deactivated!`);
                                        }
                                      }}
                                      className={`px-2.5 py-1 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                                        !isDeactivated
                                          ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                                          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                      }`}
                                      title={!isDeactivated ? "Deactivate Topic" : "Activate Topic"}
                                    >
                                      {!isDeactivated ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                      <span>{!isDeactivated ? "Deactivate" : "Activate"}</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to permanently delete topic "${cat.name}"?`)) {
                                          onDeleteCategory(cat.id);
                                          showToast(`Topic "${cat.name}" deleted.`);
                                        }
                                      }}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Topic"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SECTION 8: FEEDBACK MANAGEMENT */}
          {(activeMenu === "APPROVED_FEEDBACK" || activeMenu === "MANAGE_FEEDBACK") && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span>{activeMenu === "APPROVED_FEEDBACK" ? "Approved User Feedbacks" : "User Feedback & Testimonial Management"}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage feedback submitted by users from the User Portal. Activate items to render on the Home Page Testimonials section.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {userFeedbacks.length}
                  </span>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search feedback by reviewer or text..."
                    value={fbSearchQuery}
                    onChange={(e) => setFbSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {fbSearchQuery && (
                    <button
                      onClick={() => setFbSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setFbStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fbStatusFilter === "ALL"
                        ? "bg-[#37494E] text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    All ({userFeedbacks.length})
                  </button>
                  <button
                    onClick={() => setFbStatusFilter("ACTIVE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fbStatusFilter === "ACTIVE"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Active / Approved ({userFeedbacks.filter((f) => f.status === "Approved" || f.status === "Active").length})
                  </button>
                  <button
                    onClick={() => setFbStatusFilter("INACTIVE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fbStatusFilter === "INACTIVE"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Inactive / Pending ({userFeedbacks.filter((f) => f.status !== "Approved" && f.status !== "Active").length})
                  </button>
                </div>
              </div>

              {/* Feedbacks Grid */}
              {(() => {
                const filtered = userFeedbacks.filter((fb) => {
                  if (activeMenu === "APPROVED_FEEDBACK" && (fb.status !== "Approved" && fb.status !== "Active")) {
                    return false;
                  }
                  if (fbStatusFilter === "ACTIVE" && (fb.status !== "Approved" && fb.status !== "Active")) {
                    return false;
                  }
                  if (fbStatusFilter === "INACTIVE" && (fb.status === "Approved" || fb.status === "Active")) {
                    return false;
                  }
                  if (fbSearchQuery.trim()) {
                    const q = fbSearchQuery.toLowerCase();
                    const matchName = fb.name?.toLowerCase().includes(q);
                    const matchText = fb.text?.toLowerCase().includes(q);
                    const matchCountry = fb.country?.toLowerCase().includes(q);
                    if (!matchName && !matchText && !matchCountry) return false;
                  }
                  return true;
                });
                filtered.sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
                  if (timeA !== timeB) return timeB - timeA;
                  return String(b.id || "").localeCompare(String(a.id || ""));
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No Feedback Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {fbSearchQuery || fbStatusFilter !== "ALL"
                          ? "Try adjusting your search or filter settings."
                          : "User submissions from the footer form will automatically appear here."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((fb, fbIdx) => {
                      const isEditing = editingFeedbackId === fb.id;
                      const isActive = fb.status === "Approved" || fb.status === "Active";

                      if (isEditing) {
                        return (
                          <div key={fb.id || `fb-edit-${fbIdx}`} className="p-4 border-2 border-blue-400 rounded-xl bg-blue-50/40 space-y-3 text-xs shadow-md">
                            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>Edit Feedback #{fb.id}</span>
                              </h4>
                              <button
                                onClick={() => setEditingFeedbackId(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold text-slate-700 block text-[10px] mb-0.5">Reviewer Name</label>
                                <input
                                  type="text"
                                  value={editFbName}
                                  onChange={(e) => setEditFbName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-slate-700 block text-[10px] mb-0.5">Country / Institution</label>
                                <input
                                  type="text"
                                  value={editFbCountry}
                                  onChange={(e) => setEditFbCountry(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold text-slate-700 block text-[10px] mb-0.5">Rating (1-5)</label>
                                <select
                                  value={editFbRating}
                                  onChange={(e) => setEditFbRating(Number(e.target.value))}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                  <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                                  <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                                  <option value={3}>⭐⭐⭐ (3 Stars)</option>
                                  <option value={2}>⭐⭐ (2 Stars)</option>
                                  <option value={1}>⭐ (1 Star)</option>
                                </select>
                              </div>

                              <div>
                                <label className="font-bold text-slate-700 block text-[10px] mb-0.5">Status</label>
                                <select
                                  value={editFbStatus}
                                  onChange={(e) => setEditFbStatus(e.target.value as any)}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                  <option value="Approved">Active (Show on Home Page)</option>
                                  <option value="Pending">Inactive / Pending Review</option>
                                </select>
                              </div>
                            </div>

                            <ImageUploaderField
                              label="Avatar Photo"
                              value={editFbImage}
                              onChange={setEditFbImage}
                              placeholder="Paste image URL (https://...)"
                              aspectHint="PNG, JPG, SVG, WEBP"
                              isLogo={true}
                            />

                            <div>
                              <label className="font-bold text-slate-700 block text-[10px] mb-0.5">Feedback Text</label>
                              <textarea
                                rows={3}
                                value={editFbText}
                                onChange={(e) => setEditFbText(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                              <button
                                onClick={() => setEditingFeedbackId(null)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!editFbName.trim() || !editFbText.trim()) {
                                    showToast("Name and text are required.");
                                    return;
                                  }
                                  const updated = userFeedbacks.map((item) => {
                                    const isTarget = item.id ? item.id === fb.id : (item.name === fb.name && item.text === fb.text);
                                    if (isTarget) {
                                      return {
                                        ...item,
                                        name: editFbName.trim(),
                                        image: editFbImage.trim(),
                                        text: editFbText.trim(),
                                        rating: editFbRating,
                                        country: editFbCountry.trim(),
                                        status: editFbStatus
                                      };
                                    }
                                    return item;
                                  });
                                  syncUserFeedbacksToStorageAndRtdb(updated);
                                  setEditingFeedbackId(null);
                                  showToast(`Feedback from "${editFbName.trim()}" updated successfully!`);
                                }}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-xs flex items-center gap-1"
                              >
                                <Save className="h-3.5 w-3.5" />
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={fb.id ? `${fb.id}-${fbIdx}` : `fb-item-${fbIdx}`} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-xs shadow-2xs hover:border-slate-300 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              {fb.image ? (
                                <img src={fb.image} alt={fb.name} className="w-9 h-9 rounded-full object-contain border border-slate-200" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                                  {fb.name?.charAt(0) || "U"}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">{fb.name}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                  <span>{fb.date}</span>
                                  {fb.country && <span className="bg-slate-200/80 px-1.5 py-0.2 rounded text-slate-600">{fb.country}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex text-amber-400">
                              {[...Array(fb.rating || 5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                            </div>
                          </div>

                          <p className="text-slate-700 italic leading-relaxed text-xs">"{fb.text}"</p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                              Status: {isActive ? "Active (On Homepage)" : "Inactive / Pending"}
                            </span>

                            {/* Actions: Activate/Deactivate Toggle and Delete */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const nextStatus = isActive ? "Pending" : "Approved";
                                  const updated = userFeedbacks.map((f) => {
                                    const isTarget = (f.id && fb.id) ? f.id === fb.id : (f.name === fb.name && f.text === fb.text);
                                    return isTarget ? { ...f, status: nextStatus as any } : f;
                                  });
                                  syncUserFeedbacksToStorageAndRtdb(updated);
                                  showToast(
                                    nextStatus === "Approved"
                                      ? "Feedback activated! Now visible on User Portal."
                                      : "Feedback deactivated and hidden from User Portal."
                                  );
                                }}
                                className={`px-2.5 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                                  isActive
                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                }`}
                                title={isActive ? "Deactivate from Home Page" : "Activate on Home Page"}
                              >
                                {isActive ? (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={async () => {
                                  if (!confirm(`Are you sure you want to permanently delete feedback from "${fb.name}"?`)) {
                                    showToast("Delete action cancelled.");
                                    return;
                                  }
                                  if (fb.image) {
                                    const info = extractStoragePathFromUrl(fb.image);
                                    if (info) {
                                      try {
                                        const client = getSupabaseClient();
                                        if (client) await client.storage.from(info.bucket).remove([info.path]);
                                      } catch (e) {}
                                    }
                                  }
                                  if (fb.id) {
                                    await deleteFromSupabase("user_feedbacks", fb.id);
                                  }
                                  const updated = userFeedbacks.filter((f) => {
                                    if (f.id && fb.id) return f.id !== fb.id;
                                    return !(f.name === fb.name && f.text === fb.text);
                                  });
                                  await syncUserFeedbacksToStorageAndRtdb(updated);
                                  showToast("Feedback permanently deleted.");
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-rose-200/60"
                                title="Delete feedback"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {activeMenu === "SUBSCRIBER_EMAILS" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
              {/* Top Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                    <Mail className="h-5 w-5 text-teal-600" />
                    <span>Newsletter Subscriber Directory</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Emails submitted through the User Portal footer subscription form.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {subscriberEmails.length}
                  </span>

                  <button
                    onClick={async () => {
                      if (subscriberEmails.length === 0) {
                        showToast("No subscribers to export.");
                        return;
                      }
                      const XLSX = await import("xlsx");
                      const dataToExport = subscriberEmails.map((s, idx) => ({
                        "S.No": idx + 1,
                        "Email Address": s.email,
                        "Subscribed Date": s.date
                      }));
                      const ws = XLSX.utils.json_to_sheet(dataToExport);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
                      XLSX.writeFile(wb, "Subscribers_List.xlsx");
                      showToast("Subscriber list exported to Excel (.xlsx) successfully!");
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    title="Export to Excel spreadsheet"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8," + ["Email,Date", ...subscriberEmails.map(e => `"${e.email}","${e.created_at || e.date || ""}"`)].join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "subscribers.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      showToast("Subscriber list exported to CSV!");
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                    title="Export to CSV file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Search & Bulk Operations Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search subscribers by email or date..."
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {subSearchQuery && (
                    <button
                      onClick={() => setSubSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {selectedSubIds.length > 0 && (
                    <button
                      onClick={() => {
                        const deleteCount = selectedSubIds.length;
                        if (!confirm(`Are you sure you want to permanently delete ${deleteCount} selected subscriber(s)?`)) {
                          showToast("Delete action cancelled.");
                          return;
                        }
                        const updated = subscriberEmails.filter((s) => !selectedSubIds.includes(s.id || s.email));
                        syncSubscriberEmailsToStorageAndRtdb(updated);
                        setSelectedSubIds([]);
                        showToast(`Deleted ${deleteCount} selected subscriber(s).`);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 animate-fadeIn"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Selected ({selectedSubIds.length})</span>
                    </button>
                  )}

                  {subscriberEmails.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete all ${subscriberEmails.length} subscriber(s)?`)) {
                          syncSubscriberEmailsToStorageAndRtdb([]);
                          setSelectedSubIds([]);
                          showToast("All subscribers cleared.");
                        } else showToast("Delete action cancelled.");
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Subscribers List Table */}
              {(() => {
                const filtered = subscriberEmails.filter((sub) => {
                  if (!subSearchQuery.trim()) return true;
                  const q = subSearchQuery.toLowerCase();
                  return sub.email.toLowerCase().includes(q) || (sub.date && sub.date.toLowerCase().includes(q));
                });
                filtered.sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.date ? new Date(a.date).getTime() : 0);
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.date ? new Date(b.date).getTime() : 0);
                  if (timeA !== timeB) return timeB - timeA;
                  return String(b.id || "").localeCompare(String(a.id || ""));
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Mail className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">
                        {subSearchQuery ? "No Subscribers Found" : "No Subscribers Yet"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {subSearchQuery
                          ? "Try searching with a different email address or date keyword."
                          : "Subscriptions submitted via the User Portal footer form will appear here automatically."}
                      </p>
                    </div>
                  );
                }

                const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedSubIds.includes(s.id || s.email));

                return (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const ids = filtered.map((f) => f.id || f.email);
                                  setSelectedSubIds(Array.from(new Set([...selectedSubIds, ...ids])));
                                } else {
                                  const ids = filtered.map((f) => f.id || f.email);
                                  setSelectedSubIds(selectedSubIds.filter((id) => !ids.includes(id)));
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3">Subscriber Email Address</th>
                          <th className="p-3">Subscribed Date & Time</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filtered.map((sub, index) => {
                          const itemKey = sub.id || sub.email;
                          const isSelected = selectedSubIds.includes(itemKey);

                          return (
                            <tr
                              key={`${itemKey}-${index}`}
                              className={`transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSubIds([...selectedSubIds, itemKey]);
                                    } else {
                                      setSelectedSubIds(selectedSubIds.filter((id) => id !== itemKey));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center font-bold text-slate-400 text-[11px]">{index + 1}</td>
                              <td className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-[10px] shrink-0">
                                    {sub.email.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="break-all">{sub.email}</span>
                                </div>
                              </td>
                              <td className="p-3 text-slate-500 font-medium">{sub.date}</td>
                              <td className="p-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Subscribed
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    if (!confirm(`Are you sure you want to permanently delete subscriber "${sub.email}"?`)) {
                                      showToast("Delete action cancelled.");
                                      return;
                                    }
                                    const updated = subscriberEmails.filter((s) => {
                                      if (s.id && sub.id) return s.id !== sub.id;
                                      return s.email.toLowerCase() !== sub.email.toLowerCase();
                                    });
                                    syncSubscriberEmailsToStorageAndRtdb(updated);
                                    setSelectedSubIds(selectedSubIds.filter((id) => id !== itemKey));
                                    showToast(`Subscriber "${sub.email}" deleted successfully.`);
                                  }}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 border border-rose-200/60"
                                  title="Delete subscriber"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Conference details preview */}
          {viewingConfDetails && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-slate-200">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2 ${
                      isConferenceCompleted(viewingConfDetails)
                        ? "bg-slate-200 text-slate-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {isConferenceCompleted(viewingConfDetails) ? "Completed Conference" : "Pending Conference Review"}
                    </span>
                    <h3 className="text-lg font-bold text-[#37494E] leading-tight">{viewingConfDetails.title}</h3>
                    {viewingConfDetails.shortTitle && (
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">({viewingConfDetails.shortTitle})</p>
                    )}
                  </div>
                  <button
                    onClick={() => setViewingConfDetails(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Organizer Uploaded Conference Banner Image */}
                <div className="relative h-44 sm:h-56 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                  <img
                    src={getCleanImageSrc(viewingConfDetails.bannerImage, "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80")}
                    alt={viewingConfDetails.title}
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Topics / Field</p>
                    <p className="font-semibold text-slate-800">{viewingConfDetails.category}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Organizer</p>
                    <p className="font-semibold text-slate-800">
                      {organizers.find((o) => o.id === viewingConfDetails.organizerId)?.organizationName || viewingConfDetails.organizerId}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Dates</p>
                    <p className="font-semibold text-slate-800">
                      {formatConferenceDate(viewingConfDetails.startDate)} - {formatConferenceDate(viewingConfDetails.endDate)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                    <p className="font-semibold text-slate-800">
                      {viewingConfDetails.city}, {viewingConfDetails.country}
                      {viewingConfDetails.venue ? ` (${viewingConfDetails.venue})` : ""}
                    </p>
                  </div>
                </div>

                {viewingConfDetails.conferenceWebsite && (
                  <div className="text-xs space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Official Website</p>
                    <a
                      href={viewingConfDetails.conferenceWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      {viewingConfDetails.conferenceWebsite} <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                )}

                {viewingConfDetails.contactEmail && (
                  <div className="text-xs space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Contact Email</p>
                    <a
                      href={`mailto:${viewingConfDetails.contactEmail}`}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {viewingConfDetails.contactEmail}
                    </a>
                  </div>
                )}

                <div className="text-xs space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Description / Call For Papers</p>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                    {viewingConfDetails.description}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-wrap">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete conference "${viewingConfDetails.title}"?`)) {
                        onDeleteConference(viewingConfDetails.id);
                        setViewingConfDetails(null);
                        showToast("Conference deleted.");
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>

                  {!isConferenceCompleted(viewingConfDetails) && (
                    <>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter rejection reason:", "Submission parameters non-compliant");
                          if (reason) {
                            onRejectConference(viewingConfDetails.id, reason);
                            setViewingConfDetails(null);
                            showToast("Conference rejected.");
                          }
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Reject Submission
                      </button>

                      <button
                        onClick={() => {
                          onApproveConference(viewingConfDetails.id);
                          setViewingConfDetails(null);
                          showToast("Conference approved!");
                        }}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm"
                      >
                        Approve Conference
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* View Details Modal for Organizers */}
          {viewingOrgDetails && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const logoUrl = getCleanImageSrc(viewingOrgDetails.logo);
                      return logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={viewingOrgDetails.organizationName}
                          className="w-14 h-14 rounded-2xl object-contain border border-slate-200 shadow-sm shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#37494E] text-xl shrink-0">
                          {viewingOrgDetails.organizationName?.charAt(0) || "O"}
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-lg font-extrabold text-[#37494E] leading-tight">
                        {viewingOrgDetails.organizationName || "Unnamed Organization"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{viewingOrgDetails.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingOrgDetails(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {viewingOrgDetails.isSuspended ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Inactive / Pending Activation
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Active Status
                    </span>
                  )}

                  {viewingOrgDetails.isVerified ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Verified Organizer
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-full border border-slate-200">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Profile Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Person</p>
                    <p className="font-bold text-slate-800">{viewingOrgDetails.contactPerson || "Not provided"}</p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                    <p className="font-bold text-slate-800">
                      {[viewingOrgDetails.city, viewingOrgDetails.country].filter(Boolean).join(", ") || "Global"}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official Website</p>
                    {viewingOrgDetails.organizationWebsite ? (
                      <a
                        href={viewingOrgDetails.organizationWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                      >
                        {viewingOrgDetails.organizationWebsite} <ExternalLink className="h-3.5 w-3.5 inline" />
                      </a>
                    ) : (
                      <p className="text-slate-400 italic">No website provided</p>
                    )}
                  </div>
                </div>

                {/* About Organization */}
                <div className="space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">About Organization</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed font-medium whitespace-pre-line max-h-48 overflow-y-auto">
                    {viewingOrgDetails.aboutOrganization || "No description available."}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 flex-wrap">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to permanently delete organizer "${viewingOrgDetails.organizationName}"?`)) {
                        onDeleteOrganizer(viewingOrgDetails.id);
                        setViewingOrgDetails(null);
                        showToast("Organizer deleted.");
                      }
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Organizer
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onVerifyOrganizer(viewingOrgDetails.id);
                        const updated = { ...viewingOrgDetails, isVerified: !viewingOrgDetails.isVerified };
                        setViewingOrgDetails(updated);
                        showToast(updated.isVerified ? "Organizer verified!" : "Organizer unverified.");
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      {viewingOrgDetails.isVerified ? "Unverify Organizer" : "Verify Organizer"}
                    </button>

                    <button
                      onClick={async () => {
                        const result = await onToggleSuspendOrganizer(viewingOrgDetails.id);
                        if (result.success) {
                          const updated = { ...viewingOrgDetails, isSuspended: !result.isActive };
                          setViewingOrgDetails(updated);
                        }
                        showToast(result.success
                          ? (result.isActive ? "Organizer account activated!" : "Organizer account deactivated.")
                          : (result.error || "Unable to update organizer status."));
                      }}
                      className={`px-5 py-2 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-sm ${
                        viewingOrgDetails.isSuspended
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {viewingOrgDetails.isSuspended ? "Activate Organizer" : "Deactivate Organizer"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  </div>
);
}
