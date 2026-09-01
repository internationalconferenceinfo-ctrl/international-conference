import React, { useState, useMemo, useEffect, useRef } from "react";
import { adminFetch } from "../shared/utils/adminSession";
import { 
  saveToSupabase,
  fetchFromSupabase,
  fetchCityCountByCountryFromSupabase,
  fetchCitiesByCountryFromSupabase,
  subscribeToSupabase,
  deleteFromSupabase, 
  getSupabaseClient,
  uploadBannerImageToSupabase,
  deleteBannerImageFromSupabase,
  saveRecordToSupabase,
  deleteRecordFromSupabase
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
 onAddCategory: (
  cat: Partial<Category>
) => Promise<void> | void;

onAddBulkCategories?: (
  cats: Partial<Category>[]
) => Promise<void> | void;

onEditCategory: (
  catId: string,
  updated: Partial<Category>
) => Promise<void> | void;

onDeleteCategory: (
  catId: string
) => Promise<void> | void;
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
  | "HOME_DESCRIPTION"
  | "CONFERENCE_DESCRIPTION"
  | "PRIVACY_POLICY"
  | "TERMS_OF_SERVICE"
  | "APPROVED_FEEDBACK"
  | "MANAGE_FEEDBACK"
  | "SUBSCRIBER_EMAILS"
  | "ADMIN_PROFILE"
  | "ADMIN_PASSWORD"
  | "DATABASE_RESET";


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
  status?: string;
  isVerified?: boolean;
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
  status?: string;
  isVerified?: boolean;
}

interface TextItem {
  id: string;
  content: string;
  status: "Active" | "Inactive";
}

interface AboutUsContent {
  id: string;
  mission_badge: string;
  title: string;
  paragraph1: string;
  paragraph2: string;
  stat1_value: string;
  stat1_label: string;
  stat2_value: string;
  stat2_label: string;
  image_url: string;
  updated_at?: string;
}

interface PrivacyPolicyContent {
  id: string;
  title: string;
  content: string;
  updated_at?: string;
}

interface TermsOfServiceContent {
  id: string;
  title: string;
  content: string;
  updated_at?: string;
}

interface HomeDescriptionContent {
  id: string;
  description: string;
  updated_at?: string;
}

interface ConferenceDescriptionContent {
  id: string;
  default_description: string;
  topic_description: string;
  country_description: string;
  city_description: string;
  topic_country_description: string;
  combined_description: string;
  updated_at?: string;
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
  
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotifications,
}: AdminPortalProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>("DASHBOARD_OVERVIEW");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
  return typeof window !== "undefined" ? window.innerWidth >= 1024 : false;
});

  // Expanded menu accordion groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ [key]: !prev[key] }));
  };

  // Shared state sourced from Supabase
// Shared state sourced from Supabase
const [mediaPartners, setMediaPartners] = useState<MediaPartner[]>([]);
const [associates, setAssociates] = useState<Associate[]>([]);
const [bannerTitles, setBannerTitles] = useState<TextItem[]>([]);
const [bannerDescs, setBannerDescs] = useState<TextItem[]>([]);
const [bannerContents, setBannerContents] = useState<BannerContentItem[]>([]);

// Location Excel bulk upload progress
const [isLocationUploadOpen, setIsLocationUploadOpen] = useState(false);
const [isLocationUploading, setIsLocationUploading] = useState(false);
const [locationUploadProgress, setLocationUploadProgress] = useState(0);
const [locationUploadStatus, setLocationUploadStatus] = useState("");
const [locationUploadProcessed, setLocationUploadProcessed] = useState(0);
const [locationUploadTotal, setLocationUploadTotal] = useState(0);

const [locationUploadResult, setLocationUploadResult] = useState<{
  countriesAdded: number;
  citiesAdded: number;
  duplicateCountries: number;
  duplicateCities: number;
  rowsSkipped: number;
} | null>(null);

const countriesList = countriesListProp || [];

const setCountriesList = async (
  val: string[] | ((prev: string[]) => string[])
) => {
  const next =
    typeof val === "function"
      ? val(countriesList)
      : val;

  if (onUpdateCountries) {
    onUpdateCountries(next);
  }

  await saveToSupabase("countries", next);
};
// Cities are loaded country-by-country for large location databases.
// This prevents millions of cities from being kept in browser memory.
const [adminCitiesByCountry, setAdminCitiesByCountry] = useState<
  Record<string, Array<{ name: string; country: string }>>
>({});

const [adminCitiesLoading, setAdminCitiesLoading] = useState<
  Record<string, boolean>
>({});

const [adminCityCounts, setAdminCityCounts] = useState<
  Record<string, number>
>({});

const loadAdminCityCountForCountry = async (
  country: string
) => {
  const normalizedCountry = String(country || "")
    .trim()
    .toUpperCase();

  if (!normalizedCountry) return;

  if (
    Object.prototype.hasOwnProperty.call(
      adminCityCounts,
      normalizedCountry
    )
  ) {
    return;
  }

  try {
    const count =
      await fetchCityCountByCountryFromSupabase(
        normalizedCountry
      );

    setAdminCityCounts((prev) => ({
      ...prev,
      [normalizedCountry]: count
    }));
  } catch (error) {
    console.error(
      `Failed to load city count for ${normalizedCountry}:`,
      error
    );
  }
};

useEffect(() => {
  if (!countriesList.length) return;

  const loadCounts = async () => {
    for (const country of countriesList) {
      const normalizedCountry = String(country || "")
        .trim()
        .toUpperCase();

      if (!normalizedCountry) continue;

      if (
        Object.prototype.hasOwnProperty.call(
          adminCityCounts,
          normalizedCountry
        )
      ) {
        continue;
      }

      await loadAdminCityCountForCountry(
        normalizedCountry
      );
    }
  };

  void loadCounts();
}, [countriesList]);

const loadAdminCitiesForCountry = async (
  country: string
) => {
  const normalizedCountry = String(country || "")
    .trim()
    .toUpperCase();

  if (!normalizedCountry) return;

  // Already loaded in this Admin session.
  if (adminCitiesByCountry[normalizedCountry]) {
    return;
  }

  setAdminCitiesLoading((prev) => ({
    ...prev,
    [normalizedCountry]: true
  }));

  try {
    const rows =
      await fetchCitiesByCountryFromSupabase(
        normalizedCountry
      );

    setAdminCitiesByCountry((prev) => ({
      ...prev,
      [normalizedCountry]: rows
    }));
  } catch (error) {
    console.error(
      `Failed to load cities for ${normalizedCountry}:`,
      error
    );

    setAdminCitiesByCountry((prev) => ({
      ...prev,
      [normalizedCountry]: []
    }));
  } finally {
    setAdminCitiesLoading((prev) => ({
      ...prev,
      [normalizedCountry]: false
    }));
  }
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

  // Load About Us content from Supabase
useEffect(() => {
  const loadAboutUsContent = async () => {
    setIsLoadingAboutUs(true);

    try {
      const data = await fetchFromSupabase<AboutUsContent[]>(
        "about_us",
        true
      );

      const record = Array.isArray(data) ? data[0] : data;

      if (record) {
        const loadedContent: AboutUsContent = {
          id: record.id || "primary",
          mission_badge: record.mission_badge || "Our Mission",
          title: record.title || "About International Conference",
          paragraph1: record.paragraph1 || "",
          paragraph2: record.paragraph2 || "",
          stat1_value: record.stat1_value || "",
          stat1_label: record.stat1_label || "",
          stat2_value: record.stat2_value || "",
          stat2_label: record.stat2_label || "",
          image_url: record.image_url || "",
          updated_at: record.updated_at
        };

        setAboutUsContent(loadedContent);
        setAboutUsOriginal(loadedContent);
      }
    } catch (error) {
      console.error("Failed to load About Us content:", error);
      showToast("Unable to load About Us content.");
    } finally {
      setIsLoadingAboutUs(false);
    }
  };

  loadAboutUsContent();
}, []);

// Load Privacy Policy from Supabase
useEffect(() => {
  const loadPrivacyPolicy = async () => {
    setIsLoadingPrivacyPolicy(true);

    try {
      const data = await fetchFromSupabase<PrivacyPolicyContent[]>(
        "privacy_policy",
        true
      );

      const record = Array.isArray(data) ? data[0] : data;

      if (record) {
        const loadedContent: PrivacyPolicyContent = {
          id: record.id || "primary",
          title: record.title || "Privacy Policy",
          content: record.content || "",
          updated_at: record.updated_at
        };

        setPrivacyPolicy(loadedContent);
        setPrivacyPolicyOriginal(loadedContent);
      }
    } catch (error) {
      console.error("Failed to load Privacy Policy:", error);
      showToast("Unable to load Privacy Policy.");
    } finally {
      setIsLoadingPrivacyPolicy(false);
    }
  };

  loadPrivacyPolicy();
}, []);

// Load Terms of Service from Supabase
useEffect(() => {
  const loadTermsOfService = async () => {
    setIsLoadingTermsOfService(true);

    try {
      const data = await fetchFromSupabase<TermsOfServiceContent[]>(
        "terms_of_service",
        true
      );

      const record = Array.isArray(data) ? data[0] : data;

      if (record) {
        const loadedContent: TermsOfServiceContent = {
          id: record.id || "primary",
          title: record.title || "Terms of Service",
          content: record.content || "",
          updated_at: record.updated_at
        };

        setTermsOfService(loadedContent);
        setTermsOfServiceOriginal(loadedContent);
      }
    } catch (error) {
      console.error("Failed to load Terms of Service:", error);
      showToast("Unable to load Terms of Service.");
    } finally {
      setIsLoadingTermsOfService(false);
    }
  };

  loadTermsOfService();
}, []);



// Load Home Main Description from Supabase
useEffect(() => {
  const loadHomeDescription = async () => {
    setIsLoadingHomeDescription(true);

    try {
      const data = await fetchFromSupabase<HomeDescriptionContent[]>(
        "home_description",
        true
      );

      const record = Array.isArray(data) ? data[0] : data;

      if (record) {
        const loadedContent: HomeDescriptionContent = {
          id: record.id || "primary",
          description: record.description || "",
          updated_at: record.updated_at
        };

        setHomeDescription(loadedContent);
        setHomeDescriptionOriginal(loadedContent);
      }
    } catch (error) {
      console.error(
        "Failed to load Home Description:",
        error
      );

      showToast("Unable to load Home Description.");
    } finally {
      setIsLoadingHomeDescription(false);
    }
  };

  loadHomeDescription();
}, []);

// Load Conference Description templates from Supabase
useEffect(() => {
  const loadConferenceDescription = async () => {
    setIsLoadingConferenceDescription(true);

    try {
      const data = await fetchFromSupabase<ConferenceDescriptionContent[]>(
        "conference_descriptions",
        true
      );

      const record = Array.isArray(data) ? data[0] : data;

      if (record) {
       const loadedContent: ConferenceDescriptionContent = {
  id: record.id || "primary",
 default_description:
  record.default_description ||
  "Discover verified, peer-reviewed, and high-impact academic conferences, research symposiums, and professional summits from around the world. All listed events undergo rigorous vetting by International Conference to ensure credential legitimacy, past record authenticity, and index authority.",
topic_description: record.topic_description || "",
country_description: record.country_description || "",
city_description: record.city_description || "",
topic_country_description: record.topic_country_description || "",
combined_description: record.combined_description || "",
};
        setConferenceDescription(loadedContent);
        setConferenceDescriptionOriginal(loadedContent);
      }
    } catch (error) {
      console.error(
        "Failed to load Conference Description:",
        error
      );

      showToast("Unable to load Conference Description.");
    } finally {
      setIsLoadingConferenceDescription(false);
    }
  };

  loadConferenceDescription();
}, []);



  // Excel Bulk Upload and Demo File Download Handlers for Location Management
        const downloadDemoExcel = async () => {
        const XLSX = await import("xlsx");

        const sampleData = [
          {
            Country: "INDIA",
            City: "DELHI, MUMBAI, PUNE, CHENNAI, HYDERABAD"
          },
          {
            Country: "UNITED STATES",
            City: "NEW YORK, CHICAGO, BOSTON, DALLAS, MIAMI"
          },
          {
            Country: "UNITED KINGDOM",
            City: "LONDON, MANCHESTER, BIRMINGHAM, LEEDS"
          },
          {
            Country: "JAPAN",
            City: "TOKYO, OSAKA, KYOTO, YOKOHAMA"
          }
        ];

        const multipleRowsExample = [
          {
            Country: "INDIA",
            City: "DELHI"
          },
          {
            Country: "",
            City: "MUMBAI"
          },
          {
            Country: "",
            City: "PUNE"
          },
          {
            Country: "JAPAN",
            City: "TOKYO"
          },
          {
            Country: "",
            City: "OSAKA"
          }
        ];

        const multipleColumnsExample = [
          {
            Country: "INDIA",
            City1: "DELHI",
            City2: "MUMBAI",
            City3: "PUNE",
            City4: "CHENNAI"
          },
          {
            Country: "USA",
            City1: "NEW YORK",
            City2: "CHICAGO",
            City3: "BOSTON",
            City4: "DALLAS"
          }
        ];

        const instructions = [
          {
            Instructions:
              "SUPPORTED FORMAT 1: Country in Column A and multiple cities separated by commas in Column B."
          },
          {
            Instructions:
              "SUPPORTED FORMAT 2: Write Country once, then put additional cities on following rows with blank Country cells."
          },
          {
            Instructions:
              "SUPPORTED FORMAT 3: Country + City1 + City2 + City3 + City4 etc."
          },
          {
            Instructions:
              "Cities may be separated by comma (,), semicolon (;), pipe (|), or line breaks."
          },
          {
            Instructions:
              "100+ countries and 100+ cities per country are supported."
          },
          {
            Instructions:
              "Duplicate countries and duplicate cities are ignored automatically."
          },
          {
            Instructions:
              "Recommended headers: Country and City."
          }
        ];

        const workbook =
          XLSX.utils.book_new();

        const mainSheet =
          XLSX.utils.json_to_sheet(
            sampleData
          );

        const rowSheet =
          XLSX.utils.json_to_sheet(
            multipleRowsExample
          );

        const columnSheet =
          XLSX.utils.json_to_sheet(
            multipleColumnsExample
          );

        const instructionSheet =
          XLSX.utils.json_to_sheet(
            instructions
          );

        XLSX.utils.book_append_sheet(
          workbook,
          mainSheet,
          "Recommended Format"
        );

        XLSX.utils.book_append_sheet(
          workbook,
          rowSheet,
          "Multiple Rows Format"
        );

        XLSX.utils.book_append_sheet(
          workbook,
          columnSheet,
          "Multiple City Columns"
        );

        XLSX.utils.book_append_sheet(
          workbook,
          instructionSheet,
          "Instructions"
        );

        XLSX.writeFile(
          workbook,
          "Location_Bulk_Upload_Demo.xlsx"
        );

        showToast(
          "Location Excel demo downloaded!"
        );
      };

      const handleExcelFileUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  if (isLocationUploading) {
  showToast(
    "A location upload is already in progress. Please wait for it to finish."
  );

  e.target.value = "";
  return;
}

  // Allow the same file to be selected again later
  e.target.value = "";

  // Open live upload popup
  setIsLocationUploadOpen(true);
  setIsLocationUploading(true);
  setLocationUploadProgress(2);
  setLocationUploadStatus("Reading Excel file...");
  setLocationUploadProcessed(0);
  setLocationUploadTotal(0);
  setLocationUploadResult(null);

  // Give React time to display the popup before heavy work starts
  await new Promise<void>((resolve) =>
    setTimeout(resolve, 50)
  );

  try {
    const XLSX = await import("xlsx");

    setLocationUploadProgress(5);
    setLocationUploadStatus("Loading Excel workbook...");

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array"
    });

    if (!workbook.SheetNames.length) {
      throw new Error("Excel file contains no sheets.");
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new Error(
        "Unable to read the first Excel sheet."
      );
    }

    setLocationUploadProgress(10);
    setLocationUploadStatus("Reading location rows...");

    const rows =
      XLSX.utils.sheet_to_json<Record<string, any>>(
        worksheet,
        {
          defval: "",
          raw: false
        }
      );

    if (!rows.length) {
      throw new Error(
        "Excel file is empty or no usable rows were found."
      );
    }

    setLocationUploadTotal(rows.length);
    setLocationUploadStatus(
      `Preparing ${rows.length.toLocaleString()} Excel rows...`
    );

    // Existing countries
    const countryMap = new Map<string, string>();

    countriesList.forEach((country) => {
      const name =
        typeof country === "string"
          ? country.trim()
          : String(
              (country as any)?.name ||
                (country as any)?.id ||
                ""
            ).trim();

      if (!name) return;

      const normalized = name.toUpperCase();

      countryMap.set(normalized, normalized);
    });

    // Existing cities
    const cityMap = new Map<
      string,
      {
        name: string;
        country: string;
      }
    >();

    citiesList.forEach((city) => {
      const cityName = String(
        city?.name || ""
      )
        .trim()
        .toUpperCase();

      const countryName = String(
        city?.country || ""
      )
        .trim()
        .toUpperCase();

      if (!cityName || !countryName) return;

      cityMap.set(
        `${countryName}:::${cityName}`,
        {
          name: cityName,
          country: countryName
        }
      );
    });

    /*
 * Load existing cities from Supabase for every country
 * present in the Excel file.
 *
 * This allows the importer to distinguish:
 * - genuinely new cities
 * - cities already stored in the database
 */
setLocationUploadStatus(
  "Checking existing locations in database..."
);

const excelCountries = new Set<string>();

rows.forEach((row) => {
  const keys = Object.keys(row);

  if (!keys.length) return;

  const countryKey =
    keys.find((key) =>
      key
        .trim()
        .toLowerCase()
        .includes("country")
    ) || keys[0];

  const countryName = String(
    row[countryKey] || ""
  )
    .trim()
    .toUpperCase();

  if (countryName) {
    excelCountries.add(countryName);
  }
});

for (const country of excelCountries) {
  const existingCities =
    await fetchCitiesByCountryFromSupabase(
      country
    );

  existingCities.forEach((city) => {
    const cityName = String(
      city?.name || ""
    )
      .trim()
      .toUpperCase();

    const countryName = String(
      city?.country || country
    )
      .trim()
      .toUpperCase();

    if (!cityName) return;

    cityMap.set(
      `${countryName}:::${cityName}`,
      {
        name: cityName,
        country: countryName
      }
    );
  });
}

    const originalCountryCount =
      countryMap.size;

    const originalCityCount =
      cityMap.size;

    const existingCountryNames =
      new Set(countryMap.keys());

    const existingCityKeys =
      new Set(cityMap.keys());

   let currentCountry = "";
    let skippedRows = 0;

    let duplicateCountries = 0;
    let duplicateCities = 0;

    const duplicateCountryNames =
      new Set<string>();

    const duplicateCityKeys =
    new Set<string>();

    const splitCities = (
      value: any
    ): string[] => {
      const raw = String(
        value ?? ""
      ).trim();

      if (!raw) return [];

      return raw
        .split(/[,;|\n\r]+/)
        .map((city) =>
          city.trim().toUpperCase()
        )
        .filter(Boolean);
    };

    /*
     * Process rows in chunks.
     *
     * This prevents a very large Excel file from
     * freezing the Admin Portal for a long time.
     */
    const PROCESS_BATCH_SIZE = 500;

    for (
      let startIndex = 0;
      startIndex < rows.length;
      startIndex += PROCESS_BATCH_SIZE
    ) {
      const endIndex = Math.min(
        startIndex + PROCESS_BATCH_SIZE,
        rows.length
      );

      const rowBatch = rows.slice(
        startIndex,
        endIndex
      );

      rowBatch.forEach((row) => {
        const keys = Object.keys(row);

        if (!keys.length) {
          skippedRows++;
          return;
        }

        // Find Country column
        const countryKey = keys.find(
          (key) => {
            const normalized = key
              .trim()
              .toLowerCase();

            return (
              normalized === "country" ||
              normalized.includes(
                "country name"
              ) ||
              normalized.includes("country")
            );
          }
        );

        // Find every city column:
        // City, Cities, City1, City2, City 1...
        const cityKeys = keys.filter(
          (key) => {
            const normalized = key
              .trim()
              .toLowerCase();

            return (
              normalized === "city" ||
              normalized === "cities" ||
              normalized.includes("city") ||
              normalized.includes("cities")
            );
          }
        );

        const fallbackCountryKey =
          countryKey || keys[0];

        let fallbackCityKeys =
          cityKeys;

        if (
          fallbackCityKeys.length === 0 &&
          keys.length > 1
        ) {
          fallbackCityKeys =
            keys.slice(1);
        }

        const countryCell = String(
          row[fallbackCountryKey] || ""
        ).trim();

        /*
         * A new Country value changes the active country.
         * Blank Country cells continue using the country
         * from the previous row.
         */
        if (countryCell) {
          currentCountry =
            countryCell.toUpperCase();

          if (
            countryMap.has(currentCountry)
          ) {
            duplicateCountryNames.add(
              currentCountry
            );
          }

          countryMap.set(
            currentCountry,
            currentCountry
          );
        }

        // No country has been found yet
        if (!currentCountry) {
          skippedRows++;
          return;
        }

        const citiesFromRow: string[] =
          [];

        fallbackCityKeys.forEach(
          (key) => {
            citiesFromRow.push(
              ...splitCities(row[key])
            );
          }
        );

        // Remove duplicate city values inside this row
        const uniqueRowCities =
          Array.from(
            new Set(citiesFromRow)
          );

        uniqueRowCities.forEach(
          (cityName) => {
            if (!cityName) return;

            const uniqueCityKey =
              `${currentCountry}:::${cityName}`;

            if (
              cityMap.has(uniqueCityKey)
            ) {
              duplicateCityKeys.add(
                uniqueCityKey
              );
              return;
            }

            cityMap.set(
              uniqueCityKey,
              {
                name: cityName,
                country:
                  currentCountry
              }
            );
          }
        );
      });

      const processed =
        endIndex;

      setLocationUploadProcessed(
        processed
      );

      /*
       * Excel processing uses progress 10% → 70%.
       */
      const processingProgress =
        10 +
        Math.round(
          (processed / rows.length) * 60
        );

      setLocationUploadProgress(
        Math.min(
          processingProgress,
          70
        )
      );

      setLocationUploadStatus(
        `Processing locations... ${processed.toLocaleString()} / ${rows.length.toLocaleString()} rows`
      );

      // Allow browser to redraw the progress popup
        await new Promise<void>(
          (resolve) =>
            setTimeout(resolve, 0)
        );
        }

        duplicateCountries =
          duplicateCountryNames.size;

        duplicateCities =
          duplicateCityKeys.size;

        setLocationUploadProgress(72);
        setLocationUploadStatus(
          "Preparing countries for upload..."
        );
    const finalCountries =
      Array.from(
        countryMap.values()
      ).sort((a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            sensitivity: "base"
          }
        )
      );

    const finalCities =
      Array.from(
        cityMap.values()
      ).sort((a, b) => {
        const countryCompare =
          a.country.localeCompare(
            b.country,
            undefined,
            {
              sensitivity: "base"
            }
          );

        if (
          countryCompare !== 0
        ) {
          return countryCompare;
        }

        return a.name.localeCompare(
          b.name,
          undefined,
          {
            sensitivity: "base"
          }
        );
      });

  const newCountries =
  finalCountries.filter(
    (country) =>
      !existingCountryNames.has(
        String(country)
          .trim()
          .toUpperCase()
      )
  );

const newCities =
  finalCities.filter((city) => {
    const countryName = String(
      city?.country || ""
    )
      .trim()
      .toUpperCase();

    const cityName = String(
      city?.name || ""
    )
      .trim()
      .toUpperCase();

    return !existingCityKeys.has(
      `${countryName}:::${cityName}`
    );
  });

const addedCountries =
  newCountries.length;

const addedCities =
  newCities.length;

    /*
     * Database save.
     *
     * We will improve the database side batching
     * in the next step after this frontend
     * progress version is validated.
     */
    setLocationUploadProgress(72);
setLocationUploadStatus(
  "Uploading countries to database..."
);

let countriesSaved = true;

if (newCountries.length > 0) {
  countriesSaved = await saveToSupabase(
    "countries",
    newCountries,
    (processed, total) => {
      const progress =
        total > 0
          ? 72 +
            Math.round(
              (processed / total) * 8
            )
          : 80;

      setLocationUploadProgress(
        Math.min(progress, 80)
      );

      setLocationUploadStatus(
        `Uploading countries... ${processed.toLocaleString()} / ${total.toLocaleString()}`
      );
    }
  );
}

if (!countriesSaved) {
  throw new Error(
    "Country database upload failed."
  );
}

if (onUpdateCountries) {
  onUpdateCountries(finalCountries);
}

setLocationUploadProgress(80);
setLocationUploadStatus(
  "Uploading cities to database..."
);

let citiesSaved = true;

if (newCities.length > 0) {
  citiesSaved = await saveToSupabase(
    "cities",
    newCities,
    (processed, total) => {
      const progress =
        total > 0
          ? 80 +
            Math.round(
              (processed / total) * 17
            )
          : 97;

      setLocationUploadProgress(
        Math.min(progress, 97)
      );

      setLocationUploadStatus(
        `Uploading cities... ${processed.toLocaleString()} / ${total.toLocaleString()}`
      );
    }
  );
}

if (!citiesSaved) {
  throw new Error(
    "City database upload failed."
  );
}

setAdminCitiesByCountry({});
setAdminCitiesLoading({});

setLocationUploadProgress(97);
    setLocationUploadStatus(
      "Finalizing location database..."
    );

    triggerBroadcastSync();

    setLocationUploadProcessed(
      rows.length
    );

    setLocationUploadResult({
    countriesAdded:
      addedCountries,
    citiesAdded:
      addedCities,
    duplicateCountries,
    duplicateCities,
    rowsSkipped: skippedRows
  });

    setLocationUploadProgress(100);
    setLocationUploadStatus(
      "Location upload completed successfully!"
    );

    setIsLocationUploading(false);

    showToast(
      `Excel upload complete: ${addedCountries} new countries and ${addedCities} new cities added.`
    );
  } catch (error) {
    console.error(
      "Location Excel upload failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Excel upload failed.";

    setLocationUploadStatus(
      message
    );

    setIsLocationUploading(false);

    showToast(
      "Excel upload failed. Please check the file and try again."
    );
  }
};

        // Excel Bulk Upload and Demo File Download Handlers for Topic & Discipline Management
      const downloadDemoTopicsExcel = async () => {
        const XLSX = await import("xlsx");

        const sampleTopicData = [
          {
            "Topic Name": "Artificial Intelligence & Machine Learning"
          },
          {
            "Topic Name": "Computer Science & Engineering"
          },
          {
            "Topic Name": "Data Science & Analytics"
          },
          {
            "Topic Name": "Cybersecurity & Network Defense"
          },
          {
            "Topic Name": "Quantum Computing"
          },
          {
            "Topic Name": "Robotics & Automation"
          },
          {
            "Topic Name": "Renewable Energy & Sustainability"
          }
        ];

        const instructionsData = [
          {
            Instructions:
              "Use only one column named Topic Name."
          },
          {
            Instructions:
              "One topic per row is recommended."
          },
          {
            Instructions:
              "Multiple topics may also be written in one cell separated by comma, semicolon, pipe, or line break."
          },
          {
            Instructions:
              "If the same topic already exists, the uploaded topic replaces/updates the existing topic instead of creating a duplicate."
          },
          {
            Instructions:
              "Duplicate matching is case-insensitive. Example: Data Science and DATA SCIENCE are treated as the same topic."
          },
          {
            Instructions:
              "Blank rows are ignored automatically."
          }
        ];

        const workbook =
          XLSX.utils.book_new();

        const topicSheet =
          XLSX.utils.json_to_sheet(
            sampleTopicData
          );

        const instructionSheet =
          XLSX.utils.json_to_sheet(
            instructionsData
          );

        XLSX.utils.book_append_sheet(
          workbook,
          topicSheet,
          "Topics"
        );

        XLSX.utils.book_append_sheet(
          workbook,
          instructionSheet,
          "Instructions"
        );

        XLSX.writeFile(
          workbook,
          "Topic_Upload_Demo.xlsx"
        );

        showToast(
          "Topic demo Excel downloaded successfully!"
        );
      };

          const handleTopicsExcelFileUpload = (
            e: React.ChangeEvent<HTMLInputElement>
          ) => {
            const file = e.target.files?.[0];

            if (!file) return;

            const reader = new FileReader();

            reader.onload = async (evt) => {
              try {
                const XLSX = await import("xlsx");

                const buffer = evt.target?.result;

                if (!buffer) {
                  showToast("Unable to read Excel file.");
                  return;
                }

                const workbook = XLSX.read(buffer, {
                  type: "array"
                });

                if (!workbook.SheetNames.length) {
                  showToast("Excel file contains no sheets.");
                  return;
                }

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                  showToast("Unable to read Excel sheet.");
                  return;
                }

                const rows =
                  XLSX.utils.sheet_to_json<Record<string, any>>(
                    worksheet,
                    {
                      defval: "",
                      raw: false
                    }
                  );

                if (!rows.length) {
                  showToast(
                    "Excel file is empty or no usable rows were found."
                  );
                  return;
                }

                // Existing topics indexed by normalized name
                const topicMap = new Map<
                  string,
                  Partial<Category>
                >();

                categories.forEach((cat) => {
                  const normalizedName = String(
                    cat.name || ""
                  )
                    .trim()
                    .toLowerCase();

                  if (!normalizedName) return;

                  topicMap.set(normalizedName, {
                    ...cat
                  });
                });

                const originalCount = topicMap.size;

                let processedCount = 0;
                let replacedCount = 0;
                let skippedCount = 0;

                const existingTopicNames = new Set(
                  categories
                    .map((cat) =>
                      String(cat.name || "")
                        .trim()
                        .toLowerCase()
                    )
                    .filter(Boolean)
                );

                rows.forEach((row) => {
                  const keys = Object.keys(row);

                  if (!keys.length) {
                    skippedCount++;
                    return;
                  }

                  const nameKey =
                    keys.find((key) => {
                      const normalized =
                        key.trim().toLowerCase();

                      return (
                        normalized.includes("topic") ||
                        normalized.includes("category") ||
                        normalized === "name" ||
                        normalized.includes("discipline")
                      );
                    }) || keys[0];

                  const rawNameValue = String(
                    row[nameKey] || ""
                  ).trim();

                  if (!rawNameValue) {
                    skippedCount++;
                    return;
                  }

                  // Support comma, semicolon, pipe and line-break separated topics
                  const topicNames = rawNameValue
                    .split(/[,;|\n\r]+/)
                    .map((name) => name.trim())
                    .filter(Boolean);

                  topicNames.forEach((topicName) => {
                    const normalizedName =
                      topicName.toLowerCase();

                    const existing =
                      topicMap.get(normalizedName);

                    const slug = topicName
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "");

                    if (existing) {
                      // Replace/update duplicate instead of creating another row
                      topicMap.set(normalizedName, {
                              ...existing,
                              name: topicName,
                              slug
                            });

                    } else {
                     topicMap.set(normalizedName, {
                      id: slug || `topic-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,
                      name: topicName,
                      slug
                    });
                    }

                    if (existingTopicNames.has(normalizedName)) {
                      replacedCount++;
                    }
                  });
                });

                const finalTopics =
                  Array.from(topicMap.values());

                const addedCount =
                  finalTopics.length - originalCount;

                if (!finalTopics.length) {
                  showToast(
                    "No valid topics were found in the Excel file."
                  );
                  return;
                }

              

               // Save through App.tsx topic handler
              if (onAddBulkCategories) {
                await onAddBulkCategories(
                  finalTopics
                );
              } else {
                for (const item of finalTopics) {
                  await onAddCategory(item);
                }
              }

                triggerBroadcastSync();

                showToast(
                  `Excel upload complete: ${addedCount} new topic(s), ${replacedCount} duplicate topic(s) replaced.${skippedCount > 0 ? ` ${skippedCount} blank/invalid row(s) skipped.` : ""}`
                );
              } catch (error) {
                console.error(
                  "Topic Excel upload failed:",
                  error
                );

                showToast(
                  "Error parsing Excel file. Please check the file format."
                );
              }
            };

            reader.onerror = () => {
              showToast(
                "Unable to read the selected Excel file."
              );
            };

            reader.readAsArrayBuffer(file);

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
    const mediaPartnerReqs = mediaPartners.length;
    const associateReqs = associates.length;
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

  const [topicSearchQuery, setTopicSearchQuery] = useState("");

  const [showAddCountryForm, setShowAddCountryForm] = useState(false);
  const [showAddCityForm, setShowAddCityForm] = useState(false);
  const [showAddTopicForm, setShowAddTopicForm] = useState(false);

  // Feedback management states

  const [fbSearchQuery, setFbSearchQuery] = useState("");

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

  // About Us management states
const [aboutUsContent, setAboutUsContent] = useState<AboutUsContent>({
  id: "primary",
  mission_badge: "Our Mission",
  title: "About International Conference",
  paragraph1: "",
  paragraph2: "",
  stat1_value: "100% Vetted",
  stat1_label: "Deception-Free Listings",
  stat2_value: "30+ Countries",
  stat2_label: "Worldwide Coverage",
  image_url: ""
});

const [aboutUsOriginal, setAboutUsOriginal] = useState<AboutUsContent | null>(null);
const [isEditingAboutUs, setIsEditingAboutUs] = useState(false);
const [isSavingAboutUs, setIsSavingAboutUs] = useState(false);
const [isLoadingAboutUs, setIsLoadingAboutUs] = useState(true);

// Privacy Policy management states
const [privacyPolicy, setPrivacyPolicy] =
  useState<PrivacyPolicyContent>({
    id: "primary",
    title: "Privacy Policy",
    content: ""
  });

const [privacyPolicyOriginal, setPrivacyPolicyOriginal] =
  useState<PrivacyPolicyContent | null>(null);

const [isEditingPrivacyPolicy, setIsEditingPrivacyPolicy] =
  useState(false);

const [isSavingPrivacyPolicy, setIsSavingPrivacyPolicy] =
  useState(false);

const [isLoadingPrivacyPolicy, setIsLoadingPrivacyPolicy] =
  useState(true);

// Terms of Service management states
const [termsOfService, setTermsOfService] =
  useState<TermsOfServiceContent>({
    id: "primary",
    title: "Terms of Service",
    content: ""
  });

const [termsOfServiceOriginal, setTermsOfServiceOriginal] =
  useState<TermsOfServiceContent | null>(null);

const [isEditingTermsOfService, setIsEditingTermsOfService] =
  useState(false);

const [isSavingTermsOfService, setIsSavingTermsOfService] =
  useState(false);

const [isLoadingTermsOfService, setIsLoadingTermsOfService] =
  useState(true);


// Home Main Description management states
const [homeDescription, setHomeDescription] = useState<HomeDescriptionContent>({
  id: "primary",
  description: ""
});

const [homeDescriptionOriginal, setHomeDescriptionOriginal] =
  useState<HomeDescriptionContent | null>(null);

const [isEditingHomeDescription, setIsEditingHomeDescription] =
  useState(false);

const [isSavingHomeDescription, setIsSavingHomeDescription] =
  useState(false);

const [isLoadingHomeDescription, setIsLoadingHomeDescription] =
  useState(true);


  // Conference Description management states
const [conferenceDescription, setConferenceDescription] =
  useState<ConferenceDescriptionContent>({
    id: "primary",
    default_description:
  "Discover verified, peer-reviewed, and high-impact academic conferences, research symposiums, and professional summits from around the world. All listed events undergo rigorous vetting by International Conference to ensure credential legitimacy, past record authenticity, and index authority.",
    topic_description: "",
    country_description: "",
    city_description: "",
    topic_country_description: "",
    combined_description: ""
  });

const [conferenceDescriptionOriginal, setConferenceDescriptionOriginal] =
  useState<ConferenceDescriptionContent | null>(null);

const [isEditingConferenceDescription, setIsEditingConferenceDescription] =
  useState(false);

const [isSavingConferenceDescription, setIsSavingConferenceDescription] =
  useState(false);

const [isLoadingConferenceDescription, setIsLoadingConferenceDescription] =
  useState(true);

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

  const handleSaveAboutUs = async () => {
  if (!aboutUsContent.title.trim()) {
    showToast("About Us title cannot be empty.");
    return;
  }

  if (!aboutUsContent.paragraph1.trim()) {
    showToast("About Us first paragraph cannot be empty.");
    return;
  }

  setIsSavingAboutUs(true);

  try {
    const updatedContent: AboutUsContent = {
      ...aboutUsContent,
      id: "primary",
      updated_at: new Date().toISOString()
    };

    const saved = await saveToSupabase("about_us", updatedContent);

    if (!saved) {
      showToast("Unable to save About Us changes.");
      return;
    }

    setAboutUsContent(updatedContent);
    setAboutUsOriginal(updatedContent);
    setIsEditingAboutUs(false);

    triggerBroadcastSync();

    showToast("About Us page updated successfully!");
  } catch (error) {
    console.error("Failed to save About Us:", error);
    showToast("Unable to save About Us changes.");
  } finally {
    setIsSavingAboutUs(false);
  }
};

const handleSavePrivacyPolicy = async () => {
  if (!privacyPolicy.title.trim()) {
    showToast("Privacy Policy title cannot be empty.");
    return;
  }

  if (!privacyPolicy.content.trim()) {
    showToast("Privacy Policy content cannot be empty.");
    return;
  }

  setIsSavingPrivacyPolicy(true);

  try {
    const updatedContent: PrivacyPolicyContent = {
      ...privacyPolicy,
      id: "primary",
      updated_at: new Date().toISOString()
    };

    const saved = await saveToSupabase(
      "privacy_policy",
      updatedContent
    );

    if (!saved) {
      showToast("Unable to save Privacy Policy.");
      return;
    }

    setPrivacyPolicy(updatedContent);
    setPrivacyPolicyOriginal(updatedContent);
    setIsEditingPrivacyPolicy(false);

    triggerBroadcastSync();

    showToast("Privacy Policy updated successfully!");
  } catch (error) {
    console.error("Failed to save Privacy Policy:", error);
    showToast("Unable to save Privacy Policy.");
  } finally {
    setIsSavingPrivacyPolicy(false);
  }
};

const handleCancelPrivacyPolicyEdit = () => {
  if (privacyPolicyOriginal) {
    setPrivacyPolicy({
      ...privacyPolicyOriginal
    });
  }

  setIsEditingPrivacyPolicy(false);
};

const handleSaveTermsOfService = async () => {
  if (!termsOfService.title.trim()) {
    showToast("Terms of Service title cannot be empty.");
    return;
  }

  if (!termsOfService.content.trim()) {
    showToast("Terms of Service content cannot be empty.");
    return;
  }

  setIsSavingTermsOfService(true);

  try {
    const updatedContent: TermsOfServiceContent = {
      ...termsOfService,
      id: "primary",
      updated_at: new Date().toISOString()
    };

    const saved = await saveToSupabase(
      "terms_of_service",
      updatedContent
    );

    if (!saved) {
      showToast("Unable to save Terms of Service.");
      return;
    }

    setTermsOfService(updatedContent);
    setTermsOfServiceOriginal(updatedContent);
    setIsEditingTermsOfService(false);

    triggerBroadcastSync();

    showToast("Terms of Service updated successfully!");
  } catch (error) {
    console.error("Failed to save Terms of Service:", error);
    showToast("Unable to save Terms of Service.");
  } finally {
    setIsSavingTermsOfService(false);
  }
};

const handleCancelTermsOfServiceEdit = () => {
  if (termsOfServiceOriginal) {
    setTermsOfService({
      ...termsOfServiceOriginal
    });
  }

  setIsEditingTermsOfService(false);
};

const handleSaveHomeDescription = async () => {
  if (!homeDescription.description.trim()) {
    showToast("Main Description cannot be empty.");
    return;
  }

  setIsSavingHomeDescription(true);

  try {
    const updatedContent: HomeDescriptionContent = {
      ...homeDescription,
      id: "primary",
      updated_at: new Date().toISOString()
    };

    const result = await saveRecordToSupabase(
      "home_description",
      updatedContent
    );

    if (!result.success) {
      console.error(
        "Home Description save failed:",
        result.error
      );

      showToast(
        result.error || "Unable to save Main Description."
      );

      return;
    }

    setHomeDescription(updatedContent);
    setHomeDescriptionOriginal(updatedContent);
    setIsEditingHomeDescription(false);

    triggerBroadcastSync();

    showToast("Main Description updated successfully!");
  } catch (error) {
    console.error(
      "Failed to save Main Description:",
      error
    );

    showToast("Unable to save Main Description.");
  } finally {
    setIsSavingHomeDescription(false);
  }
};


const handleCancelHomeDescriptionEdit = () => {
  if (homeDescriptionOriginal) {
    setHomeDescription({
      ...homeDescriptionOriginal
    });
  }

  setIsEditingHomeDescription(false);
};

const handleSaveConferenceDescription = async () => {
  if (!conferenceDescription.default_description.trim()) {
    showToast("Default Description cannot be empty.");
    return;
  }

  if (!conferenceDescription.topic_description.trim()) {
    showToast("Topic Description cannot be empty.");
    return;
  }

  if (!conferenceDescription.country_description.trim()) {
    showToast("Country Description cannot be empty.");
    return;
  }

  if (!conferenceDescription.city_description.trim()) {
    showToast("City Description cannot be empty.");
    return;
  }

  if (!conferenceDescription.topic_country_description.trim()) {
  showToast("Topic + Country Description cannot be empty.");
  return;
  }

  if (!conferenceDescription.combined_description.trim()) {
    showToast("Combined Description cannot be empty.");
    return;
  }

  setIsSavingConferenceDescription(true);

  try {
    const updatedContent: ConferenceDescriptionContent = {
      ...conferenceDescription,
      id: "primary",
      updated_at: new Date().toISOString()
    };

    const result = await saveRecordToSupabase(
      "conference_descriptions",
      updatedContent
    );

    if (!result.success) {
      console.error(
        "Conference Description save failed:",
        result.error
      );

      showToast(
        result.error || "Unable to save Conference Description."
      );

      return;
    }

    setConferenceDescription(updatedContent);
    setConferenceDescriptionOriginal(updatedContent);
    setIsEditingConferenceDescription(false);

    triggerBroadcastSync();

    showToast("Conference Description updated successfully!");
  } catch (error) {
    console.error(
      "Failed to save Conference Description:",
      error
    );

    showToast("Unable to save Conference Description.");
  } finally {
    setIsSavingConferenceDescription(false);
  }
};



const handleCancelConferenceDescriptionEdit = () => {
  if (conferenceDescriptionOriginal) {
    setConferenceDescription({
      ...conferenceDescriptionOriginal
    });
  }

  setIsEditingConferenceDescription(false);
};

const handleCancelAboutUsEdit = () => {
  if (aboutUsOriginal) {
    setAboutUsContent({ ...aboutUsOriginal });
  }

  setIsEditingAboutUs(false);
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

  const [newAdminEmail, setNewAdminEmail] = useState(
  authUser?.email || ""
);

const [isSavingCredentials, setIsSavingCredentials] =
  useState(false);

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

  const handleUpdateAdminCredentials = async (
  e: React.FormEvent
) => {
  e.preventDefault();

  if (!currentPassword.trim()) {
    showToast("Current password is required.");
    return;
  }

  if (
    newPassword &&
    newPassword !== confirmPassword
  ) {
    showToast("New passwords do not match.");
    return;
  }

  setIsSavingCredentials(true);

  try {
    const res = await adminFetch(
      "/api/admin/update-credentials",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword,
          newEmail: newAdminEmail,
          newPassword,
          confirmPassword
        })
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(
        data.error || "Unable to update Admin credentials."
      );
      return;
    }

    setAdminProfile((prev) => ({
      ...prev,
      email: data.email || prev.email
    }));

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    showToast("Admin credentials updated successfully!");
  } catch (error) {
    console.error(
      "Admin credentials update failed:",
      error
    );

    showToast("Unable to update Admin credentials.");
  } finally {
    setIsSavingCredentials(false);
  }
};

  // Database Reset States
  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    const handleResetDatabase = async () => {
    setResetStatus(null);

    if (!resetAdminPassword) {
      setResetStatus({
        type: "error",
        msg: "Super Admin password is required."
      });
      return;
    }

    const warning =
      "This will permanently delete ALL application data from the database. " +
      "Your Super Admin login/profile will be preserved. " +
      "This action cannot be undone.";

    if (
      !window.confirm(
        `Permanently delete the FULL application database?\n\n${warning}`
      )
    ) {
      return;
    }

    setIsResettingDb(true);

    try {
      const res = await adminFetch("/api/admin/reset-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          adminPassword: resetAdminPassword,
          scope: "all"
        })
      });

      const data = await res.json();

      if (data && data.success) {
        setResetStatus({
          type: "success",
          msg: data.message || "Full database successfully deleted!"
        });

        setResetAdminPassword("");

        showToast("Full database deletion complete!");

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResetStatus({
          type: "error",
          msg: data.error || "Failed to delete full database."
        });
      }
    } catch (err: any) {
      setResetStatus({
        type: "error",
        msg: "Server error while deleting the full database."
      });
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
    <div className="h-[100dvh] w-full max-w-full overflow-hidden bg-slate-100 flex flex-col text-slate-800 font-sans">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-[#37494E] text-white px-4 sm:px-5 py-3 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 flex items-start gap-2 text-xs font-bold animate-bounce min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="min-w-0 break-words">{toastMessage}</span>
          </div>
        )}

                {/* Location Excel Live Upload Progress Modal */}
        {isLocationUploadOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

              {/* Header */}
              <div className="bg-[#37494E] px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                    {isLocationUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : locationUploadProgress === 100 ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-amber-300" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold">
                      Location Excel Upload
                    </h3>

                    <p className="text-xs text-slate-300 mt-0.5">
                      {isLocationUploading
                        ? "Please wait while your location data is processed."
                        : locationUploadProgress === 100
                          ? "Import completed successfully."
                          : "Import stopped before completion."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">

                {/* Current Status */}
                <div className="mb-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      {locationUploadStatus || "Preparing upload..."}
                    </span>

                    <span className="text-sm font-black text-[#37494E]">
                      {locationUploadProgress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-[#37494E] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, locationUploadProgress)
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {/* Row Progress */}
                {locationUploadTotal > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Excel rows processed
                      </span>

                      <span className="text-sm font-extrabold text-slate-800">
                        {locationUploadProcessed.toLocaleString()}
                        {" / "}
                        {locationUploadTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Uploading message */}
                {isLocationUploading && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin mt-0.5 shrink-0" />

                    <div>
                      <p className="text-xs font-bold text-blue-900">
                        Upload in progress
                      </p>

                      <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                        Please keep this page open until the upload is complete.
                        Large Excel files may take additional time.
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed Summary */}
                {!isLocationUploading &&
                  locationUploadProgress === 100 &&
                  locationUploadResult && (
                    <div className="space-y-4">

                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />

                        <div>
                          <p className="text-sm font-extrabold text-emerald-900">
                            Upload completed
                          </p>

                          <p className="text-[11px] text-emerald-700 mt-1">
                            Your country and city data has been processed successfully.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">

                        <div className="border border-slate-200 rounded-2xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Countries Added
                          </p>
                          <p className="text-xl font-black text-slate-800 mt-1">
                            {locationUploadResult.countriesAdded.toLocaleString()}
                          </p>
                        </div>

                        <div className="border border-slate-200 rounded-2xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Cities Added
                          </p>
                          <p className="text-xl font-black text-slate-800 mt-1">
                            {locationUploadResult.citiesAdded.toLocaleString()}
                          </p>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Duplicate Countries
                        </p>

                        <p className="text-xl font-black text-slate-800 mt-1">
                          {locationUploadResult.duplicateCountries.toLocaleString()}
                        </p>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Duplicate Cities
                        </p>

                        <p className="text-xl font-black text-slate-800 mt-1">
                          {locationUploadResult.duplicateCities.toLocaleString()}
                        </p>
                      </div>

                        <div className="border border-slate-200 rounded-2xl p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Rows Skipped
                          </p>
                          <p className="text-xl font-black text-slate-800 mt-1">
                            {locationUploadResult.rowsSkipped.toLocaleString()}
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                {/* Error */}
                {!isLocationUploading &&
                  locationUploadProgress !== 100 &&
                  locationUploadStatus && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                      <div>
                        <p className="text-sm font-extrabold text-red-900">
                          Upload failed
                        </p>

                        <p className="text-[11px] text-red-700 mt-1 break-words">
                          {locationUploadStatus}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Close Button */}
                {!isLocationUploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationUploadOpen(false);
                      setLocationUploadProgress(0);
                      setLocationUploadStatus("");
                      setLocationUploadProcessed(0);
                      setLocationUploadTotal(0);
                      setLocationUploadResult(null);
                    }}
                    className="mt-6 w-full bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 1. Fixed Top Navbar Header */}
        <header className="h-16 bg-[#37494E] text-white px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 shadow-md z-40 shrink-0 border-b border-[#2c3b3f] min-w-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
              title="Toggle Sidebar Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-[80px] h-10 sm:w-[140px] sm:h-10 flex items-center justify-start shrink-0">
                <img
                  src="/company-logo.png"
                  alt="International Conference Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide text-white leading-tight font-display">
                  Admin Dashboard
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
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
                <p className="text-xs font-bold text-white leading-none">
                  {adminProfile.name || "Super Admin"}
                </p>
                <p className="text-[10px] text-slate-300 leading-none mt-1">
                  {adminProfile.email || "Not configured"}
                </p>
              </div>
            </button>

          {/* Mobile Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-xl transition-all cursor-pointer border border-rose-500/30"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
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
                    <button
                      onClick={() => {
                        setActiveMenu("ABOUT_INFO");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "ABOUT_INFO"
                          ? "text-white font-bold bg-white/20"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      About Us
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("HOME_DESCRIPTION");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "HOME_DESCRIPTION"
                          ? "text-white font-bold bg-white/20"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Main Description
                    </button>

                    <button
                      onClick={() => {
                        setActiveMenu("CONFERENCE_DESCRIPTION");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "CONFERENCE_DESCRIPTION"
                          ? "text-white font-bold bg-white/20"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Conference Description
                    </button>

                      <button
                        onClick={() => {
                          setActiveMenu("PRIVACY_POLICY");
                          if (window.innerWidth < 1024) setIsSidebarOpen(false);
                        }}
                        className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                          activeMenu === "PRIVACY_POLICY"
                            ? "text-white font-bold bg-white/20"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Privacy Policy
                      </button>

                      <button
                        onClick={() => {
                          setActiveMenu("TERMS_OF_SERVICE");
                          if (window.innerWidth < 1024) setIsSidebarOpen(false);
                        }}
                        className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                          activeMenu === "TERMS_OF_SERVICE"
                            ? "text-white font-bold bg-white/20"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Terms of Service
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
        <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-y-auto overflow-x-hidden bg-slate-100 h-full">
          
          {/* Section Header */}
          <div className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-2 shadow-2xs sticky top-0 z-20 shrink-0 min-w-0">
            <h2 className="text-xs sm:text-sm md:text-base font-bold font-display text-[#37494E] leading-tight break-words min-w-0">
              {activeMenu.replace(/_/g, " ")}
            </h2>
          </div>

          {/* Content Body Container */}
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 min-w-0">

          {/* SECTION 1: DASHBOARD OVERVIEW */}
          {activeMenu === "DASHBOARD_OVERVIEW" && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-[#37494E]">{summaryMetrics.totalOrgs}</span>
                    <div className="p-2.5 bg-slate-100 rounded-xl text-[#37494E] hover-icon-scale"><Users className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Total Organizers</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-600">{summaryMetrics.totalConfs}</span>
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 hover-icon-scale"><FileText className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Total Conferences</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-600">{summaryMetrics.pendingConfs}</span>
                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 hover-icon-scale"><Clock className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Pending Conferences</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-600">{summaryMetrics.approvedConfs}</span>
                    <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 hover-icon-scale"><CheckCircle2 className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Approved Conferences</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-purple-600">{summaryMetrics.mediaPartnerReqs}</span>
                    <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 hover-icon-scale"><Award className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Media Partner Requests</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-indigo-600">{summaryMetrics.associateReqs}</span>
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 hover-icon-scale"><Building className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Associate Requests</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-rose-600">{summaryMetrics.feedbackCount}</span>
                    <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 hover-icon-scale"><MessageSquare className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Feedback Count</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl min-w-0 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-600">{summaryMetrics.subscriberCount}</span>
                    <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 hover-icon-scale"><Mail className="h-5 w-5" /></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-2">Subscriber Count</p>
                </div>
              </div>

              {/* Quick Actions & Audit Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-w-0">
                <div className="lg:col-span-2 bg-white p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-4 min-w-0">
                  <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 border-b border-slate-100 pb-3 min-w-0">
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
                            <div className="flex items-start gap-3.5 min-w-0">
                              <img
                                src={getCleanImageSrc(conf.bannerImage, "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80")}
                                alt={conf.title}
                                className="h-14 w-20 rounded-lg object-contain bg-slate-200 border border-slate-200 shrink-0 shadow-xs"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                                }}
                              />
                              <div className="min-w-0">
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
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-start gap-1 break-words min-w-0">
                                  <MapPin className="h-3 w-3" /> {conf.city}, {conf.country} • {formatConferenceDate(conf.startDate)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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

                <div className="bg-white p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-4 min-w-0">

                  <h3 className="font-bold text-sm text-[#37494E] flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Activity className="h-4 w-4 text-blue-500" /> Recent System Audit Logs
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs custom-scrollbar">
                    {auditLogs.slice(0, 6).map((log, logIdx) => (
                      <div key={log.id ? `${log.id}-${logIdx}` : `audit-log-${logIdx}`} className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1 min-w-0">
                        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1 min-w-0">
                          <span className="font-bold text-[#37494E] break-words min-w-0">{log.action}</span>
                          <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 break-words">
                          {typeof log.details === "string"
                            ? log.details
                            : JSON.stringify(log.details ?? "")}
                        </p>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase break-words">
                        By: {log.actor} ({log.role})
                      </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 13. ADMIN PROFILE MANAGEMENT VIEW */}
          {activeMenu === "ADMIN_PROFILE" && (
            <div className="max-w-4xl w-full mx-auto space-y-4 sm:space-y-6 min-w-0">
              <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs border border-slate-200 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5 mb-4 sm:mb-6 min-w-0">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#37494E]">Super Admin Profile</h2>
                    <p className="text-xs text-slate-500 mt-1"> Manage your Super Admin display name and profile photo.</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    Master Administrator
                  </span>
                </div>

                <form onSubmit={handleSaveAdminProfile} className="space-y-6">
                  {/* Avatar Upload / Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 min-w-0">
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

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100 min-w-0">
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

              <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs border border-slate-200 min-w-0">
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

                  <div className="flex items-center justify-end pt-4 border-t border-slate-100 min-w-0">
                    <button
                      type="submit"
                      disabled={isSavingPublicContact}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            <div className="max-w-xl w-full mx-auto space-y-4 sm:space-y-6 min-w-0">
              <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs border border-slate-200 min-w-0">
                <div className="flex items-start sm:items-center gap-3 border-b border-slate-100 pb-4 sm:pb-5 mb-4 sm:mb-6 min-w-0">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                    <Key className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#37494E] break-words">Admin Login Credentials</h2>
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

                <form
                      onSubmit={handleUpdateAdminCredentials}
                      className="space-y-4 text-xs"
                    >
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                          Admin Email / ID
                        </label>

                        <input
                          type="email"
                          required
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="Enter admin email"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                          Current Password
                        </label>

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
                            {showCurrentPw ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                          New Password
                        </label>

                        <div className="relative">
                          <input
                            type={showNewPw ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Leave blank if password is unchanged"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white"
                          />

                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPw ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                          Confirm New Password
                        </label>

                        <div className="relative">
                          <input
                            type={showConfirmPw ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 bg-white"
                          />

                          <button
                            type="button"
                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPw ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingCredentials}
                        className="w-full px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingCredentials
                          ? "Saving..."
                          : "Save Admin Credentials"}
                      </button>
                    </form>
              </div>
            </div>
          )}

          {/* 15. DATABASE RESET & SYSTEM PURGE VIEW */}
          {activeMenu === "DATABASE_RESET" && (
            <div className="max-w-3xl w-full mx-auto space-y-4 sm:space-y-6 min-w-0">
              <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xs border-2 border-rose-200 min-w-0">
                <div className="flex items-start sm:items-center gap-3.5 border-b border-rose-100 pb-4 sm:pb-5 mb-4 sm:mb-6 min-w-0">
                  <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs text-rose-600 font-semibold mt-0.5 break-words">Delete one section or reset the full application database</p>
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
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 text-xs">
                      Super Admin Password
                    </label>

                    <input
                      type="password"
                      value={resetAdminPassword}
                      onChange={(e) => setResetAdminPassword(e.target.value)}
                      placeholder="Enter Super Admin password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    disabled={isResettingDb || !resetAdminPassword}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isResettingDb ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    <span>
                      {isResettingDb
                        ? "Deleting Full Database..."
                        : "Delete Full Database"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: MANAGE ORGANIZERS */}
          {activeMenu === "MANAGE_ORGANIZERS" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E]">Organizer Management</h3>
                  <p className="text-xs text-slate-500">
                    Review completed organizer profiles, verify organizers, and manage organizer details.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full border border-slate-200">
                    Total: {organizers.length}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
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

                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto min-w-0 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
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
                    (statusFilter === "Verified" && o.isVerified);

                  return matchesSearch && matchesStatus;
                });

                if (filteredOrgs.length === 0) {
                  return (
                    <div className="text-center px-4 py-10 sm:py-12 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
                      <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No Organizers Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your search query or filter selection.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                    {filteredOrgs.map((org, orgIdx) => {
                      const pubCount = conferences.filter((c) => c.organizerId === org.id && c.status === ConferenceStatus.Approved).length;

                      return (
                        <div
                          key={org.id ? `${org.id}-${orgIdx}` : `org-mgmt-${orgIdx}`}
                          className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 min-w-0"
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

                          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 min-w-0">
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
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 min-w-0">
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
                    <div className="w-full min-[480px]:w-auto min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                      <div className="relative w-full sm:w-64 sm:flex-none">
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
                        className="w-full min-[480px]:w-auto min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
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
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                <div className="w-full overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[900px] text-left text-xs border-collapse">
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
                        <th className="p-3">Organizer</th>
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
                            <td className="p-3 font-semibold text-slate-700">
                              {organizers.find((org) => org.id === conf.organizerId)?.organizationName ||
                                conf.organizerId ||
                                "Unknown Organizer"}
                            </td>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600 min-w-0">
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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl w-full mx-auto min-w-0">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
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

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveMenu("MANAGE_CONFERENCES")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#37494E] hover:bg-[#2b3a3e] text-white font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    Save & Publish Event
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: MEDIA PARTNERS & ASSOCIATES */}
          {activeMenu === "MANAGE_MEDIA_PARTNERS" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
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
                </div>
              </div>

              {mediaPartners.length === 0 ? (
                <div className="text-center px-4 py-10 sm:py-12 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
                  <Globe className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Media Partners Submitted</p>
                  <p className="text-xs text-slate-400 mt-1">Submitted media partners will appear here for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mediaPartners.map((mp, mpIdx) => (
                    <div
                      key={mp.id || `mp-${mpIdx}`}
                      className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 min-w-0"
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

                        <button
                          onClick={async () => {
                            const updated = mediaPartners.map((m) => {
                              const isTarget =
                                mp.id && m.id
                                  ? m.id === mp.id
                                  : m.name === mp.name;

                              return isTarget
                                ? {
                                    ...m,
                                    isVerified: !Boolean(m.isVerified)
                                  }
                                : m;
                            });

                            const saveOk = await saveToSupabase("media_partners", updated);

                            if (!saveOk) {
                              showToast("Failed to update Media Partner verification.");
                              return;
                            }

                            setMediaPartners(updated);
                            triggerBroadcastSync();

                            showToast(
                              mp.isVerified
                                ? "Media Partner is now Unverified."
                                : "Media Partner verified successfully!"
                            );
                          }}
                          className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                            mp.isVerified
                              ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{mp.isVerified ? "Unverify" : "Verify"}</span>
                        </button>

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
                                if (targetId && m.id) {
                                  return m.id !== targetId;
                                }

                                return m.name !== mp.name;
                              });

                              setMediaPartners(updated);

                              if (targetId) {
                                const deleteOk = await deleteFromSupabase(
                                  "media_partners",
                                  targetId
                                );

                                if (!deleteOk) {
                                  showToast("Failed to delete Media Partner.");
                                  return;
                                }
                              }

                              triggerBroadcastSync();
                              showToast("Media Partner deleted.");
                            };
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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
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
                  
                </div>
              </div>

              {associates.length === 0 ? (
                <div className="text-center px-4 py-10 sm:py-12 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
                  <Building className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Associates Submitted</p>
                  <p className="text-xs text-slate-400 mt-1">Submitted associates will appear here for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {associates.map((assoc, assocIdx) => (
                    <div
                      key={assoc.id || `assoc-${assocIdx}`}
                      className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 min-w-0"
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
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">

                        <button
                          onClick={async () => {
                            const updated = associates.map((a) => {
                              const isTarget =
                                assoc.id && a.id
                                  ? a.id === assoc.id
                                  : a.name === assoc.name;

                              return isTarget
                                ? {
                                    ...a,
                                    isVerified: !Boolean(a.isVerified)
                                  }
                                : a;
                            });

                            const saveOk = await saveToSupabase("associates", updated);

                            if (!saveOk) {
                              showToast("Failed to update Associate verification.");
                              return;
                            }

                            setAssociates(updated);
                            triggerBroadcastSync();

                            showToast(
                              assoc.isVerified
                                ? "Associate is now Unverified."
                                : "Associate verified successfully!"
                            );
                          }}
                          className={`px-3 py-1.5 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                            assoc.isVerified
                              ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                              : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>{assoc.isVerified ? "Unverify" : "Verify"}</span>
                        </button>

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
                                if (targetId && a.id) {
                                  return a.id !== targetId;
                                }

                                return a.name !== assoc.name;
                              });

                              setAssociates(updated);

                              if (targetId) {
                                const deleteOk = await deleteFromSupabase(
                                  "associates",
                                  targetId
                                );

                                if (!deleteOk) {
                                  showToast("Failed to delete Associate.");
                                  return;
                                }
                              }

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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#37494E] flex items-center gap-2">
                    <Image className="h-5 w-5 text-blue-600" />
                    <span>Banner Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add up to 5 homepage banners and control their display position.
                  </p>
                </div>
                <div className="w-full md:w-auto flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {banners.length} / 5
                  </span>
                  <button
                    type="button"
                    disabled={banners.length >= 5}
                    onClick={() => {
                      if (banners.length >= 5) return;
                      setShowAddBannerForm(!showAddBannerForm);
                    }}
                    className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 ml-2 ${
                      banners.length >= 5
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-[#37494E] hover:bg-[#2c3b3f] text-white cursor-pointer"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>
                      {banners.length >= 5
                        ? "Maximum 5 Banners"
                        : showAddBannerForm
                          ? "Close Form"
                          : "Add Banner"}
                    </span>
                  </button>

                  {banners.length >= 5 && (
                    <p className="w-full text-[11px] font-medium text-amber-600 text-right">
                      Maximum 5 banners allowed. Delete an existing banner to add a new one.
                    </p>
                  )}
                </div>
              </div>

              {/* Add Banner Form (toggled via button or activeMenu === 'ADD_BANNER') */}
              {banners.length < 5 && (showAddBannerForm || activeMenu === "ADD_BANNER") && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();

                    if (banners.length >= 5) {
                      showToast("Maximum 5 banners allowed. Delete one banner first.");
                      return;
                    }

                    if (!newBannerImage.trim()) {
                      showToast("Please upload or select a banner image.");
                      return;
                    }

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

                    const bannerId = `banner-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 7)}`;

                    let bannerImg = newBannerImage.trim();
                    let uploadedStoragePath = "";

                    // Upload base64 image to Supabase Storage
                    if (bannerImg.startsWith("data:")) {
                      const uploadRes = await uploadBannerImageToSupabase(
                        bannerImg,
                        bannerId
                      );

                      if (!uploadRes || !uploadRes.publicUrl) {
                        showToast("Failed to upload banner image.");
                        return;
                      }

                      bannerImg = uploadRes.publicUrl;
                      uploadedStoragePath = uploadRes.storagePath;
                    }

                    // User-selected position
                    let selectedPlace =
                      newBannerOrder !== ""
                        ? Number(newBannerOrder)
                        : banners.length + 1;

                    // Safety: position must stay between 1 and 5
                    selectedPlace = Math.max(1, Math.min(5, selectedPlace));

                    // Existing banners sorted by current position
                    const sortedExisting = [...banners].sort(
                      (a, b) =>
                        (Number(a.place ?? a.order) || 999) -
                        (Number(b.place ?? b.order) || 999)
                    );

                    // OPTION B:
                    // Insert new banner into selected position and shift everything after it.
                    const shiftedExisting: Banner[] = sortedExisting.map((banner) => {
                      const currentPlace =
                        Number(banner.place ?? banner.order) || 1;

                      if (currentPlace >= selectedPlace) {
                        const shiftedPlace = currentPlace + 1;

                        return {
                          ...banner,
                          place: shiftedPlace,
                          order: shiftedPlace,
                          status: "Active",
                          active: true
                        };
                      }

                      return {
                        ...banner,
                        status: "Active",
                        active: true
                      };
                    });

                    // Safety — nothing can go above Place 5
                    if (
                      shiftedExisting.some(
                        (banner) => Number(banner.place ?? banner.order) > 5
                      )
                    ) {
                      if (uploadedStoragePath) {
                        await deleteBannerImageFromSupabase(uploadedStoragePath);
                      }

                      showToast(
                        "Cannot insert banner at this position because all 5 banner places are already occupied."
                      );
                      return;
                    }

                    const newBanner: Banner = {
                      id: bannerId,
                      image: bannerImg,
                      image_url: bannerImg,
                      title: newBannerTitleText.trim(),
                      description: newBannerDescText.trim(),
                      content: newBannerDescText.trim(),
                      order: selectedPlace,
                      place: selectedPlace,

                      // Always active automatically
                      status: "Active",
                      active: true,

                      createdAt: new Date().toISOString(),
                      created_at: new Date().toISOString()
                    };

                    // Final ordered banner list
                    const finalBanners = [
                      ...shiftedExisting,
                      newBanner
                    ].sort(
                      (a, b) =>
                        (Number(a.place ?? a.order) || 999) -
                        (Number(b.place ?? b.order) || 999)
                    );

                    // Save every banner because positions may have changed
                    const saveSucceeded = await saveToSupabase(
                      "banners",
                      finalBanners
                    );

                    if (!saveSucceeded) {
                      if (uploadedStoragePath) {
                        await deleteBannerImageFromSupabase(uploadedStoragePath);
                      }

                      showToast(
                        "Failed to save banner to database. Please try again."
                      );
                      return;
                    }

                    // Update Admin + App state
                    onUpdateBanners(finalBanners);

                    safeSetLocalStorage(
                      "gch_banners",
                      finalBanners
                    );

                    triggerBroadcastSync();

                    // Reset form
                    setNewBannerImage("");
                    setNewBannerTitleText("");
                    setNewBannerDescText("");
                    setNewBannerOrder("");
                    setShowAddBannerForm(false);

                    showToast("Banner added successfully!");

                    if (activeMenu === "ADD_BANNER") {
                      setActiveMenu("MANAGE_BANNERS");
                    }
                  }}
                  className="bg-slate-50 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-slate-200 space-y-4 text-xs animate-fadeIn shadow-inner min-w-0"
                >
                  <div className="w-full sm:w-auto px-6 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5">
                  
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
                        <label className="font-bold text-slate-700 block">
                          Display Position / Place *
                        </label>

                        <select
                          value={
                            newBannerOrder !== ""
                              ? newBannerOrder
                              : Math.min(banners.length + 1, 5)
                          }
                          onChange={(e) =>
                            setNewBannerOrder(Number(e.target.value))
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                        >
                          {[1, 2, 3, 4, 5].map((placeNum) => (
                            <option key={placeNum} value={placeNum}>
                              Place {placeNum}
                              {placeNum === 1
                                ? " (First Slide on Homepage)"
                                : ""}
                            </option>
                          ))}
                        </select>

                        <p className="text-[10px] text-slate-400">
                          Selecting an occupied position automatically shifts the existing banners down.
                        </p>
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
                          className="w-full h-full object-contain object-center"
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

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddBannerForm(false);
                        setNewBannerImage("");
                        setNewBannerTitleText("");
                        setNewBannerDescText("");
                        setNewBannerOrder("");
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Banner</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Associate Modal */}
              {editingAssociate && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
                  <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 shadow-2xl border border-slate-200 text-xs min-w-0">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
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

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingAssociate(null)}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
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
                        className="w-full sm:w-auto px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Media Partner Modal */}
              {editingPartner && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
                  <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 shadow-2xl border border-slate-200 text-xs min-w-0">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
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

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingPartner(null)}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
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
                        className="w-full sm:w-auto px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Banners Cards Display (Sorted by Place Number) */}
              {banners.length === 0 ? (
                <div className="text-center px-4 py-10 sm:py-12 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
                  <Globe className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">No Banners Added</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Banner" to upload your first homepage banner.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 min-w-0">
                  {[...banners]
                    .sort(
                      (a, b) =>
                        (Number(a.place ?? a.order) || 999) -
                        (Number(b.place ?? b.order) || 999)
                    )
                    .map((b) => {

                      return (
                        <div
                          key={b.id}
                          className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md min-w-0"
                        >
                          <div>
                            {/* Banner Image & Top Badges */}
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <img
                                  src={
                                    b.image ||
                                    b.image_url ||
                                    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
                                  }
                                  alt={b.title || "Banner"}
                                  className="w-full h-full object-contain object-center"
                                />
                              
                              <div className="absolute top-3 left-3 flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-white font-extrabold text-[11px] rounded-lg border border-white/20 shadow-xs flex items-center gap-1">
                                  <span>Place {b.place ?? b.order ?? 1}</span>
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
                            </div>
                          </div>

                          {/* Actions Section - Delete Only */}
                          <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">

                            <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Are you sure you want to permanently delete banner "${b.title || "Untitled banner"}"?`
                                    )
                                  ) {
                                    return;
                                  }

                                  const targetId = String(b.id);

                                  const deleteOk = await deleteFromSupabase(
                                    "banners",
                                    targetId
                                  );

                                  if (!deleteOk) {
                                    showToast("Failed to delete banner from database.");
                                    return;
                                  }

                                  const bannerImg = b.image || (b as any).image_url;

                                  if (bannerImg) {
                                    const info = extractStoragePathFromUrl(bannerImg);

                                    if (info) {
                                      try {
                                        const client = getSupabaseClient();

                                        if (client) {
                                          await client.storage
                                            .from(info.bucket)
                                            .remove([info.path]);
                                        }
                                      } catch (error) {
                                        console.warn(
                                          "Banner image storage deletion failed:",
                                          error
                                        );
                                      }
                                    }
                                  }

                                  const remaining = banners
                                    .filter(
                                      (item) => String(item.id) !== targetId
                                    )
                                    .sort(
                                      (a, b) =>
                                        (Number(a.place ?? a.order) || 999) -
                                        (Number(b.place ?? b.order) || 999)
                                    );

                                  const reordered: Banner[] = remaining.map(
                                    (banner, index) => ({
                                      ...banner,
                                      place: index + 1,
                                      order: index + 1,
                                      status: "Active",
                                      active: true
                                    })
                                  );

                                  if (reordered.length > 0) {
                                    const reorderSaved = await saveToSupabase(
                                      "banners",
                                      reordered
                                    );

                                    if (!reorderSaved) {
                                      console.warn(
                                        "Banner deleted, but remaining banner positions could not be updated."
                                      );
                                    }
                                  }

                                  onUpdateBanners(reordered);

                                  safeSetLocalStorage(
                                    "gch_banners",
                                    reordered
                                  );

                                  triggerBroadcastSync();

                                  showToast("Banner deleted permanently.");
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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#37494E]">Location Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add and permanently delete countries and cities. Deleting a country also permanently deletes all cities under it.
                  </p>
                </div>
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    {countriesList.length} Countries • Cities load by country
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
                      htmlFor={
                        isLocationUploading
                          ? undefined
                          : "location-excel-upload"
                      }
                      className={`px-3.5 py-2 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                        isLocationUploading
                          ? "bg-slate-400 cursor-not-allowed opacity-70"
                          : "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                      }`}
                      title={
                        isLocationUploading
                          ? "Location upload is already in progress"
                          : "Bulk upload countries and cities via Excel (.xlsx, .xls, .csv)"
                      }
                    >
                      {isLocationUploading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}

                      <span>
                        {isLocationUploading
                          ? "Uploading..."
                          : "Upload Excel"}
                      </span>
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
                 onSubmit={async (e) => {
                e.preventDefault();

                const trimmedCity =
                  toUpperCaseName(newCityName);

                if (!trimmedCity) return;

                if (!newCityCountry) {
                  showToast(
                    "Please select a country first!"
                  );
                  return;
                }

                const normalizedCountry =
                  toUpperCaseName(newCityCountry);

                try {
                  const cityRecord = {
                    id: `${normalizedCountry}:::${trimmedCity}`,
                    name: trimmedCity,
                    country: normalizedCountry
                  };

                  const saved =
                    await saveRecordToSupabase(
                      "cities",
                      cityRecord
                    );

                  if (!saved) {
                    showToast(
                      "Failed to save city to database."
                    );
                    return;
                  }

                  // Update only this country's loaded Admin cache.
                  setAdminCitiesByCountry((prev) => {
                    const current =
                      prev[normalizedCountry] || [];

                    const alreadyExists =
                      current.some(
                        (city) =>
                          String(city.name)
                            .trim()
                            .toUpperCase() ===
                          trimmedCity
                      );

                    const nextCities =
                      alreadyExists
                        ? current
                        : [
                            ...current,
                            {
                              name: trimmedCity,
                              country: normalizedCountry
                            }
                          ];

                    nextCities.sort((a, b) =>
                      a.name.localeCompare(
                        b.name,
                        undefined,
                        { sensitivity: "base" }
                      )
                    );

                    return {
                      ...prev,
                      [normalizedCountry]:
                        nextCities
                    };
                  });

                  triggerBroadcastSync();

                  showToast(
                    `City "${trimmedCity}" added under ${normalizedCountry}!`
                  );

                  setNewCityName("");
                  setShowAddCityForm(false);

                  if (
                    activeMenu === "ADD_CITY"
                  ) {
                    setActiveMenu(
                      "MANAGE_CITIES"
                    );
                  }
                } catch (error) {
                  console.error(
                    "Add city failed:",
                    error
                  );

                  showToast(
                    "Failed to add city. Please try again."
                  );
                }
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
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCityForm(false)}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs">
                      Save City
                    </button>
                  </div>
                </form>
              )}

              {/* Location Bulk Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">

                {countriesList.length > 0 && (
                  <button
                    onClick={async () => {
                        if (
                          !confirm(
                            `Are you sure you want to permanently delete all ${countriesList.length} countries and ${(Object.values(adminCityCounts) as number[]).reduce((total, count) => total + count, 0)} cities?`
                          )
                        ) {
                          showToast("Delete action cancelled.");
                          return;
                        }

                        const client = getSupabaseClient();

                        if (!client) {
                          showToast("Database connection unavailable.");
                          return;
                        }

                        try {
                          // 1. Delete all cities first
                          const { error: citiesError } = await client
                            .from("cities")
                            .delete()
                            .not("id", "is", null);

                          if (citiesError) {
                            console.error("Delete all cities failed:", citiesError);
                            showToast("Failed to delete all cities.");
                            return;
                          }

                          // 2. Delete all countries
                          const { error: countriesError } = await client
                            .from("countries")
                            .delete()
                            .not("id", "is", null);

                          if (countriesError) {
                            console.error("Delete all countries failed:", countriesError);
                            showToast("Failed to delete all countries.");
                            return;
                          }

                          // 3. Clear inactive country records
                          const { error: inactiveCountriesError } = await client
                            .from("inactive_countries")
                            .delete()
                            .not("id", "is", null);

                          if (inactiveCountriesError) {
                            console.error(
                              "Delete inactive countries failed:",
                              inactiveCountriesError
                            );
                          }

                          // 4. Clear inactive city records
                          const { error: inactiveCitiesError } = await client
                            .from("inactive_cities")
                            .delete()
                            .not("id", "is", null);

                          if (inactiveCitiesError) {
                            console.error(
                              "Delete inactive cities failed:",
                              inactiveCitiesError
                            );
                          }

                          // 5. Database deletion finished.
                          // Clear frontend state and Admin city caches.
                          // Do not resave empty country/city arrays back to the database.

                          if (onUpdateCountries) {
                            onUpdateCountries([]);
                          }

                          if (onUpdateCities) {
                            onUpdateCities([]);
                          }

                          if (onUpdateInactiveCountries) {
                            onUpdateInactiveCountries([]);
                          }

                          if (onUpdateInactiveCities) {
                            onUpdateInactiveCities([]);
                          }

                          setAdminCitiesByCountry({});
                          setAdminCitiesLoading({});

                          triggerBroadcastSync();
                          

                          showToast(
                            "All countries and cities deleted successfully."
                          );
                        } catch (error) {
                          console.error("Delete all locations failed:", error);
                          showToast(
                            "Failed to delete all countries and cities. Please try again."
                          );
                       }
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
                    const normalizedCountryName = String(countryName || "")
                      .trim()
                      .toUpperCase();

                    const isExpanded =
                      openGroups[`country_${cIdx}`] ?? false;

                    const associatedCities =
                      adminCitiesByCountry[normalizedCountryName] || [];

                    const isCitiesLoading =
                      Boolean(
                        adminCitiesLoading[normalizedCountryName]
                      );

                    return (
                      <div
                          key={countryName || `cnt-${cIdx}`}
                          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
>
                  {/* Country Card Top Bar */}
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">

                    {/* Country Name */}
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0"
                      onClick={async () => {
                    const key = `country_${cIdx}`;
                    const opening = !isExpanded;

                    if (opening) {
                      await loadAdminCitiesForCountry(
                        normalizedCountryName
                      );
                    }

                    toggleGroup(key);
                  }}
                >
    <button
      type="button"
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>

    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-sm text-[#37494E] truncate">
          {countryName}
        </span>

        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
          {Object.prototype.hasOwnProperty.call(
            adminCityCounts,
            normalizedCountryName
          )
            ? `${adminCityCounts[
                normalizedCountryName
              ].toLocaleString()} ${
                adminCityCounts[
                  normalizedCountryName
                ] === 1
                  ? "City"
                  : "Cities"
              }`
            : "Counting..."}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 mt-0.5">
        Manage cities under {countryName}
      </p>
    </div>
  </div>

  {/* Country Actions */}
  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">

    {/* Add City */}
    <button
      onClick={() => {
        setNewCityCountry(countryName);
        setShowAddCityForm(true);
        setShowAddCountryForm(false);
      }}
      className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
    >
      <Plus className="h-3.5 w-3.5" />
      <span>Add City</span>
    </button>

    {/* Delete Country */}
    <button
                        onClick={async () => {
                        if (
                          !confirm(
                            `Are you sure you want to permanently delete country "${countryName}" and all its associated cities?`
                          )
                        ) {
                          showToast("Delete action cancelled.");
                          return;
                        }

                        const client = getSupabaseClient();

                        if (!client) {
                          showToast("Database connection unavailable.");
                          return;
                        }

                        try {
                          // 1. Delete all cities under this country
                          const { error: cityDeleteError } = await client
                            .from("cities")
                            .delete()
                            .ilike("country", countryName);

                          if (cityDeleteError) {
                            console.error(
                              "Failed to delete cities for country:",
                              cityDeleteError
                            );

                            showToast(
                              "Failed to delete cities under this country."
                            );

                            return;
                          }

                          // 2. Delete the country itself
                          const { error: countryDeleteError } = await client
                            .from("countries")
                            .delete()
                            .ilike("name", countryName);

                          if (countryDeleteError) {
                            console.error(
                              "Failed to delete country:",
                              countryDeleteError
                            );

                            showToast(
                              "Failed to delete country from database."
                            );

                            return;
                          }

                          // 3. Update frontend country list
                          // 3. Remove the deleted country from frontend state.
                          const updatedCountries = countriesList.filter(
                            (country) =>
                              String(country)
                                .trim()
                                .toUpperCase() !==
                              String(countryName)
                                .trim()
                                .toUpperCase()
                          );

                          if (onUpdateCountries) {
                            onUpdateCountries(updatedCountries);
                          }

                          // 4. Remove only this country's loaded Admin city cache.
                          // Do not rebuild or resave the complete cities table.
                          const normalizedDeletedCountry =
                            String(countryName || "")
                              .trim()
                              .toUpperCase();

                          setAdminCitiesByCountry((prev) => {
                            const next = { ...prev };

                            delete next[
                              normalizedDeletedCountry
                            ];

                            return next;
                          });

                          setAdminCitiesLoading((prev) => {
                            const next = { ...prev };

                            delete next[
                              normalizedDeletedCountry
                            ];

                            return next;
                          });

                          triggerBroadcastSync();

                          showToast(
                            `Country "${countryName}" and all its cities deleted permanently.`
                          );
                        } catch (error) {
                          console.error(
                            "Country delete error:",
                            error
                          );

                          showToast(
                            "Failed to delete country. Please try again."
                          );
                        }
                      }}
                        className="h-9 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                      </div>
                      </div>

                      {/* Associated Cities List (Expanded) */}
                      {isExpanded && (
                        <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/70">
                          {isCitiesLoading ? (
                    <div className="border border-dashed border-blue-200 rounded-xl bg-white px-4 py-7 text-center">
                      <RefreshCw className="h-5 w-5 mx-auto text-blue-500 animate-spin mb-2" />

                      <p className="text-sm font-bold text-slate-700">
                        Loading cities...
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Loading cities for {countryName} from the database.
                      </p>
                    </div>
                  ) : associatedCities.length === 0 ? (
  <div className="border border-dashed border-slate-300 rounded-xl bg-white px-4 py-7 text-center">

    <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2">
      <MapPin className="h-5 w-5 text-blue-500" />
    </div>

    <p className="text-sm font-bold text-slate-700">
      No cities added yet
    </p>

    <p className="text-xs text-slate-400 mt-1">
      Add your first city under {countryName}.
    </p>

    <button
      onClick={() => {
        setNewCityCountry(countryName);
        setShowAddCityForm(true);
        setShowAddCountryForm(false);
      }}
      className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
    >
      <Plus className="h-3.5 w-3.5" />
      Add City
    </button>
  </div>
) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {associatedCities.map((ct, ctIdx) => {
                                const cityKey = `${ct.country}:::${ct.name}`;

                                return (
                                  <div
                                    key={cityKey || `city-${ctIdx}`}
                                    className="group p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200">
                                    <>
                                        <div className="flex items-center gap-2.5 min-w-0">

  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
    <MapPin className="h-4 w-4 text-blue-500" />
  </div>

  <div className="min-w-0">
    <p className="font-bold text-xs text-slate-800 truncate">
      {ct.name}
    </p>

    <p className="text-[10px] text-slate-400 truncate">
      {countryName}
    </p>
  </div>

</div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            onClick={async () => {
                                              if (
                                                !confirm(
                                                  `Are you sure you want to permanently delete city "${ct.name}" from "${ct.country}"?`
                                                )
                                              ) {
                                                showToast("Delete action cancelled.");
                                                return;
                                              }

                                              const client = getSupabaseClient();

                                              if (!client) {
                                                showToast("Database connection unavailable.");
                                                return;
                                              }

                                              try {
                                                const { error } = await client
                                                  .from("cities")
                                                  .delete()
                                                  .ilike("name", ct.name)
                                                  .ilike("country", ct.country);

                                                if (error) {
                                                  console.error("City deletion failed:", error);
                                                  showToast("Failed to delete city from database.");
                                                  return;
                                                }

                                                const normalizedCountry = String(ct.country || "")
                                              .trim()
                                              .toUpperCase();

                                            const normalizedCity = String(ct.name || "")
                                              .trim()
                                              .toUpperCase();

                                            // Update only this country's Admin cache.
                                            // Do not rebuild or resave the complete cities table.
                                            setAdminCitiesByCountry((prev) => {
                                              const current =
                                                prev[normalizedCountry] || [];

                                              const updated = current.filter(
                                                (item) =>
                                                  String(item.name || "")
                                                    .trim()
                                                    .toUpperCase() !== normalizedCity
                                              );

                                              return {
                                                ...prev,
                                                [normalizedCountry]: updated
                                              };
                                            });

                                            triggerBroadcastSync();

                                                showToast(
                                                  `City "${ct.name}" deleted permanently.`
                                                );
                                              } catch (error) {
                                                console.error("City delete error:", error);

                                                showToast(
                                                  "Failed to delete city. Please try again."
                                                );
                                              }
                                            }}
                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                                            title="Delete city"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </>
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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
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
                      setShowAddTopicForm(!showAddTopicForm);
                    }}
                    className="px-4 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Single Topic</span>
                  </button>

                </div>
              </div>

              {/* Excel Bulk Upload Guide Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Topic Excel Bulk Upload Format Guide:</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Write <span className="font-bold">Topic Name</span> in Column A
                    (e.g.{" "}
                    <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">
                      Artificial Intelligence & Machine Learning
                    </code>
                    ). Use one topic per row. Duplicate topic names are automatically
                    replaced instead of creating another copy. Click{" "}
                    <span className="font-bold">"Demo Excel"</span> above to download
                    the sample template.
                  </p>
                </div>
              </div>
              {/* Topic Stats */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Topics
                    </p>

                    <p className="text-2xl font-black text-slate-800 mt-0.5">
                      {categories.length}
                    </p>
                  </div>

                  <div className="h-10 min-w-10 px-3 bg-slate-200/70 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm">
                    {categories.length}
                  </div>
                </div>
              </div>

              {/* Add New Topic Single Form */}
              {(activeMenu === "ADD_TOPICS" || showAddTopicForm) && (
                <form
                  onSubmit={(e) => {
                  e.preventDefault();

                  const trimmedName =
                    newTopicName.trim();

                  if (!trimmedName) {
                    showToast(
                      "Please enter a topic name."
                    );
                    return;
                  }

                  const normalizedName =
                    trimmedName.toLowerCase();

                  const slug = trimmedName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                  const existingTopic =
                    categories.find(
                      (cat) =>
                        String(cat.name || "")
                          .trim()
                          .toLowerCase() ===
                        normalizedName
                    );

                  if (existingTopic) {
                    // Same topic already exists:
                    // replace/update existing record
                    onEditCategory(
                      existingTopic.id,
                      {
                        name: trimmedName,
                        slug
                      }
                    );

                    showToast(
                      `Topic "${trimmedName}" already existed and was replaced.`
                    );
                  } else {
                    // New topic
                    onAddCategory({
                      name: trimmedName,
                      slug
                    });

                    showToast(
                      `Topic "${trimmedName}" created successfully!`
                    );
                  }

                  setNewTopicName("");
                  setShowAddTopicForm(false);

                  triggerBroadcastSync();

                  if (
                    activeMenu === "ADD_TOPICS"
                  ) {
                    setActiveMenu(
                      "MANAGE_TOPICS"
                    );
                  }
                }}
                  className="bg-slate-50 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-slate-200 space-y-4 text-xs animate-fadeIn min-w-0"
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

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setShowAddTopicForm(false)}
                      className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="w-full sm:w-auto px-5 py-2 bg-[#37494E] hover:bg-[#2c3b3f] text-white font-bold rounded-xl cursor-pointer shadow-xs">
                      Save Topic
                    </button>
                  </div>
                </form>
              )}

              {/* Search and Status Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
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
                  


                  {categories.length > 0 && (
                    <button
                      onClick={async () => {
                        const deleteCount = categories.length;
                        if (!confirm(`Are you sure you want to permanently delete all ${deleteCount} topic(s)?`)) {
                          showToast("Delete action cancelled.");
                          return;
                        }
                        await onDeleteAllCategories?.();
                        triggerBroadcastSync();
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
                if (topicSearchQuery.trim()) {
                  const q = topicSearchQuery.toLowerCase().trim();

                  const nameMatch =
                    String(cat.name || "")
                      .toLowerCase()
                      .includes(q);

                  if (!nameMatch) {
                    return false;
                  }
                }

                return true;
              });
                filtered.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" }));

                if (filtered.length === 0) {
                  return (
                    <div className="text-center px-4 py-10 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 space-y-2 min-w-0">
                      <Tag className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">
                          No topics found
                      </p>

                      <p className="text-xs text-slate-500">
                          Try another topic name.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="w-full overflow-x-auto overscroll-x-contain">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 pl-6 w-16">#</th>
                            <th className="p-3.5">Topic & Discipline Name</th>
                            <th className="p-3.5 pr-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {filtered.map((cat, idx) => {

                            return (
                              <tr
                                key={cat.id ? `${cat.id}-${idx}` : `cat-idx-${idx}`}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="p-3.5 pl-6 font-bold text-slate-400">{idx + 1}</td>
                                <td className="p-3.5">
                                  <div>
                                    <span className="font-bold text-slate-900 text-sm break-words">
                                      {cat.name}
                                    </span>
                                  </div>
                                </td>
                                
                                <td className="p-3.5 pr-6 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">

                                    <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Are you sure you want to permanently delete topic "${cat.name}"?`
                                    )
                                  ) {
                                    showToast("Delete action cancelled.");
                                    return;
                                  }

                                  try {
                                    await onDeleteCategory(cat.id);

                                    showToast(
                                      `Topic "${cat.name}" deleted permanently.`
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Topic deletion failed:",
                                      error
                                    );

                                    showToast(
                                      "Failed to delete topic. Please try again."
                                    );
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
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span>User Feedback Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    View and manage feedback submitted by users. Only verified feedback is visible on the User Portal.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                    Total: {userFeedbacks.length}
                  </span>

                  {userFeedbacks.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          `Are you sure you want to permanently delete all ${userFeedbacks.length} feedbacks? This cannot be undone.`
                        );

                        if (!confirmed) {
                          return;
                        }

                        try {
                          const feedbackIds = userFeedbacks
                            .map((fb) => fb.id)
                            .filter(Boolean) as string[];

                          for (const id of feedbackIds) {
                            await deleteFromSupabase(
                              "user_feedbacks",
                              id
                            );
                          }

                          // Update Admin + App state after database deletion
                          setUserFeedbacks([]);

                          if (onUpdateUserFeedbacks) {
                            onUpdateUserFeedbacks([]);
                          }

                          safeSetLocalStorage(
                            "gch_feedbacks",
                            []
                          );

                          triggerBroadcastSync();

                          showToast(
                            "All feedback permanently deleted."
                          );
                        } catch (error) {
                          console.error(
                            "Delete all feedback failed:",
                            error
                          );

                          showToast(
                            "Failed to delete all feedback. Please try again."
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      title="Delete all feedback"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete All
                    </button>
                  )}
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
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

                
              </div>

              {/* Feedbacks Grid */}
              {(() => {
                const filtered = userFeedbacks.filter((fb) => {
                  
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
                    <div className="text-center px-4 py-10 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
                      <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No Feedback Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {fbSearchQuery
                          ? "Try adjusting your search."
                          : "User submissions from the footer form will automatically appear here."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                    {filtered.map((fb, fbIdx) => {

                      return (
                        <div key={fb.id ? `${fb.id}-${fbIdx}` : `fb-item-${fbIdx}`} className="p-3 sm:p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 text-xs shadow-2xs hover:border-slate-300 transition-all min-w-0">
                          <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {fb.image ? (
                                <img src={fb.image} alt={fb.name} className="w-9 h-9 rounded-full object-contain border border-slate-200" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-600">
                                  {fb.name?.charAt(0) || "U"}
                                </div>
                              )}
                              <div className="min-w-0">
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
                            

                            {/* Actions: Activate/Deactivate Toggle and Delete */}
                            <div className="flex items-center gap-1.5">

                              <button
                                onClick={async () => {
                                  const updated = userFeedbacks.map((f) => {
                                    const isTarget =
                                      fb.id && f.id
                                        ? f.id === fb.id
                                        : f.name === fb.name && f.text === fb.text;

                                    return isTarget
                                      ? {
                                          ...f,
                                          isVerified: !Boolean(f.isVerified)
                                        }
                                      : f;
                                  });

                                  const saveOk = await saveToSupabase(
                                    "user_feedbacks",
                                    updated
                                  );

                                  if (!saveOk) {
                                    showToast("Failed to update Feedback verification.");
                                    return;
                                  }

                                  setUserFeedbacks(updated);

                                  if (onUpdateUserFeedbacks) {
                                    onUpdateUserFeedbacks(updated);
                                  }

                                  triggerBroadcastSync();

                                  showToast(
                                    fb.isVerified
                                      ? "Feedback is now Unverified."
                                      : "Feedback verified successfully!"
                                  );
                                }}
                                className={`px-2.5 py-1.5 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                                  fb.isVerified
                                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                                }`}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>{fb.isVerified ? "Unverify" : "Verify"}</span>
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
                                  const deleteOk = await deleteFromSupabase(
                                    "user_feedbacks",
                                    fb.id
                                  );

                                  if (!deleteOk) {
                                    showToast(
                                      "Failed to delete feedback from database."
                                    );
                                    return;
                                  }
                                }

                                const updated = userFeedbacks.filter((f) => {
                                  if (f.id && fb.id) {
                                    return f.id !== fb.id;
                                  }

                                  return !(
                                    f.name === fb.name &&
                                    f.text === fb.text
                                  );
                                });

                                setUserFeedbacks(updated);

                                if (onUpdateUserFeedbacks) {
                                  onUpdateUserFeedbacks(updated);
                                }

                                safeSetLocalStorage(
                                  "gch_feedbacks",
                                  updated
                                );

                                triggerBroadcastSync();

                                showToast(
                                  "Feedback permanently deleted."
                                );

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

          {/* About Us Management */}
{activeMenu === "ABOUT_INFO" && (
  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">

    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <span>About Us Management</span>
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Edit the content displayed on the User Portal About Us page.
        </p>
      </div>

      {!isEditingAboutUs && !isLoadingAboutUs && (
        <button
          onClick={() => {
            setAboutUsOriginal({ ...aboutUsContent });
            setIsEditingAboutUs(true);
          }}
          className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
      )}
    </div>

    {/* Loading */}
    {isLoadingAboutUs ? (
      <div className="px-4 py-10 sm:py-16 flex flex-col items-center justify-center text-slate-500 text-center min-w-0">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-semibold">
          Loading About Us content...
        </p>
      </div>
    ) : (
      <div className="space-y-4 sm:space-y-6 min-w-0">

        {/* Mission Badge + Title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

{/* Default Description */}
<div className="space-y-2">
  <label className="text-xs font-bold text-slate-700">
  Main Description
</label>

  <textarea
    rows={5}
    value={conferenceDescription.default_description}
    disabled={!isEditingConferenceDescription}
    onChange={(e) =>
      setConferenceDescription({
        ...conferenceDescription,
        default_description: e.target.value
      })
    }
    placeholder="Enter the default conference page description..."
    className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
      isEditingConferenceDescription
        ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
        : "bg-slate-50 border-slate-200 text-slate-600"
    }`}
  />
</div>

{/* Topic Description */}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Mission Badge
            </label>

            <input
              type="text"
              value={aboutUsContent.mission_badge}
              disabled={!isEditingAboutUs}
              onChange={(e) =>
                setAboutUsContent({
                  ...aboutUsContent,
                  mission_badge: e.target.value
                })
              }
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                isEditingAboutUs
                  ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Main Title
            </label>

            <input
              type="text"
              value={aboutUsContent.title}
              disabled={!isEditingAboutUs}
              onChange={(e) =>
                setAboutUsContent({
                  ...aboutUsContent,
                  title: e.target.value
                })
              }
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                isEditingAboutUs
                  ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            />
          </div>
        </div>


        {/* Paragraph 1 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">
            Paragraph 1
          </label>

          <textarea
            rows={6}
            value={aboutUsContent.paragraph1}
            disabled={!isEditingAboutUs}
            onChange={(e) =>
              setAboutUsContent({
                ...aboutUsContent,
                paragraph1: e.target.value
              })
            }
            className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
              isEditingAboutUs
                ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          />
        </div>


        {/* Paragraph 2 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">
            Paragraph 2
          </label>

          <textarea
            rows={6}
            value={aboutUsContent.paragraph2}
            disabled={!isEditingAboutUs}
            onChange={(e) =>
              setAboutUsContent({
                ...aboutUsContent,
                paragraph2: e.target.value
              })
            }
            className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
              isEditingAboutUs
                ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          />
        </div>


        {/* Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Stat 1 */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 space-y-4 min-w-0">
            <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
              Statistic 1
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Value
              </label>

              <input
                type="text"
                value={aboutUsContent.stat1_value}
                disabled={!isEditingAboutUs}
                onChange={(e) =>
                  setAboutUsContent({
                    ...aboutUsContent,
                    stat1_value: e.target.value
                  })
                }
                className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm disabled:bg-blue-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Label
              </label>

              <input
                type="text"
                value={aboutUsContent.stat1_label}
                disabled={!isEditingAboutUs}
                onChange={(e) =>
                  setAboutUsContent({
                    ...aboutUsContent,
                    stat1_label: e.target.value
                  })
                }
                className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm disabled:bg-blue-50"
              />
            </div>
          </div>


          {/* Stat 2 */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 space-y-4 min-w-0">
            <p className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
              Statistic 2
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Value
              </label>

              <input
                type="text"
                value={aboutUsContent.stat2_value}
                disabled={!isEditingAboutUs}
                onChange={(e) =>
                  setAboutUsContent({
                    ...aboutUsContent,
                    stat2_value: e.target.value
                  })
                }
                className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm disabled:bg-emerald-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Label
              </label>

              <input
                type="text"
                value={aboutUsContent.stat2_label}
                disabled={!isEditingAboutUs}
                onChange={(e) =>
                  setAboutUsContent({
                    ...aboutUsContent,
                    stat2_label: e.target.value
                  })
                }
                className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm disabled:bg-emerald-50"
              />
            </div>
          </div>

        </div>


              {/* Image URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  About Us Image URL
                </label>

                <input
                  type="text"
                  value={aboutUsContent.image_url}
                  disabled={!isEditingAboutUs}
                  onChange={(e) =>
                    setAboutUsContent({
                      ...aboutUsContent,
                      image_url: e.target.value
                    })
                  }
                  placeholder="https://..."
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none ${
                    isEditingAboutUs
                      ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                />
              </div>


              {/* Image Preview */}
              {aboutUsContent.image_url && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700">
                    Image Preview
                  </p>

                  <div className="w-full sm:w-80 h-48 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    <img
                      src={aboutUsContent.image_url}
                      alt="About Us"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}


              {/* Edit Mode Buttons */}
              {isEditingAboutUs && (
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100">

                  <button
                    type="button"
                    disabled={isSavingAboutUs}
                    onClick={handleCancelAboutUsEdit}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSavingAboutUs}
                    onClick={handleSaveAboutUs}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSavingAboutUs ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {isSavingAboutUs
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>
              )}

            </div>
          )}
        </div>
      )}

      
        {/* Home Main Description Management */}
          {activeMenu === "HOME_DESCRIPTION" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Main Description</span>
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    Edit the description shown on the User Portal Home page before the Countries section.
                  </p>
                </div>

                {!isEditingHomeDescription && !isLoadingHomeDescription && (
                  <button
                    onClick={() => {
                      setHomeDescriptionOriginal({ ...homeDescription });
                      setIsEditingHomeDescription(true);
                    }}
                    className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>

              {isLoadingHomeDescription ? (
                <div className="px-4 py-10 sm:py-16 flex flex-col items-center justify-center text-slate-500 text-center min-w-0">
                  <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-3" />

                  <p className="text-xs font-semibold">
                    Loading Main Description...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={10}
                      value={homeDescription.description}
                      disabled={!isEditingHomeDescription}
                      onChange={(e) =>
                        setHomeDescription({
                          ...homeDescription,
                          description: e.target.value
                        })
                      }
                      placeholder="Enter the Home page main description..."
                      className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                        isEditingHomeDescription
                          ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    />
                  </div>

                  {isEditingHomeDescription && (
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100">

                      <button
                        type="button"
                        disabled={isSavingHomeDescription}
                        onClick={handleCancelHomeDescriptionEdit}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={isSavingHomeDescription}
                        onClick={handleSaveHomeDescription}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {isSavingHomeDescription ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        {isSavingHomeDescription
                          ? "Saving..."
                          : "Save Changes"}
                      </button>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* Privacy Policy Management */}
        {activeMenu === "PRIVACY_POLICY" && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span>Privacy Policy Management</span>
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Edit the Privacy Policy displayed on the User Portal.
                </p>
              </div>

              {!isEditingPrivacyPolicy && !isLoadingPrivacyPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    setPrivacyPolicyOriginal({
                      ...privacyPolicy
                    });
                    setIsEditingPrivacyPolicy(true);
                  }}
                  className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>

            {isLoadingPrivacyPolicy ? (
              <div className="px-4 py-10 sm:py-16 flex flex-col items-center justify-center text-slate-500 text-center min-w-0">
                <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-3" />
                <p className="text-xs font-semibold">
                  Loading Privacy Policy...
                </p>
              </div>
            ) : (
              <div className="space-y-5 min-w-0">

                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Page Title
                  </label>

                  <input
                    type="text"
                    value={privacyPolicy.title}
                    disabled={!isEditingPrivacyPolicy}
                    onChange={(e) =>
                      setPrivacyPolicy({
                        ...privacyPolicy,
                        title: e.target.value
                      })
                    }
                    placeholder="Privacy Policy"
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none ${
                      isEditingPrivacyPolicy
                        ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Privacy Policy Content
                  </label>

                  <textarea
                    rows={22}
                    value={privacyPolicy.content}
                    disabled={!isEditingPrivacyPolicy}
                    onChange={(e) =>
                      setPrivacyPolicy({
                        ...privacyPolicy,
                        content: e.target.value
                      })
                    }
                    placeholder="Enter the complete Privacy Policy here..."
                    className={`w-full px-4 py-3 text-sm leading-6 rounded-xl border outline-none resize-y ${
                      isEditingPrivacyPolicy
                        ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  />

                  <p className="text-xs text-slate-400">
                    Paragraph spacing and line breaks will be preserved on the User Portal.
                  </p>
                </div>

                {/* Last Updated */}
                {privacyPolicy.updated_at && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-500">
                      Last updated:{" "}
                      <span className="font-semibold text-slate-700">
                        {new Date(
                          privacyPolicy.updated_at
                        ).toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}

                {/* Edit Buttons */}
                {isEditingPrivacyPolicy && (
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100">

                    <button
                      type="button"
                      disabled={isSavingPrivacyPolicy}
                      onClick={handleCancelPrivacyPolicyEdit}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSavingPrivacyPolicy}
                      onClick={handleSavePrivacyPolicy}
                      className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPrivacyPolicy ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* Terms of Service Management */}
{activeMenu === "TERMS_OF_SERVICE" && (
  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">

    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
      <div>
        <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span>Terms of Service Management</span>
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Edit the Terms of Service displayed on the User Portal.
        </p>
      </div>

      {!isEditingTermsOfService && !isLoadingTermsOfService && (
        <button
          type="button"
          onClick={() => {
            setTermsOfServiceOriginal({
              ...termsOfService
            });
            setIsEditingTermsOfService(true);
          }}
          className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
      )}
    </div>

    {isLoadingTermsOfService ? (
      <div className="px-4 py-10 sm:py-16 flex flex-col items-center justify-center text-slate-500 text-center min-w-0">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-semibold">
          Loading Terms of Service...
        </p>
      </div>
    ) : (
      <div className="space-y-5 min-w-0">

        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">
            Page Title
          </label>

          <input
            type="text"
            value={termsOfService.title}
            disabled={!isEditingTermsOfService}
            onChange={(e) =>
              setTermsOfService({
                ...termsOfService,
                title: e.target.value
              })
            }
            placeholder="Terms of Service"
            className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none ${
              isEditingTermsOfService
                ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">
            Terms of Service Content
          </label>

          <textarea
            rows={22}
            value={termsOfService.content}
            disabled={!isEditingTermsOfService}
            onChange={(e) =>
              setTermsOfService({
                ...termsOfService,
                content: e.target.value
              })
            }
            placeholder="Enter the complete Terms of Service here..."
            className={`w-full px-4 py-3 text-sm leading-6 rounded-xl border outline-none resize-y ${
              isEditingTermsOfService
                ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          />

          <p className="text-xs text-slate-400">
            Paragraph spacing and line breaks will be preserved on the User Portal.
          </p>
        </div>

        {/* Last Updated */}
        {termsOfService.updated_at && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">
              Last updated:{" "}
              <span className="font-semibold text-slate-700">
                {new Date(
                  termsOfService.updated_at
                ).toLocaleString()}
              </span>
            </p>
          </div>
        )}

        {/* Edit Buttons */}
        {isEditingTermsOfService && (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100">

            <button
              type="button"
              disabled={isSavingTermsOfService}
              onClick={handleCancelTermsOfServiceEdit}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSavingTermsOfService}
              onClick={handleSaveTermsOfService}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingTermsOfService ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>

          </div>
        )}

      </div>
    )}
  </div>
)}


          {/* Conference Description Management */}
            {activeMenu === "CONFERENCE_DESCRIPTION" && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-w-0">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-base font-bold text-[#37494E] flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span>Conference Description</span>
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Edit the dynamic descriptions shown on the User Portal Conference page.
                    </p>
                  </div>

                  {!isEditingConferenceDescription && !isLoadingConferenceDescription && (
                    <button
                      onClick={() => {
                        setConferenceDescriptionOriginal({ ...conferenceDescription });
                        setIsEditingConferenceDescription(true);
                      }}
                      className="w-full sm:w-auto justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>

                {/* Placeholder Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-blue-900 mb-2">
                    Available Placeholders
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                      {"{TOPIC}"}
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                      {"{COUNTRY}"}
                    </span>

                    <span className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                      {"{CITY}"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    These placeholders will automatically be replaced with the visitor's selected Topic, Country, and City.
                  </p>
                </div>

                {isLoadingConferenceDescription ? (
                  <div className="px-4 py-10 sm:py-16 flex flex-col items-center justify-center text-slate-500 text-center min-w-0">
                    <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-3" />
                    <p className="text-xs font-semibold">
                      Loading Conference Description...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6 min-w-0">

                    {/* Default Description */}
<div className="space-y-2">
  <label className="text-xs font-bold text-slate-700">
    Default Description
  </label>

  <textarea
    rows={5}
    value={conferenceDescription.default_description}
    disabled={!isEditingConferenceDescription}
    onChange={(e) =>
      setConferenceDescription({
        ...conferenceDescription,
        default_description: e.target.value
      })
    }
    placeholder="Enter the default conference page description..."
    className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
      isEditingConferenceDescription
        ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
        : "bg-slate-50 border-slate-200 text-slate-600"
    }`}
  />
</div>

                    {/* Topic Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Topic Description
                      </label>

                      <textarea
                        rows={5}
                        value={conferenceDescription.topic_description}
                        disabled={!isEditingConferenceDescription}
                        onChange={(e) =>
                          setConferenceDescription({
                            ...conferenceDescription,
                            topic_description: e.target.value
                          })
                        }
                        placeholder="Example: Discover verified conferences focusing on {TOPIC}."
                        className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                          isEditingConferenceDescription
                            ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      />
                    </div>

                    {/* Country Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Country Description
                      </label>

                      <textarea
                        rows={5}
                        value={conferenceDescription.country_description}
                        disabled={!isEditingConferenceDescription}
                        onChange={(e) =>
                          setConferenceDescription({
                            ...conferenceDescription,
                            country_description: e.target.value
                          })
                        }
                        placeholder="Example: Explore trusted international conferences taking place in {COUNTRY}."
                        className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                          isEditingConferenceDescription
                            ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      />
                    </div>

                    {/* City Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        City Description
                      </label>

                      <textarea
                        rows={5}
                        value={conferenceDescription.city_description}
                        disabled={!isEditingConferenceDescription}
                        onChange={(e) =>
                          setConferenceDescription({
                            ...conferenceDescription,
                            city_description: e.target.value
                          })
                        }
                        placeholder="Example: Find upcoming academic conferences in {CITY}, {COUNTRY}."
                        className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                          isEditingConferenceDescription
                            ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      />
                    </div>

                    {/* Topic + Country Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Topic + Country Description
                      </label>

                      <textarea
                        rows={5}
                        value={conferenceDescription.topic_country_description}
                        disabled={!isEditingConferenceDescription}
                        onChange={(e) =>
                          setConferenceDescription({
                            ...conferenceDescription,
                            topic_country_description: e.target.value
                          })
                        }
                        placeholder="Example: Discover verified {TOPIC} conferences taking place in {COUNTRY}."
                        className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                          isEditingConferenceDescription
                            ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      />
                    </div>

                    {/* Combined Description */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">
                        Topic + Country + City Description
                      </label>

                      <textarea
                        rows={5}
                        value={conferenceDescription.combined_description}
                        disabled={!isEditingConferenceDescription}
                        onChange={(e) =>
                          setConferenceDescription({
                            ...conferenceDescription,
                            combined_description: e.target.value
                          })
                        }
                        placeholder="Example: Discover verified {TOPIC} conferences taking place in {CITY}, {COUNTRY}."
                        className={`w-full px-4 py-3 text-sm rounded-xl border outline-none leading-relaxed resize-y transition-all ${
                          isEditingConferenceDescription
                            ? "bg-white border-slate-300 focus:ring-2 focus:ring-blue-500"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      />
                    </div>

                    {/* Buttons */}
                    {isEditingConferenceDescription && (
                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-5 border-t border-slate-100">

                        <button
                          type="button"
                          disabled={isSavingConferenceDescription}
                          onClick={handleCancelConferenceDescriptionEdit}
                          className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={isSavingConferenceDescription}
                          onClick={handleSaveConferenceDescription}
                          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {isSavingConferenceDescription ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}

                          {isSavingConferenceDescription
                            ? "Saving..."
                            : "Save Changes"}
                        </button>

                      </div>
                    )}

                  </div>
                )}

              </div>
            )}


          {activeMenu === "SUBSCRIBER_EMAILS" && (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 min-w-0">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-0">
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
                    onClick={async () => {
                      const deleteCount = selectedSubIds.length;

                      if (
                        !confirm(
                          `Are you sure you want to permanently delete ${deleteCount} selected subscriber(s)?`
                        )
                      ) {
                        showToast("Delete action cancelled.");
                        return;
                      }

                      try {
                        const selectedSubscribers = subscriberEmails.filter((s) =>
                          selectedSubIds.includes(s.id || s.email)
                        );

                        for (const sub of selectedSubscribers) {
                          if (sub.id) {
                            const deleteOk = await deleteFromSupabase(
                              "subscriber_emails",
                              sub.id
                            );

                            if (!deleteOk) {
                              showToast(
                                `Failed to delete subscriber "${sub.email}" from database.`
                              );
                              return;
                            }
                          } else {
                            const client = getSupabaseClient();

                            if (!client) {
                              showToast("Database connection unavailable.");
                              return;
                            }

                            const { error } = await client
                              .from("subscriber_emails")
                              .delete()
                              .eq("email", sub.email);

                            if (error) {
                              console.error(
                                "Subscriber delete by email failed:",
                                error
                              );

                              showToast(
                                `Failed to delete subscriber "${sub.email}" from database.`
                              );
                              return;
                            }
                          }
                        }
                        const updated = subscriberEmails.filter(
                          (s) => !selectedSubIds.includes(s.id || s.email)
                        );

                        setSubscriberEmails(updated);

                        if (onUpdateSubscriberEmails) {
                          onUpdateSubscriberEmails(updated);
                        }

                        triggerBroadcastSync();

                        setSelectedSubIds([]);

                        showToast(
                          `Deleted ${deleteCount} selected subscriber(s).`
                        );
                      } catch (error) {
                        console.error(
                          "Delete selected subscribers failed:",
                          error
                        );

                        showToast(
                          "Failed to delete selected subscribers. Please try again."
                        );
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 animate-fadeIn"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Selected ({selectedSubIds.length})</span>
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
                    <div className="text-center px-4 py-10 sm:py-12 bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 min-w-0">
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
                  <div className="w-full overflow-x-auto overscroll-x-contain border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={(e) => {
                              const filteredIds = filtered.map(
                                (s) => s.id || s.email
                              );

                              if (e.target.checked) {
                                setSelectedSubIds((prev) =>
                                  Array.from(
                                    new Set([...prev, ...filteredIds])
                                  )
                                );
                              } else {
                                setSelectedSubIds((prev) =>
                                  prev.filter(
                                    (id) => !filteredIds.includes(id)
                                  )
                                );
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3">Subscriber Email Address</th>
                          <th className="p-3">Subscribed Date & Time</th>
                          <th className="p-3 text-center">Status</th>
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
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 shadow-2xl border border-slate-200 min-w-0">

                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
                  <div className="min-w-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-2 ${
                      isConferenceCompleted(viewingConfDetails)
                        ? "bg-slate-200 text-slate-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {isConferenceCompleted(viewingConfDetails) ? "Completed Conference" : "Pending Conference Review"}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#37494E] leading-tight break-words">
                      {viewingConfDetails.title}
                      </h3>
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
                      className="text-blue-600 hover:underline flex items-start gap-1 font-semibold break-all min-w-0"
                    >
                      {viewingConfDetails.conferenceWebsite} <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
                    </a>
                  </div>
                )}

                {viewingConfDetails.contactEmail && (
                  <div className="text-xs space-y-1">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Contact Email</p>
                    <a
                      href={`mailto:${viewingConfDetails.contactEmail}`}
                      className="text-blue-600 hover:underline font-semibold break-all"
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
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 shadow-2xl border border-slate-200 min-w-0">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
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
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-[#37494E] leading-tight break-words">
                        {viewingOrgDetails.organizationName || "Unnamed Organization"}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 break-all">{viewingOrgDetails.email}</p>
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
                        className="text-blue-600 hover:underline font-bold flex items-start gap-1 break-all min-w-0"
                      >
                        {viewingOrgDetails.organizationWebsite} <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
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
