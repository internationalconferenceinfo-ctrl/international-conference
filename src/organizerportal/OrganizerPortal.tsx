import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, ShieldAlert, 
  RefreshCw, User, Globe, Link, Award, Send, Save, 
  ShieldCheck, MapPin, Clock, LayoutDashboard,
  FileText, CheckCircle2, XCircle, AlertCircle, Settings,
  LogOut, Home, Calendar, Users, BarChart3, Menu, Radio, Info, Mail,
  Twitter, Linkedin, Facebook, Instagram, Youtube, Upload, Image as ImageIcon, X,
  ChevronDown, ChevronRight, PlusCircle, Building2, Search, Layers
} from "lucide-react";
import { Conference, Category, OrganizerProfile, ConferenceStatus, LiveStatus, Notification, formatConferenceDate } from "../shared/types";
import { compressImageFile } from "../shared/utils/imageUtils";
import { ImageUploaderField } from "../shared/components/ImageUploaderField";
import { isConferenceCompleted } from "../shared/utils/expirationUtils";
import { resolveConferenceTimeZone } from "../shared/utils/timezoneUtils";
import { slugify, getConferenceSlug } from "../shared/utils/slugUtils";
import { fetchCitiesByCountryFromSupabase } from "../database/supabase";
import { buildConferenceDuplicateKey } from "../shared/utils/conferenceDuplicateUtils";

const getTodayInTimeZone = (timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
};

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

const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.555 4.109 1.525 5.835L0 24l6.335-1.503A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.92 9.92 0 01-5.06-1.39l-.363-.216-3.765.893.911-3.669-.236-.375A9.927 9.927 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
  </svg>
);

const TelegramIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.98-1.66 4.81-1.95 5.35-1.96.12 0 .38.03.55.17.14.12.18.28.2.4.02.13.01.27 0 .37z"/>
  </svg>
);

const TikTokIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64c.29 0 .58.04.86.12V9.42a6.27 6.27 0 00-.86-.06A6.34 6.34 0 003.15 15.7a6.34 6.34 0 0010.82 4.48V12a8.28 8.28 0 005.62 2.22v-3.71a4.84 4.84 0 01-3.77-1.82z"/>
  </svg>
);

const GithubIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const PinterestIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/>
  </svg>
);

const DEFAULT_CONFERENCE_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80";

interface OrganizerPortalProps {
  conferences: Conference[];
  categories: Category[];
  organizers: OrganizerProfile[];
  notifications: Notification[];
  activeOrgId: string | null;
  onRegisterOrganizer: (org: Partial<OrganizerProfile>) => void;
  onUpdateOrganizer: (org: OrganizerProfile) => void;
  onSubmitConference: (conf: Partial<Conference>, isDraft: boolean) => Promise<{ error?: string }>;
  onResubmitConference: (confId: string, updated: Partial<Conference>) => Promise<{ error?: string }>;
  onDeleteDraft: (
  confId: string
  ) => Promise<{ success: boolean; error?: string }>;
  onDeleteConference?: (
  confId: string
) => Promise<{
  success: boolean;
  error?: string;
  warning?: string;
}>;
  onToggleConferenceActive?: (confId: string) => Promise<{ success: boolean; isActive: boolean; error?: string }>;
  onAddNotification: (title: string, message: string, type: "success" | "warning" | "info" | "error", orgId: string) => void;
  onClearNotifications: () => void;
  authUser: any;
  isProfileComplete: boolean;
  onNavigatePublic?: (tabId?: string) => void;
  onLogout?: () => void;
  countriesList?: string[];
  citiesList?: Array<{ name: string; country: string }>;
  inactiveCountries?: string[];
  inactiveCities?: string[];
  inactiveTopics?: string[];
}

type BulkConferenceImportRow = {
  rowNumber: number;
  conferenceTitle: string;
  topic: string;
  bannerImageUrl: string;
  startDate: string;
  endDate: string;
  country: string;
  city: string;
  venue: string;
  attendanceType: string;
  officialWebsite: string;
  contactEmail: string;
  overview: string;

  // Bulk validation state
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
};


type OrganizerMenu =
  | "DASHBOARD_OVERVIEW"
  | "ADD_CONFERENCE"
  | "BULK_ADD_CONFERENCES"
  | "PENDING_CONFERENCES"
  | "APPROVED_CONFERENCES"
  | "REJECTED_CONFERENCES"
  | "COMPLETED_CONFERENCES"
  | "MANAGE_CONFERENCES"
  | "MANAGE_PROFILE";

export default function OrganizerPortal({
  conferences,
  categories,
  organizers,
  notifications,
  activeOrgId,
  onRegisterOrganizer,
  onUpdateOrganizer,
  onSubmitConference,
  onResubmitConference,
  onDeleteDraft,
  onDeleteConference,
  onToggleConferenceActive,
  onAddNotification,
  onClearNotifications,
  authUser,
  isProfileComplete,
  onNavigatePublic,
  onLogout,
  countriesList,
  citiesList,
  inactiveCountries,
  inactiveCities,
  inactiveTopics = [],
}: OrganizerPortalProps) {
  const [activeMenu, setActiveMenu] = useState<OrganizerMenu>("DASHBOARD_OVERVIEW");

  // Active categories list filtering out deactivated topics
  const activeCategories = useMemo(() => {
    return (categories || []).filter((cat) => {
      return !inactiveTopics.includes(cat.id) && !inactiveTopics.includes(cat.name);
    });
  }, [categories, inactiveTopics]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
  return typeof window !== "undefined" ? window.innerWidth >= 1024 : false;
  });

  const [bulkImportedRows, setBulkImportedRows] = useState<BulkConferenceImportRow[]>([]);
  const [bulkUploadedFileName, setBulkUploadedFileName] = useState("");
  const [bulkImportError, setBulkImportError] = useState("");
  const [isBulkReadingFile, setIsBulkReadingFile] = useState(false);

  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [bulkStatusFilter, setBulkStatusFilter] = useState<
    "ALL" | "COMPLETE" | "NEED_FIX" | "DUPLICATES"
  >("ALL");

  const [bulkSelectedRows, setBulkSelectedRows] = useState<number[]>([]);

  const [bulkCountryCities, setBulkCountryCities] = useState<
  Record<
    string,
    Array<{
      name: string;
      country: string;
      timeZone: string;
    }>
  >
>({});

  const [bulkFixField, setBulkFixField] = useState<
    "topic" | "country" | "city"
  >("topic");

  const [bulkFixValue, setBulkFixValue] = useState("");

  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

const [bulkSubmitProgress, setBulkSubmitProgress] = useState({
  processed: 0,
  total: 0,
  success: 0,
  failed: 0,
});

const [bulkSubmitFailures, setBulkSubmitFailures] = useState<
  Array<{
    rowNumber: number;
    title: string;
    error: string;
  }>
>([]);

  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const bulkValidationSummary = useMemo(() => {
  const total = bulkImportedRows.length;

  const complete = bulkImportedRows.filter(
    (row) => row.isValid
  ).length;

  const duplicates = bulkImportedRows.filter(
    (row) => row.isDuplicate
  ).length;

  const needFix = bulkImportedRows.filter(
    (row) => !row.isValid && !row.isDuplicate
  ).length;

  const completionPercentage =
    total === 0
      ? 0
      : Math.round((complete / total) * 100);

  return {
    total,
    complete,
    needFix,
    duplicates,
    completionPercentage,
  };
}, [bulkImportedRows]);

const isBulkReadyToSubmit =
  bulkImportedRows.length > 0 &&
  bulkValidationSummary.complete === bulkImportedRows.length &&
  bulkValidationSummary.needFix === 0 &&
  bulkValidationSummary.duplicates === 0;

const filteredBulkRows = useMemo(() => {
  const normalizedSearch = bulkSearchQuery
    .trim()
    .toLowerCase();

  return bulkImportedRows.filter((row) => {
    const matchesStatus =
      bulkStatusFilter === "ALL" ||
      (bulkStatusFilter === "COMPLETE" && row.isValid) ||
      (bulkStatusFilter === "NEED_FIX" &&
        !row.isValid &&
        !row.isDuplicate) ||
      (bulkStatusFilter === "DUPLICATES" &&
        row.isDuplicate);

    const matchesSearch =
      !normalizedSearch ||
      row.conferenceTitle
        .toLowerCase()
        .includes(normalizedSearch) ||
      row.topic
        .toLowerCase()
        .includes(normalizedSearch) ||
      row.country
        .toLowerCase()
        .includes(normalizedSearch) ||
      row.city
        .toLowerCase()
        .includes(normalizedSearch) ||
      row.contactEmail
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
}, [
  bulkImportedRows,
  bulkSearchQuery,
  bulkStatusFilter,
]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    conference: false,
    profile: false,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingConfId, setEditingConfId] = useState<string | null>(null);

  // Search & Filter state for conferences
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Pagination states for conference listing pages (48 items per page)
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [managePage, setManagePage] = useState(1);
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<string[]>([]);
  const [viewingCompletedConference, setViewingCompletedConference] = useState<Conference | null>(null);
  const ORG_ITEMS_PER_PAGE = 48;

  useEffect(() => {
    setPendingPage(1);
    setApprovedPage(1);
    setRejectedPage(1);
    setCompletedPage(1);
    setManagePage(1);
    setSelectedCompletedIds([]);
  }, [activeMenu, searchQuery, categoryFilter]);

  // Conference Form State
  const [formTitle, setFormTitle] = useState("");
  const [formShortTitle, setFormShortTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formBannerImage, setFormBannerImage] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formCountry, setFormCountry] = useState(
  () => (countriesList && countriesList[0]) || ""
);
const [formState, setFormState] = useState("");
const [formCity, setFormCity] = useState("");

// Cities loaded from Supabase only for the selected conference country
    const [conferenceCountryCities, setConferenceCountryCities] = useState<
      Array<{
        name: string;
        country: string;
        timeZone: string;
      }>
    >([]);

    const [formVenue, setFormVenue] = useState("");

    useEffect(() => {
      const loadConferenceCities = async () => {
        if (!formCountry) {
          setConferenceCountryCities([]);
          return;
        }

        try {
          const rows = await fetchCitiesByCountryFromSupabase(
            formCountry.trim().toUpperCase()
          );

          setConferenceCountryCities(
            Array.isArray(rows)
              ? rows.map((city) => ({
        name: String(city.name || "")
          .trim()
          .toUpperCase(),

        country: String(
          city.country || formCountry
        )
          .trim()
          .toUpperCase(),

        timeZone: String(
          city.timeZone || ""
        ).trim()
      }))
          : []
      );
    } catch (error) {
      console.error(
        `Failed to load cities for ${formCountry}:`,
        error
      );
      setConferenceCountryCities([]);
    }
  };

  void loadConferenceCities();
}, [formCountry]);

  const [formAttendanceType, setFormAttendanceType] = useState<"Online" | "Offline" | "Hybrid">("Offline");

  // Temporary browser draft for incomplete organizer profile
    const organizerProfileDraftKey = `organizer-profile-draft:${
      String(authUser?.email || activeOrgId || "guest")
        .trim()
        .toLowerCase()
    }`;

    const [profileDraftReady, setProfileDraftReady] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileOrgName, setProfileOrgName] = useState("");
  const [profileContact, setProfileContact] = useState("");
  const [profileLogo, setProfileLogo] = useState("");
  const [profileCover, setProfileCover] = useState("");
  const [profileGallery, setProfileGallery] = useState<string[]>([]);
  const [profileWebsite, setProfileWebsite] = useState("");
  const [profileAbout, setProfileAbout] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileCity, setProfileCity] = useState("");

  useEffect(() => {
  try {
    const savedDraft = localStorage.getItem(organizerProfileDraftKey);

    if (savedDraft) {
      const draft = JSON.parse(savedDraft);

      setProfileOrgName(String(draft.profileOrgName || ""));
      setProfileContact(String(draft.profileContact || ""));
      setProfileLogo(String(draft.profileLogo || ""));
      setProfileCover(String(draft.profileCover || ""));
      setProfileGallery(
        Array.isArray(draft.profileGallery)
          ? draft.profileGallery
          : []
      );
      setProfileWebsite(String(draft.profileWebsite || ""));
      setProfileAbout(String(draft.profileAbout || ""));
      setProfileCountry(String(draft.profileCountry || ""));
      setProfileCity(String(draft.profileCity || ""));
    }
  } catch (error) {
    console.error("Failed to restore organizer profile draft:", error);
  } finally {
    setProfileDraftReady(true);
  }
}, [organizerProfileDraftKey]);

// Automatically save incomplete organizer profile as a browser draft
useEffect(() => {
  if (!profileDraftReady) return;

  const saveTimer = window.setTimeout(() => {
    try {
      const draft = {
        profileOrgName,
        profileContact,
        profileLogo,
        profileCover,
        profileGallery,
        profileWebsite,
        profileAbout,
        profileCountry,
        profileCity
      };

      localStorage.setItem(
        organizerProfileDraftKey,
        JSON.stringify(draft)
      );
    } catch (error) {
      console.error("Failed to save organizer profile draft:", error);
    }
  }, 300);

  return () => {
    window.clearTimeout(saveTimer);
  };
}, [
  profileDraftReady,
  organizerProfileDraftKey,
  profileOrgName,
  profileContact,
  profileLogo,
  profileCover,
  profileGallery,
  profileWebsite,
  profileAbout,
  profileCountry,
  profileCity
]);

  // Cities loaded from Supabase only for the selected profile country
  const [profileCountryCities, setProfileCountryCities] = useState<
    Array<{ name: string; country: string }>
  >([]);

  useEffect(() => {
  const loadProfileCities = async () => {
    if (!profileCountry) {
      setProfileCountryCities([]);
      return;
    }

    try {
      const rows = await fetchCitiesByCountryFromSupabase(
        profileCountry.trim().toUpperCase()
      );

      setProfileCountryCities(
        Array.isArray(rows)
          ? rows.map((city) => ({
              name: String(city.name || "").trim().toUpperCase(),
              country: String(city.country || profileCountry)
                .trim()
                .toUpperCase()
            }))
          : []
      );
    } catch (error) {
      console.error(
        `Failed to load profile cities for ${profileCountry}:`,
        error
      );

      setProfileCountryCities([]);
    }
  };

  void loadProfileCities();
}, [profileCountry]);

  // Dynamic available countries added by Admin for Profile and Conference
  const adminCountryOptions = useMemo(() => {
    const list = (countriesList || [])
      .map((c) => (typeof c === "string" ? c : String((c as any)?.name || "")).trim().toUpperCase())
      .filter((c) => Boolean(c) && !inactiveCountries?.some((ic) => ic.toUpperCase() === c));
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  }, [countriesList, inactiveCountries]);

  // Profile cities options based on selected profileCountry from Admin-added cities
  const profileCityOptions = useMemo(() => {
  if (!profileCountry) return [];

  const normalizedCountry = profileCountry.trim().toUpperCase();

  const list = profileCountryCities
    .filter(
      (city) =>
        String(city.country || "").trim().toUpperCase() ===
        normalizedCountry
    )
    .map((city) => String(city.name || "").trim().toUpperCase())
    .filter(
      (cityName) =>
        Boolean(cityName) &&
        !inactiveCities?.some(
          (inactiveCity) =>
            inactiveCity.trim().toUpperCase() ===
            `${normalizedCountry}:::${cityName}`
        )
    );

  return Array.from(new Set<string>(list)).sort(
    (a: string, b: string) => a.localeCompare(b)
  );
}, [profileCountry, profileCountryCities, inactiveCities]);

  // Conference cities options based on selected formCountry from Admin-added cities
  const conferenceCityOptions = useMemo(() => {
  if (!formCountry) return [];

  const normalizedCountry = formCountry.trim().toUpperCase();

  const list = conferenceCountryCities
    .filter(
      (city) =>
        String(city.country || "").trim().toUpperCase() ===
        normalizedCountry
    )
    .map((city) => String(city.name || "").trim().toUpperCase())
    .filter(
      (cityName) =>
        Boolean(cityName) &&
        !inactiveCities?.some(
          (inactiveCity) =>
            inactiveCity.trim().toUpperCase() ===
            `${normalizedCountry}:::${cityName}`
        )
    );

  return Array.from(new Set<string>(list)).sort(
  (a: string, b: string) => a.localeCompare(b)
);

}, [formCountry, conferenceCountryCities, inactiveCities]);

  const [formOrgWebsite, setFormOrgWebsite] = useState("");
  const [formConfWebsite, setFormConfWebsite] = useState("");
  const [formRegLink, setFormRegLink] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [profileTwitter, setProfileTwitter] = useState("");
  const [profileLinkedin, setProfileLinkedin] = useState("");
  const [profileFacebook, setProfileFacebook] = useState("");
  const [profileInstagram, setProfileInstagram] = useState("");
  const [profileYoutube, setProfileYoutube] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileTelegram, setProfileTelegram] = useState("");
  const [profileTiktok, setProfileTiktok] = useState("");
  const [profileGithub, setProfileGithub] = useState("");
  const [profilePinterest, setProfilePinterest] = useState("");

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const handleDownloadBulkConferenceTemplate = async () => {
  try {
    const XLSX = await import("xlsx");

    const headers = [
      "Conference Title",
      "Topic",
      "Banner Image URL",
      "Start Date",
      "End Date",
      "Country",
      "City",
      "Venue Name / Address",
      "Attendance Type",
      "Official Conference Website",
      "Contact Email",
      "Conference Overview & Call for Papers",
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    // Make the columns easier to read when Organizer opens the template.
    worksheet["!cols"] = [
      { wch: 45 }, // Conference Title
      { wch: 28 }, // Topic
      { wch: 45 }, // Banner Image URL
      { wch: 15 }, // Start Date
      { wch: 15 }, // End Date
      { wch: 22 }, // Country
      { wch: 22 }, // City
      { wch: 40 }, // Venue
      { wch: 22 }, // Attendance Type
      { wch: 45 }, // Website
      { wch: 32 }, // Contact Email
      { wch: 70 }, // Overview
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Conferences"
    );

    XLSX.writeFile(
      workbook,
      "InternationalConference_Bulk_Upload_Template.xlsx"
    );
  } catch (error) {
    console.error(
      "Failed to create Bulk Conference Excel template:",
      error
    );

    showToast(
      "Unable to download the Excel template. Please try again."
    );
  }
};

const handleBulkConferenceFileUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  setBulkImportError("");

  // Do not allow another upload until the current one is deleted.
  if (bulkImportedRows.length > 0 || bulkUploadedFileName) {
    setBulkImportError(
      "A bulk Excel file is already loaded. Delete the current upload before uploading another file."
    );

    event.target.value = "";
    return;
  }

  const fileName = file.name.toLowerCase();

  if (!fileName.endsWith(".xlsx")) {
    setBulkImportError("Only .xlsx Excel files are allowed.");

    event.target.value = "";
    return;
  }

  try {
    setIsBulkReadingFile(true);

    const XLSX = await import("xlsx");

    const arrayBuffer = await file.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
  type: "array",
  cellDates: true,
});

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("The Excel file does not contain a worksheet.");
    }

    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
  worksheet,
  {
    defval: "",
    raw: true,
  }
);

    // Ignore completely blank rows.
    const nonEmptyRows = rawRows.filter((row) =>
      Object.values(row).some(
        (value) => String(value ?? "").trim() !== ""
      )
    );

    if (nonEmptyRows.length === 0) {
      setBulkImportError(
        "The Excel file does not contain any conference rows."
      );

      event.target.value = "";
      return;
    }

    if (nonEmptyRows.length > 1000) {
      setBulkImportError(
        `This Excel file contains ${nonEmptyRows.length} conferences. The maximum allowed is 1,000.`
      );

      event.target.value = "";
      return;
    }

    const formatBulkExcelDate = (value: unknown): string => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
      }

      return String(value ?? "").trim();
    };

    const importedRows: BulkConferenceImportRow[] =
      nonEmptyRows.map((row, index) => ({
        rowNumber: index + 2,

        conferenceTitle: String(
          row["Conference Title"] ?? ""
        ).trim(),

        topic: String(row["Topic"] ?? "").trim(),

        bannerImageUrl: String(
          row["Banner Image URL"] ?? ""
        ).trim(),

        startDate: formatBulkExcelDate(row["Start Date"]),

        endDate: formatBulkExcelDate(row["End Date"]),

        country: String(row["Country"] ?? "").trim(),

        city: String(row["City"] ?? "").trim(),

        venue: String(
          row["Venue Name / Address"] ?? ""
        ).trim(),

        attendanceType: String(
          row["Attendance Type"] ?? ""
        ).trim(),

        officialWebsite: String(
          row["Official Conference Website"] ?? ""
        ).trim(),

        contactEmail: String(
          row["Contact Email"] ?? ""
        ).trim(),

        overview: String(
        row["Conference Overview & Call for Papers"] ?? ""
      ).trim(),

      errors: [],
      isValid: false,
      isDuplicate: false,
      }));

    const validatedRows =
  validateBulkConferenceRows(importedRows);

  setBulkImportedRows(validatedRows);
  const uniqueCountries = Array.from(
  new Set(
    validatedRows
      .map((row) =>
        row.country.trim().toUpperCase()
      )
      .filter(Boolean)
  )
);

for (const country of uniqueCountries) {
  void loadBulkCitiesForCountry(country);
}
  setBulkUploadedFileName(file.name);
  } catch (error) {
    console.error("Bulk Excel import failed:", error);

    setBulkImportError(
      error instanceof Error
        ? error.message
        : "Unable to read this Excel file."
    );

    event.target.value = "";
  } finally {
    setIsBulkReadingFile(false);
  }
};

const handleDeleteBulkUpload = () => {
  setBulkImportedRows([]);
  setBulkUploadedFileName("");
  setBulkImportError("");
  setBulkCountryCities({});

  if (bulkFileInputRef.current) {
    bulkFileInputRef.current.value = "";
  }
};

const clearBulkConferenceWorkspace = () => {
  setBulkImportedRows([]);
  setBulkUploadedFileName("");
  setBulkImportError("");
  setBulkCountryCities({});
  setBulkSearchQuery("");
  setBulkStatusFilter("ALL");
  setBulkSelectedRows([]);
  setBulkFixField("topic");
  setBulkFixValue("");

  if (bulkFileInputRef.current) {
    bulkFileInputRef.current.value = "";
  }
};

const requestOrganizerMenuChange = (
  nextMenu: OrganizerMenu
) => {
  if (
    activeMenu === "BULK_ADD_CONFERENCES" &&
    hasUnsubmittedBulkWork &&
    nextMenu !== "BULK_ADD_CONFERENCES"
  ) {
    const shouldLeave = window.confirm(
      "Your bulk conference upload has not been submitted. If you leave this page, all imported and edited bulk conference data will be deleted. Do you want to leave?"
    );

    if (!shouldLeave) {
      return;
    }

    clearBulkConferenceWorkspace();
  }

  setActiveMenu(nextMenu);
};

const buildBulkConferencePayload = (
  row: BulkConferenceImportRow
): Partial<Conference> => {
  const selectedCityTimeZone =
  (
    bulkCountryCities[
      row.country.trim().toUpperCase()
    ] || []
  ).find(
    (city) =>
      String(city.name || "")
        .trim()
        .toUpperCase() ===
      String(row.city || "")
        .trim()
        .toUpperCase()
  )?.timeZone?.trim() || "";

  const conferenceTimeZone =
    resolveConferenceTimeZone(
      selectedCityTimeZone,
      row.country,
      row.city
    );

  return {
    title: row.conferenceTitle.trim(),
    shortTitle: row.conferenceTitle.trim().substring(0, 20),
    category: row.topic.trim(),

    bannerImage: row.bannerImageUrl.trim()
      ? row.bannerImageUrl.trim()
      : DEFAULT_CONFERENCE_IMAGE,

    description: row.overview.trim(),
    startDate: row.startDate.trim(),
    endDate: row.endDate.trim(),
    time: "09:00 AM",
    timeZone: conferenceTimeZone,
    country: row.country.trim(),
    state: "",
    city: row.city.trim(),
    venue: row.venue.trim(),

    attendanceType:
      row.attendanceType.trim() as
        | "Online"
        | "Offline"
        | "Hybrid",

    organizerWebsite:
      activeProfile?.organizationWebsite || "",

    conferenceWebsite:
      row.officialWebsite.trim(),

    registrationLink:
      row.officialWebsite.trim(),

    contactEmail:
      row.contactEmail.trim(),
  };
};

const submitBulkConferencesInBatches = async () => {
  if (!isBulkReadyToSubmit) {
    showToast(
      "All remaining conferences must be 100% valid before submission."
    );
    return;
  }

  if (bulkImportedRows.length === 0) {
    showToast("There are no conferences to submit.");
    return;
  }

  setIsBulkSubmitting(true);
  setBulkSubmitFailures([]);

  setBulkSubmitProgress({
    processed: 0,
    total: bulkImportedRows.length,
    success: 0,
    failed: 0,
  });

  const failures: Array<{
    rowNumber: number;
    title: string;
    error: string;
  }> = [];

  let processed = 0;
  let success = 0;
  let failed = 0;

  const BATCH_SIZE = 10;

  try {
    for (
      let startIndex = 0;
      startIndex < bulkImportedRows.length;
      startIndex += BATCH_SIZE
    ) {
      const batch = bulkImportedRows.slice(
        startIndex,
        startIndex + BATCH_SIZE
      );

      const batchResults = await Promise.all(
        batch.map(async (row) => {
          try {
            const payload =
              buildBulkConferencePayload(row);

            const result =
              await onSubmitConference(
                payload,
                false
              );

            if (result?.error) {
              return {
                success: false,
                row,
                error: result.error,
              };
            }

            return {
              success: true,
              row,
              error: "",
            };
          } catch (error) {
            return {
              success: false,
              row,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown submission error.",
            };
          }
        })
      );

      for (const result of batchResults) {
        processed += 1;

        if (result.success) {
          success += 1;
        } else {
          failed += 1;

          failures.push({
            rowNumber: result.row.rowNumber,
            title: result.row.conferenceTitle,
            error:
              result.error ||
              "Conference submission failed.",
          });
        }
      }

      setBulkSubmitProgress({
        processed,
        total: bulkImportedRows.length,
        success,
        failed,
      });

      setBulkSubmitFailures([...failures]);
    }

    if (
      failed === 0 &&
      success === bulkImportedRows.length
    ) {
      showToast(
        `${success} conferences submitted successfully for Admin review.`
      );

      clearBulkConferenceWorkspace();

      setBulkSubmitProgress({
        processed: 0,
        total: 0,
        success: 0,
        failed: 0,
      });

      setBulkSubmitFailures([]);

      setActiveMenu("PENDING_CONFERENCES");
    } else {
  const failedRowNumbers = new Set(
    failures.map(
      (failure) => failure.rowNumber
    )
  );

  const remainingFailedRows =
    bulkImportedRows.filter((row) =>
      failedRowNumbers.has(row.rowNumber)
    );

  setBulkImportedRows(
    validateBulkConferenceRows(
      remainingFailedRows
    )
  );

  setBulkSelectedRows([]);
  setBulkSearchQuery("");
  setBulkStatusFilter("ALL");
  setBulkFixValue("");

  showToast(
    `${success} conferences submitted successfully. ${failed} failed. Only the failed conferences remain here for review and retry.`
  );
}
  } finally {
    setIsBulkSubmitting(false);
  }
};

const handleBulkSubmitClick = async () => {
  if (!isBulkReadyToSubmit) {
    showToast(
      "All remaining conferences must be 100% valid before submission."
    );
    return;
  }

  if (bulkImportedRows.length === 0) {
    showToast("There are no conferences to submit.");
    return;
  }

  const confirmed = window.confirm(
    `You are about to submit ${bulkImportedRows.length} conferences for Admin review. Do you want to continue?`
  );

  if (!confirmed) {
    return;
  }

  await submitBulkConferencesInBatches();
};

const loadBulkCitiesForCountry = async (
  country: string
) => {
  const normalizedCountry = country
    .trim()
    .toUpperCase();

  if (!normalizedCountry) {
    return;
  }

  if (bulkCountryCities[normalizedCountry]) {
    return;
  }

  try {
    const rows =
      await fetchCitiesByCountryFromSupabase(
        normalizedCountry
      );

    setBulkCountryCities((current) => ({
      ...current,
      [normalizedCountry]: Array.isArray(rows)
        ? rows.map((city) => ({
            name: String(city.name || "")
              .trim()
              .toUpperCase(),

            country: String(
              city.country || normalizedCountry
            )
              .trim()
              .toUpperCase(),

            timeZone: String(
              city.timeZone || ""
            ).trim(),
          }))
        : [],
    }));
  } catch (error) {
    console.error(
      `Failed to load bulk cities for ${normalizedCountry}:`,
      error
    );

    setBulkCountryCities((current) => ({
      ...current,
      [normalizedCountry]: [],
    }));
  }
};

const updateBulkConferenceRow = (
  rowNumber: number,
  field: keyof BulkConferenceImportRow,
  value: string
) => {
  setBulkImportedRows((currentRows) => {
    const updatedRows = currentRows.map((row) => {
      if (row.rowNumber !== rowNumber) {
        return row;
      }

      return {
        ...row,
        [field]: value,
      };
    });

    // Re-run all validation after every edit,
    // including duplicate checks inside the Excel
    // and against this Organizer's Pending/Approved conferences.
    return validateBulkConferenceRows(updatedRows);
  });
};

const hasUnsubmittedBulkWork =
  bulkImportedRows.length > 0;

  useEffect(() => {
  if (!hasUnsubmittedBulkWork) {
    return;
  }

  const handleBeforeUnload = (
    event: BeforeUnloadEvent
  ) => {
    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener(
    "beforeunload",
    handleBeforeUnload
  );

  return () => {
    window.removeEventListener(
      "beforeunload",
      handleBeforeUnload
    );
  };
}, [hasUnsubmittedBulkWork]);



const deleteBulkConferenceRow = (
  rowNumber: number
) => {
  setBulkImportedRows((currentRows) => {
    const remainingRows = currentRows.filter(
      (row) => row.rowNumber !== rowNumber
    );

    return validateBulkConferenceRows(remainingRows);
  });
};

const applyBulkFix = (
  mode: "SELECTED" | "MATCHING"
) => {
  const newValue = bulkFixValue.trim();

  if (!newValue) {
    return;
  }

  if (bulkSelectedRows.length === 0) {
    return;
  }

  setBulkImportedRows((currentRows) => {
    const sourceRow = currentRows.find(
      (row) =>
        row.rowNumber === bulkSelectedRows[0]
    );

    if (!sourceRow) {
      return currentRows;
    }

    const normalizeBulkFixValue = (
      value: unknown
    ) =>
      String(value ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    const sourceFieldValue =
      normalizeBulkFixValue(
        sourceRow[bulkFixField]
      );

    const sourceCountry =
      normalizeBulkFixValue(
        sourceRow.country
      );

    const updatedRows = currentRows.map(
      (row) => {
        let shouldUpdate = false;

        if (mode === "SELECTED") {
          shouldUpdate =
            bulkSelectedRows.includes(
              row.rowNumber
            );
        } else {
          const rowFieldValue =
            normalizeBulkFixValue(
              row[bulkFixField]
            );

          shouldUpdate =
            rowFieldValue === sourceFieldValue;

          // For City, only change matching Cities
          // inside the same Country.
          if (
            bulkFixField === "city" &&
            shouldUpdate
          ) {
            shouldUpdate =
              normalizeBulkFixValue(
                row.country
              ) === sourceCountry;
          }
        }

        if (!shouldUpdate) {
          return row;
        }

        // When Country changes, clear City because
        // the old City may not belong to new Country.
        if (bulkFixField === "country") {
          return {
            ...row,
            country: newValue,
            city: "",
          };
        }

        if (bulkFixField === "topic") {
          return {
            ...row,
            topic: newValue,
          };
        }

        return {
          ...row,
          city: newValue,
        };
      }
    );

    return validateBulkConferenceRows(
      updatedRows
    );
  });

  setBulkSelectedRows([]);
  setBulkFixValue("");
};

const validateBulkConferenceRow = (
  row: BulkConferenceImportRow
): BulkConferenceImportRow => {
  const errors: string[] = [];

  const normalize = (value: unknown) =>
    String(value ?? "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  const normalizeUpper = (value: unknown) =>
    String(value ?? "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidWebsite = (value: string) => {
  try {
    const url = new URL(value.trim());

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};


  const parseDateOnly = (value: string) => {
    const trimmed = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return null;
    }

    const [year, month, day] = trimmed
      .split("-")
      .map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  };

  // Required fields
  if (!row.conferenceTitle.trim()) {
    errors.push("Conference Title is required.");
  }

  if (!row.topic.trim()) {
    errors.push("Topic is required.");
  }

  if (!row.startDate.trim()) {
    errors.push("Start Date is required.");
  }

  if (!row.endDate.trim()) {
    errors.push("End Date is required.");
  }

  if (!row.country.trim()) {
    errors.push("Country is required.");
  }

  if (!row.city.trim()) {
    errors.push("City is required.");
  }

  if (!row.attendanceType.trim()) {
    errors.push("Attendance Type is required.");
  }

  if (!row.officialWebsite.trim()) {
    errors.push(
      "Official Conference Website is required."
    );
  }

  if (!row.contactEmail.trim()) {
    errors.push("Contact Email is required.");
  }

  if (!row.overview.trim()) {
    errors.push(
      "Conference Overview & Call for Papers is required."
    );
  }

  // Topic must exist in the CURRENT Admin Topic list.
  if (row.topic.trim()) {
    const validTopic = activeCategories.some(
      (category) =>
        normalize(category.name) ===
        normalize(row.topic)
    );

    if (!validTopic) {
      errors.push(
        `Topic "${row.topic}" is not available in the current Topic list.`
      );
    }
  }

  // Country must exist in the CURRENT Admin Country list.
  if (row.country.trim()) {
    const normalizedCountry =
      normalizeUpper(row.country);

    const validCountry =
      adminCountryOptions.some(
        (country) =>
          normalizeUpper(country) ===
          normalizedCountry
      );

    if (!validCountry) {
      errors.push(
        `Country "${row.country}" is not available in the current Country list.`
      );
    }
  }

  // City must belong to the selected Country.
  if (row.country.trim() && row.city.trim()) {
    const normalizedCountry =
      normalizeUpper(row.country);

    const normalizedCity =
      normalizeUpper(row.city);

    const cityExistsForCountry =
  (
    bulkCountryCities[
      normalizedCountry
    ] || []
  ).some((city) => {
    const cityCountry =
      normalizeUpper(city.country);

    const cityName =
      normalizeUpper(city.name);

    if (
      cityCountry !== normalizedCountry ||
      cityName !== normalizedCity
    ) {
      return false;
    }

    const inactiveKey =
      `${normalizedCountry}:::${normalizedCity}`;

    const isInactive =
      (inactiveCities || []).some(
        (inactiveCity) =>
          normalizeUpper(inactiveCity) ===
          inactiveKey
      );

    return !isInactive;
  });

    if (!cityExistsForCountry) {
      errors.push(
        `City "${row.city}" is not available for Country "${row.country}".`
      );
    }
  }

  // Attendance type
  if (row.attendanceType.trim()) {
    const attendance =
      normalize(row.attendanceType);

    const validAttendance =
      attendance === "offline" ||
      attendance === "online" ||
      attendance === "hybrid";

    if (!validAttendance) {
      errors.push(
        'Attendance Type must be "Offline", "Online", or "Hybrid".'
      );
    }
  }

  // Email
  if (
    row.contactEmail.trim() &&
    !isValidEmail(row.contactEmail)
  ) {
    errors.push("Contact Email is invalid.");
  }

  // Website
  if (
    row.officialWebsite.trim() &&
    !isValidWebsite(row.officialWebsite)
  ) {
    errors.push(
      "Official Conference Website must be a valid http:// or https:// URL."
    );
  }

  // Dates
  const startDate = row.startDate.trim()
    ? parseDateOnly(row.startDate)
    : null;

  const endDate = row.endDate.trim()
    ? parseDateOnly(row.endDate)
    : null;

  if (
    row.startDate.trim() &&
    !startDate
  ) {
    errors.push(
      "Start Date must use YYYY-MM-DD format."
    );
  }

  if (
    row.endDate.trim() &&
    !endDate
  ) {
    errors.push(
      "End Date must use YYYY-MM-DD format."
    );
  }
  if (startDate) {
  const now = new Date();

  const today = new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
  );

  if (startDate.getTime() < today.getTime()) {
    errors.push(
      "Start Date cannot be before today."
    );
  }
}

  if (
    startDate &&
    endDate &&
    endDate.getTime() < startDate.getTime()
  ) {
    errors.push(
      "End Date cannot be before Start Date."
    );
  }

  return {
    ...row,
    errors,
    isValid: errors.length === 0,
    isDuplicate: false,
  };
};

const validateBulkConferenceRows = (
  rows: BulkConferenceImportRow[]
): BulkConferenceImportRow[] => {
  const organizerId = String(
    activeProfile?.id ||
    activeOrgId ||
    authUser?.organizerId ||
    ""
  ).trim();

  const existingDuplicateKeys = new Set(
    orgConferences
      .filter((conference) => {
        const status = String(conference.status || "")
          .trim()
          .toLowerCase();

        const isPending =
          conference.status === ConferenceStatus.PendingReview ||
          status === "pending review" ||
          status === "pending";

        const isApproved =
          conference.status === ConferenceStatus.Approved ||
          status === "approved";

        return (
          (isPending || isApproved) &&
          !isConferenceCompleted(conference)
        );
      })
      .map((conference) =>
        buildConferenceDuplicateKey(
          {
            title: conference.title,
            category: conference.category,
            country: conference.country,
            city: conference.city,
            startDate: conference.startDate,
            endDate: conference.endDate,
          },
          organizerId
        )
      )
  );

  const firstExcelRowByKey = new Map<string, number>();

  return rows.map((originalRow) => {
    const row = validateBulkConferenceRow(originalRow);

    const hasDuplicateIdentityFields =
      Boolean(row.conferenceTitle.trim()) &&
      Boolean(row.topic.trim()) &&
      Boolean(row.country.trim()) &&
      Boolean(row.city.trim()) &&
      Boolean(row.startDate.trim()) &&
      Boolean(row.endDate.trim());

    if (!hasDuplicateIdentityFields) {
      return {
        ...row,
        isDuplicate: false,
        isValid: row.errors.length === 0,
      };
    }

    const duplicateKey = buildConferenceDuplicateKey(
      {
        title: row.conferenceTitle,
        category: row.topic,
        country: row.country,
        city: row.city,
        startDate: row.startDate,
        endDate: row.endDate,
      },
      organizerId
    );

    const duplicateExisting =
      existingDuplicateKeys.has(duplicateKey);

    const firstExcelRow =
      firstExcelRowByKey.get(duplicateKey);

    const duplicateInsideExcel =
      firstExcelRow !== undefined;

    if (!duplicateInsideExcel) {
      firstExcelRowByKey.set(
        duplicateKey,
        row.rowNumber
      );
    }

    const duplicateErrors: string[] = [];

    if (duplicateExisting) {
      duplicateErrors.push(
        "This exact conference already exists in your Pending or Approved conferences."
      );
    }

    if (duplicateInsideExcel) {
      duplicateErrors.push(
        `This conference is an exact duplicate of Excel row ${firstExcelRow}.`
      );
    }

    const allErrors = [
      ...row.errors,
      ...duplicateErrors,
    ];

    return {
      ...row,
      errors: allErrors,
      isDuplicate:
        duplicateExisting ||
        duplicateInsideExcel,
      isValid: allErrors.length === 0,
    };
  });
};


  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const activeProfile = useMemo(() => {
    return organizers.find(
      (org) =>
        (activeOrgId && org.id === activeOrgId) ||
        (authUser?.email && org.email?.toLowerCase().trim() === authUser.email.toLowerCase().trim())
    );
  }, [organizers, activeOrgId, authUser]);

  useEffect(() => {
      // If an incomplete profile has a saved browser draft,
  // do not overwrite that draft with database/profile values.
  if (!isProfileComplete) {
    try {
      const savedDraft = localStorage.getItem(organizerProfileDraftKey);

      if (savedDraft) {
        return;
      }
    } catch (error) {
      console.error("Failed to check organizer profile draft:", error);
    }
  }

  // Do not overwrite unsaved profile form values while the organizer is editing.
  // This prevents social-media links and other fields from disappearing when
  // the page receives refreshed organizer data after switching browser tabs/apps.
  if (isEditingProfile) {
    return;
  }

  if (activeProfile) {
    setProfileOrgName(activeProfile.organizationName || "");
    setProfileContact(activeProfile.contactPerson || authUser?.name || "");
    setProfileLogo(activeProfile.logo || "");
    setProfileCover(activeProfile.coverImage || "");
    setProfileGallery(activeProfile.galleryImages || []);
    setProfileWebsite(activeProfile.organizationWebsite || "");
    setProfileAbout(activeProfile.aboutOrganization || "");
    setProfileCountry(activeProfile.country || "");
    setProfileCity(activeProfile.city || "");
    setProfileTwitter(activeProfile.twitter || "");
    setProfileLinkedin(activeProfile.linkedin || "");
    setProfileFacebook(activeProfile.facebook || "");
    setProfileInstagram(activeProfile.instagram || "");
    setProfileYoutube(activeProfile.youtube || "");
    setProfileWhatsapp(activeProfile.whatsapp || "");
    setProfileTelegram(activeProfile.telegram || "");
    setProfileTiktok(activeProfile.tiktok || "");
    setProfileGithub(activeProfile.github || "");
    setProfilePinterest(activeProfile.pinterest || "");
  } else if (authUser?.name) {
    setProfileContact(authUser.name);
  }
}, [activeProfile, countriesList, authUser, isEditingProfile]);

  // Scope: Organizer sees their own conferences (by activeOrgId, activeProfile.id, or contactEmail)
  const orgConferences = useMemo(() => {
    const currentOrgId = activeProfile?.id || activeOrgId;
    const userEmail = authUser?.email?.toLowerCase().trim();
    const profileEmail = activeProfile?.email?.toLowerCase().trim();

    return conferences.filter((c) => {
      if (currentOrgId && c.organizerId === currentOrgId) return true;
      if (activeOrgId && c.organizerId === activeOrgId) return true;
      if (userEmail && c.contactEmail && c.contactEmail.toLowerCase().trim() === userEmail) return true;
      if (profileEmail && c.contactEmail && c.contactEmail.toLowerCase().trim() === profileEmail) return true;
      return false;
    });
  }, [conferences, activeOrgId, activeProfile, authUser]);

  const sortConferencesNewestFirst = (items: Conference[]) => {
  return [...items].sort((a, b) => {
    const aTime = new Date(
      a.createdAt || a.updatedAt || a.startDate || 0
    ).getTime();

    const bTime = new Date(
      b.createdAt || b.updatedAt || b.startDate || 0
    ).getTime();

    return bTime - aTime;
  });
};

  const isPendingStatus = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === "pending review" || s === "pending_review" || s === "pending";
  };

  const stats = useMemo(() => {
    const total = orgConferences.length;
    const completed = orgConferences.filter((c) => isConferenceCompleted(c)).length;
    const approved = orgConferences.filter((c) => (c.status === ConferenceStatus.Approved || String(c.status).toLowerCase().trim() === "approved") && !isConferenceCompleted(c)).length;
    const pending = orgConferences.filter((c) => isPendingStatus(c.status) && !isConferenceCompleted(c)).length;
    const rejected = orgConferences.filter((c) => (c.status === ConferenceStatus.Rejected || String(c.status).toLowerCase().trim() === "rejected") && !isConferenceCompleted(c)).length;
    const draft = orgConferences.filter((c) => (c.status === ConferenceStatus.Draft || String(c.status).toLowerCase().trim() === "draft") && !isConferenceCompleted(c)).length;
    
    return {
        total,
        completed,
        approved,
        pending,
        rejected,
        draft,
      };
  }, [orgConferences]);

  const toggleGroup = (group: "conference" | "profile") => {
    setOpenGroups((prev) => ({ conference: false, profile: false, [group]: !prev[group] }));
  };

  const resetConferenceForm = () => {
    setEditingConfId(null);
    setFormTitle("");
    setFormShortTitle("");
    setFormCategory(activeCategories[0]?.name || "Computer Science");
    setFormBannerImage("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
    setFormTime("09:00 AM");
    const defaultCountry = (countriesList && countriesList[0]) || "";
    const matchingCities = (citiesList || []).filter((c) => c.country.trim().toLowerCase() === defaultCountry.trim().toLowerCase()).map((c) => c.name);
    setFormCountry(defaultCountry);
    setFormState("");
    setFormCity(matchingCities[0] || "");
    setFormVenue("");
    setFormAttendanceType("Offline");
    setFormOrgWebsite(activeProfile?.organizationWebsite || "");
    setFormConfWebsite("");
    setFormRegLink("");
    setFormContactEmail(activeProfile?.email || authUser?.email || "");
  };

  const startEditConference = (conf: Conference) => {
    setEditingConfId(conf.id);
    setFormTitle(conf.title);
    setFormShortTitle(conf.shortTitle || "");
    setFormCategory(conf.category);
    setFormBannerImage(conf.bannerImage || "");
    setFormDescription(conf.description || "");
    setFormStartDate(conf.startDate || "");
    setFormEndDate(conf.endDate || "");
    setFormTime(conf.time || "09:00 AM");
    setFormCountry(conf.country || (countriesList && countriesList[0]) || "");
    setFormState(conf.state || "");
    setFormCity(conf.city || "");
    setFormVenue(conf.venue || "");
    setFormAttendanceType(conf.attendanceType || "Offline");
    setFormOrgWebsite(conf.organizerWebsite || "");
    setFormConfWebsite(conf.conferenceWebsite || "");
    setFormRegLink(conf.registrationLink || "");
    setFormContactEmail(conf.contactEmail || activeProfile?.email || authUser?.email || "");
    setActiveMenu("ADD_CONFERENCE");
  };

  const handleConferenceFormSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
  e.preventDefault();

 const selectedCityTimeZone =
  conferenceCountryCities.find(
    (city) =>
      String(city.name || "")
        .trim()
        .toUpperCase() ===
      String(formCity || "")
        .trim()
        .toUpperCase()
  )?.timeZone?.trim() || "";

if (
  formCountry.trim() &&
  formCity.trim() &&
  !selectedCityTimeZone
) {
  showToast(
    `Timezone is not configured for "${formCity}". Please contact the administrator before submitting this conference.`
  );
  return;
}

const conferenceTimeZone =
  resolveConferenceTimeZone(
    selectedCityTimeZone,
    formCountry,
    formCity
  );

const todayStr =
  getTodayInTimeZone(conferenceTimeZone);


    if (!formTitle.trim()) {
      showToast("Conference title is required.");
      return;
    }
    if (!formContactEmail.trim()) {
      showToast("Contact email is required.");
      return;
    }
    if (formStartDate && formStartDate < todayStr) {
      showToast("Start date cannot be in the past.");
      return;
    }
    if (formEndDate && formEndDate < (formStartDate || todayStr)) {
      showToast("End date cannot be earlier than start date.");
      return;
    }

    try {
      setIsSubmittingForm(true);
      const payload: Partial<Conference> = {
        title: formTitle,
        shortTitle: formShortTitle || formTitle.substring(0, 20),
        category: formCategory || activeCategories[0]?.name || "General",
        bannerImage: formBannerImage?.trim() ? formBannerImage.trim() : DEFAULT_CONFERENCE_IMAGE,
        description: formDescription,
        startDate: formStartDate || todayStr,
        endDate: formEndDate || formStartDate || todayStr,
        time: formTime,
        timeZone: conferenceTimeZone,
        country: formCountry,
        state: formState,
        city: formCity,
        venue: formVenue,
        attendanceType: formAttendanceType,
        organizerWebsite: formOrgWebsite,
        conferenceWebsite: formConfWebsite,
        registrationLink: formRegLink || formConfWebsite,
        contactEmail: formContactEmail.trim(),
      };

      if (editingConfId) {
        const res = await onResubmitConference(editingConfId, payload);
        if (res?.error) {
          showToast(res.error);
        } else {
          showToast("Conference submitted for admin review!");
          resetConferenceForm();
          setActiveMenu("PENDING_CONFERENCES");
        }
      } else {
        const res = await onSubmitConference(payload, isDraft);
        if (res?.error) {
          showToast(res.error);
        } else {
          showToast(isDraft ? "Conference draft saved!" : "Conference submitted for admin review!");
          resetConferenceForm();
          setActiveMenu(isDraft ? "MANAGE_CONFERENCES" : "PENDING_CONFERENCES");
        }
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Profile completion wall if incomplete
  if (!isProfileComplete) {
    return (
      <div className="h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-slate-100">
      <div className="min-h-full w-full flex items-start justify-center px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-2xl w-full bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-100 p-4 sm:p-6 md:p-8 shadow-xl space-y-5 sm:space-y-6 min-w-0">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#37494E] rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto shadow-lg text-white">
              <User className="h-10 w-10 text-blue-300" />
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-gray-900 leading-tight break-words">
              Complete Your Organizer Profile
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed break-words">
              Before submitting conferences to Global Conference Hub, please complete your organization profile.
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!profileOrgName.trim()) {
              showToast("Organization Name is required");
              return;
            }
            if (!profileCountry) {
              showToast("Please select a Country");
              return;
            }
            if (!profileCity.trim()) {
              showToast("Please select or enter a City");
              return;
            }
            if (!profileWebsite.trim()) {
              showToast("Website Link is required");
              return;
            }
            if (!profileAbout.trim()) {
              showToast("About Organization is required");
              return;
            }

            let formattedWebsite = profileWebsite.trim();
            if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
              formattedWebsite = `https://${formattedWebsite}`;
            }

            onRegisterOrganizer({
              organizationName: profileOrgName.trim(),
              contactPerson: profileContact.trim() || authUser?.name || "",
              logo: profileLogo || "",
              coverImage: profileCover || "",
              galleryImages: profileGallery,
              organizationWebsite: formattedWebsite,
              aboutOrganization: profileAbout.trim(),
              country: profileCountry,
              city: profileCity.trim(),
              isProfileComplete: true,
            });
            // Profile completed — remove the temporary browser draft
              try {
                localStorage.removeItem(organizerProfileDraftKey);
              } catch (error) {
                console.error("Failed to clear organizer profile draft:", error);
              }

              showToast("Profile completed successfully!");
          }} 
          
          className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0"> 
              <div className="space-y-1 md:col-span-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MIT University Systems"
                  value={profileOrgName || ""}
                  onChange={(e) => setProfileOrgName(e.target.value)}
                  className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact Person *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Sarah Jenkins"
                  value={profileContact || ""}
                  onChange={(e) => setProfileContact(e.target.value)}
                  className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Country *</label>
                <select
                  required
                  value={profileCountry || ""}
                 onChange={(e) => {
                  const selectedC = e.target.value;
                  setProfileCountry(selectedC);
                  setProfileCity("");
                }}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select Country</option>
                  {adminCountryOptions.map((c, idx) => (
                    <option key={`${c}-${idx}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">City *</label>
                {profileCityOptions.length > 0 ? (
                  <select
                    required
                    disabled={!profileCountry}
                    value={profileCity || ""}
                    onChange={(e) => setProfileCity(e.target.value)}
                    className={`w-full min-w-0 text-xs sm:text-sm border rounded-xl px-3 sm:px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                      !profileCountry
                        ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-50 border-gray-200 text-gray-700 cursor-pointer"
                    }`}
                  >
                    <option value="">{profileCountry ? "Select City" : "Select Country First"}</option>
                    {profileCityOptions.map((c, idx) => (
                      <option key={`${c}-${idx}`} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    disabled={!profileCountry}
                    placeholder={profileCountry ? "Enter City Name" : "Select Country First"}
                    value={profileCity || ""}
                    onChange={(e) => setProfileCity(e.target.value)}
                    className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                )}
              </div>
              <div className="space-y-1 md:col-span-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Website Link *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. example.edu or https://institution.edu"
                  value={profileWebsite || ""}
                  onChange={(e) => setProfileWebsite(e.target.value)}
                  className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <ImageUploaderField
                label="Organization Logo"
                value={profileLogo || ""}
                onChange={setProfileLogo}
                placeholder="https://example.com/logo.png"
                maxWidth={500}
                maxHeight={500}
                maxFileSizeKB={50}
                aspectHint="Square logo recommended (e.g. 300x300)"
                isLogo={true}
              />

              <div className="space-y-1 md:col-span-2 min-w-0">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">About Organization *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Brief summary of your organization..."
                  value={profileAbout || ""}
                  onChange={(e) => setProfileAbout(e.target.value)}
                  className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-[#37494E] hover:bg-[#2c3b3f] text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" /> Save Profile & Continue
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors text-center cursor-pointer"
                >
                  Log out & Return to Home
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      </div>
    );
  }

  // Handle Logout Trigger
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

      {/* 1. Dedicated Top Header Navbar */}
      <header className="h-14 sm:h-16 bg-[#37494E] text-white px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 shadow-md z-40 shrink-0 border-b border-[#2c3b3f] min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 sm:w-10 sm:h-10 p-0 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-slate-200 hover:text-white shrink-0"
            title="Toggle Sidebar Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-[72px] h-9 sm:w-[120px] sm:h-10 md:w-[140px] flex items-center justify-start shrink-0">
              <img
                src="/company-logo.png"
                alt="International Conference Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="hidden min-[420px]:block text-[10px] sm:text-sm md:text-base font-extrabold tracking-wide text-white leading-tight font-display whitespace-nowrap">
                Organizer Dashboard
              </h1>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User profile preview badge */}
          <div className="flex items-center gap-2 sm:pl-2 sm:border-l sm:border-white/10">
            {activeProfile?.logo ? (
          <img
            src={getCleanImageSrc(activeProfile.logo)}
            alt={activeProfile?.organizationName || "Profile"}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-white/30 object-contain bg-white shrink-0"
          />
        ) : (
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-white/30 bg-white/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        )}
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold leading-tight text-white">{activeProfile?.organizationName || authUser?.name || "Organizer"}</div>
              <div className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">Organizer</div>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-xl transition-all cursor-pointer border border-rose-500/30"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Dashboard Layout Container */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 top-14 sm:top-16 bg-slate-900/55 backdrop-blur-xs z-20 transition-opacity"
          />
        )}

        {/* Left Sidebar Navigation */}
        <aside
          className={`
            fixed lg:static top-14 sm:top-16 bottom-0 left-0 z-30 h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-4rem)] lg:h-full
            ${isSidebarOpen ? "w-[min(17rem,86vw)] sm:w-64 translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-16"}
            bg-[#37494E] text-slate-200 shrink-0 transition-all duration-300 shadow-xl border-r border-[#2c3b3f] flex flex-col justify-between overflow-hidden
          `}
        >
          <div className="p-3 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Navigation Items */}
            <nav className="space-y-1 text-xs font-medium">

              {/* 1. 🏠 Dashboard */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    requestOrganizerMenuChange("DASHBOARD_OVERVIEW");
                    setOpenGroups({ conference: false, profile: false });
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeMenu === "DASHBOARD_OVERVIEW"
                      ? "bg-white text-[#37494E] font-bold shadow-md"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
                  <span className={`${!isSidebarOpen && "lg:hidden"}`}>Dashboard</span>
                </button>
              </div>

              {/* 2. 🎤 Conference (Group) */}
              <div className="pt-2">
                <button
                  onClick={() => toggleGroup("conference")}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-bold"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-300 shrink-0" />
                    <span className={`${!isSidebarOpen && "lg:hidden"}`}>Conference</span>
                  </span>
                  {isSidebarOpen && (
                    openGroups.conference ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {isSidebarOpen && openGroups.conference && (
                  <div className="pl-8 pt-1 space-y-1 border-l border-white/10 ml-5 my-1">
                    <button
                      onClick={() => {
                        resetConferenceForm();
                        requestOrganizerMenuChange("ADD_CONFERENCE");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "ADD_CONFERENCE" ? "text-white font-bold bg-white/20 border-l-2 border-blue-400 pl-2" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-blue-300" />
                      <span>Add Conference</span>
                    </button>

                    <button
                      onClick={() => {
                        requestOrganizerMenuChange("BULK_ADD_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "BULK_ADD_CONFERENCES"
                          ? "text-white font-bold bg-white/20 border-l-2 border-cyan-400 pl-2"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5 text-cyan-300" />
                      <span>Bulk Add Conferences</span>
                    </button>

                    <button
                      onClick={() => {
                        requestOrganizerMenuChange("PENDING_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "PENDING_CONFERENCES" ? "text-white font-bold bg-white/20 border-l-2 border-amber-400 pl-2" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Pending Conferences</span>
                      </span>
                      {stats.pending > 0 && (
                        <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {stats.pending}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        requestOrganizerMenuChange("APPROVED_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "APPROVED_CONFERENCES" ? "text-white font-bold bg-white/20 border-l-2 border-emerald-400 pl-2" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Approved Conferences</span>
                      </span>
                      {stats.approved > 0 && (
                        <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {stats.approved}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        requestOrganizerMenuChange("REJECTED_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "REJECTED_CONFERENCES" ? "text-white font-bold bg-white/20 border-l-2 border-rose-400 pl-2" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                        <span>Rejected Conferences</span>
                      </span>
                      {stats.rejected > 0 && (
                        <span className="bg-rose-500/30 text-rose-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {stats.rejected}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        requestOrganizerMenuChange("COMPLETED_CONFERENCES");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                        activeMenu === "COMPLETED_CONFERENCES" ? "text-white font-bold bg-white/20 border-l-2 border-slate-400 pl-2" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>Completed Conferences</span>
                      </span>
                      {stats.completed > 0 && (
                        <span className="bg-slate-500/30 text-slate-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {stats.completed}
                        </span>
                      )}
                    </button>
                    <button
                        onClick={() => {
                          requestOrganizerMenuChange("MANAGE_CONFERENCES");
                          if (window.innerWidth < 1024) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer ${
                          activeMenu === "MANAGE_CONFERENCES"
                            ? "text-white font-bold bg-white/20 border-l-2 border-blue-400 pl-2"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-blue-300" />
                          <span>Draft Conferences</span>
                        </span>

                        {stats.draft > 0 && (
                          <span className="bg-blue-500/30 text-blue-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                            {stats.draft}
                          </span>
                        )}
                      </button>
                  </div>
                )}
              </div>

              {/* 3. 👤 Profile */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveMenu("MANAGE_PROFILE");
                    setOpenGroups({ conference: false, profile: false });
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeMenu === "MANAGE_PROFILE"
                      ? "bg-white text-[#37494E] font-bold shadow-md"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <User className="h-4.5 w-4.5 shrink-0" />
                  <span className={`${!isSidebarOpen && "lg:hidden"}`}>Profile</span>
                </button>
              </div>

            </nav>
          </div>

          {/* Sidebar Footer & Logout */}
          <div className="p-3 border-t border-white/10 mt-auto shrink-0 bg-[#37494E]">
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white rounded-xl transition-all text-xs font-bold border border-rose-500/30 cursor-pointer shadow-xs"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={`${!isSidebarOpen && "lg:hidden"}`}>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area beside Sidebar */}
        <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-y-auto overflow-x-hidden bg-slate-100 h-full">
          
          {/* Sticky Section Header */}
          <div className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shadow-2xs sticky top-0 z-20 shrink-0 min-w-0">
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-bold font-display text-[#37494E] leading-tight break-words">
                {activeMenu === "DASHBOARD_OVERVIEW" && "Dashboard"}
                {activeMenu === "ADD_CONFERENCE" && (editingConfId ? "Edit Conference Details" : "Add New Conference")}
                {activeMenu === "BULK_ADD_CONFERENCES" && "Bulk Add Conferences"}
                {activeMenu === "APPROVED_CONFERENCES" && "Approved Conferences"}
                {activeMenu === "REJECTED_CONFERENCES" && "Rejected Conferences"}
                {activeMenu === "COMPLETED_CONFERENCES" && "Completed Conferences"}
                {activeMenu === "MANAGE_CONFERENCES" && "Draft Conferences"}
                {activeMenu === "MANAGE_PROFILE" && "Profile"}
              </h2>
            </div>
          </div>

          {/* Pending Admin Activation Alert Banner */}
          {activeProfile && activeProfile.isSuspended && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 md:px-6 py-3 text-amber-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 shrink-0 min-w-0">
              <div className="flex items-start gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="min-w-0 break-words leading-relaxed">
                  <strong className="font-extrabold">Account Pending Activation:</strong> Your profile setup is complete and has been automatically sent to the Admin Portal. An administrator will activate your profile before your organizer account is publicly listed on the User Portal.
                </span>
              </div>
            </div>
          )}

          {/* Content Body Container */}
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-4 sm:space-y-5 md:space-y-6 min-w-0">

            {/* SECTION 1: DASHBOARD OVERVIEW */}
            {activeMenu === "DASHBOARD_OVERVIEW" && (
              <div className="space-y-6">
                
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-[#37494E] to-[#2c3b3f] rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black font-display tracking-tight text-white leading-tight break-words">
                      Welcome back, {activeProfile?.organizationName || authUser?.name || "Organizer"}!
                    </h2>
                    <p className="text-xs text-slate-300">
                      Manage your upcoming conferences, track reviews, and update your official organizer profile.
                    </p>
                  </div>
                </div>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div
                    onClick={() => setActiveMenu("APPROVED_CONFERENCES")}
                    className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-black text-[#37494E]">{stats.total}</span>
                      <div className="p-2.5 bg-slate-100 text-[#37494E] rounded-xl hover-icon-scale">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">Total Conferences</p>
                  </div>

                  <div
                    onClick={() => setActiveMenu("APPROVED_CONFERENCES")}
                    className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.approved}</span>
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover-icon-scale">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">Approved Conferences</p>
                  </div>

                  <div
                    onClick={() => setActiveMenu("PENDING_CONFERENCES")}
                    className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-black text-amber-600">{stats.pending}</span>
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover-icon-scale">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">Pending Review</p>
                  </div>

                  <div
                    onClick={() => setActiveMenu("REJECTED_CONFERENCES")}
                    className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-[#37494E] transition-all duration-300 hover-card-lift cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl sm:text-2xl font-black text-rose-600">{stats.rejected}</span>
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover-icon-scale">
                        <XCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">Rejected Conferences</p>
                  </div>
                </div>

                {/* Recent Conferences Table */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-xs min-w-0">
                  <div className="p-3 sm:p-4 sm:px-6 border-b border-slate-100 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-2 sm:gap-3">
                    <h3 className="font-bold text-[#37494E] text-xs sm:text-sm flex items-center gap-2 leading-tight">
                      <Calendar className="h-4 w-4 text-blue-600" /> Recent Conferences
                    </h3>
                    <button
                      onClick={() => setActiveMenu("APPROVED_CONFERENCES")}
                      className="text-[11px] sm:text-xs font-bold text-[#37494E] hover:underline cursor-pointer self-start min-[420px]:self-auto"
                    >
                      View Approved ({stats.approved})
                    </button>
                  </div>

                  {orgConferences.length === 0 ? (
                    <div className="text-center px-4 py-10 sm:py-12 min-w-0">
                      <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-bold text-sm">No conferences created yet</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words max-w-md mx-auto">Click "Add Conference" in the sidebar to publish your first event.</p>
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto overscroll-x-contain">
                      <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                            <th className="p-3.5 pl-6 rounded-l-lg">Conference Title</th>
                            <th className="p-3.5">Category</th>
                            <th className="p-3.5">Location</th>
                            <th className="p-3.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {orgConferences.slice(0, 5).map((conf, idx) => (
                            <tr key={conf.id ? `${conf.id}-${idx}` : `conf-dash-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 sm:p-3.5 pl-4 sm:pl-6">
                                <div className="flex items-center gap-3">
                                  {conf.bannerImage ? (
                                    <img src={conf.bannerImage} alt="" className="h-8 w-12 sm:h-9 sm:w-14 rounded-lg object-contain border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="h-8 w-12 sm:h-9 sm:w-14 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                      <ImageIcon className="h-4 w-4" />
                                    </div>
                                  )}
                                  <span className="font-bold text-slate-900 text-xs break-words">
                                    {conf.title}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-3.5">{conf.category}</td>
                              <td className="p-3 sm:p-3.5">{conf.city}, {conf.country}</td>
                              <td className="p-3 sm:p-3.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  conf.status === ConferenceStatus.Approved ? "bg-emerald-100 text-emerald-800" :
                                  conf.status === ConferenceStatus.PendingReview ? "bg-amber-100 text-amber-800" :
                                  conf.status === ConferenceStatus.Rejected ? "bg-rose-100 text-rose-800" :
                                  "bg-slate-200 text-slate-700"
                                }`}>
                                  {conf.status}
                                </span>
                              </td>
                             
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* SECTION 2: ADD / EDIT CONFERENCE FORM */}
            {activeMenu === "ADD_CONFERENCE" && (
             <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-start sm:items-center gap-2 leading-tight break-words">
                      <PlusCircle className="h-5 w-5 text-blue-600" />
                      {editingConfId ? "Edit Conference Details" : "Submit New Conference"}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-5 max-w-2xl">
                      Fill in the conference details below. Submitted conferences will be sent for administrator verification.
                    </p>
                  </div>
                  {editingConfId && (
                    <button
                      onClick={resetConferenceForm}
                      className="w-full sm:w-auto px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                <form onSubmit={(e) => handleConferenceFormSubmit(e, false)} className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Title */}
                    <div className="space-y-1 md:col-span-2 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Conference Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. International Conference on Artificial Intelligence & Robotics 2026"
                        value={formTitle || ""}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Topic *</label>
                      <select
                        value={formCategory || ""}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {activeCategories.map((cat, idx) => (
                          <option key={`${cat.id}-${idx}`} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conference Banner Image URL */}
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Conference Banner Image URL (Optional)
                      </label>

                      <input
                        type="url"
                        value={formBannerImage || ""}
                        onChange={(e) => setFormBannerImage(e.target.value)}
                        placeholder="https://example.com/conference-banner.jpg"
                        className="w-full min-w-0 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />

                      <p className="text-[11px] text-slate-500">
                        Paste a direct high-resolution image URL. Recommended size: 1200 × 500 px or larger.
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Start Date *
                      </label>

                      <input
                        type="date"
                        required
                        min={getTodayInTimeZone(
                          resolveConferenceTimeZone("", formCountry, formCity)
                        )}
                        value={formStartDate || ""}
                        onChange={(e) => {
                          const todayStr = getTodayInTimeZone(
                            resolveConferenceTimeZone("", formCountry, formCity)
                          );

                          if (e.target.value && e.target.value < todayStr) {
                            showToast("Past dates cannot be selected.");
                            setFormStartDate(todayStr);
                          } else {
                            setFormStartDate(e.target.value);
                          }
                        }}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        End Date *
                      </label>

                      <input
                        type="date"
                        required
                        min={
                          formStartDate ||
                          getTodayInTimeZone(
                            resolveConferenceTimeZone("", formCountry, formCity)
                          )
                        }
                        value={formEndDate || ""}
                        onChange={(e) => {
                          const todayStr = getTodayInTimeZone(
                            resolveConferenceTimeZone("", formCountry, formCity)
                          );

                          const minVal = formStartDate || todayStr;

                          if (e.target.value && e.target.value < minVal) {
                            showToast("End date cannot be in the past or prior to start date.");
                            setFormEndDate(minVal);
                          } else {
                            setFormEndDate(e.target.value);
                          }
                        }}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Country *</label>
                      <select
                        required
                        value={formCountry || ""}
                        onChange={(e) => {
                        const newCountry = e.target.value;
                        setFormCountry(newCountry);
                        setFormCity("");
                        setFormState("");
                      }}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Select Country</option>
                        {adminCountryOptions.map((c, idx) => (
                          <option key={`${c}-${idx}`} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">City *</label>
                      <select
                        required
                        disabled={!formCountry}
                        value={formCity || ""}
                        onChange={(e) => setFormCity(e.target.value)}
                        className={`w-full text-sm border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                          !formCountry
                            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 cursor-pointer"
                        }`}
                      >
                        <option value="">{formCountry ? "Select City" : "Select Country First"}</option>
                        {conferenceCityOptions.map((c, idx) => (
                          <option key={`${c}-${idx}`} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Venue Name / Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Tokyo Convention Hall, Chuo-ku"
                        value={formVenue || ""}
                        onChange={(e) => setFormVenue(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Attendance Type *</label>
                      <select
                        value={formAttendanceType || "Offline"}
                        onChange={(e) => setFormAttendanceType(e.target.value as any)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Offline">In-Person (Offline)</option>
                        <option value="Online">Virtual (Online)</option>
                        <option value="Hybrid">Hybrid (In-Person & Online)</option>
                      </select>
                    </div>

                    {/* External Links & Contact */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Conference Website Link *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. icair2026.org or https://icair2026.org"
                        value={formConfWebsite || ""}
                        onChange={(e) => setFormConfWebsite(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Contact Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. contact@icair2026.org"
                        value={formContactEmail || ""}
                        onChange={(e) => setFormContactEmail(e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1 md:col-span-2 min-w-0">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Conference Overview & Call for Papers *</label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Provide detailed information regarding topics, keynote speakers, paper submission deadlines..."
                        value={formDescription || ""}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full min-w-0 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y min-h-[130px]"
                      />
                    </div>

                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                    {!editingConfId && (

                      <button
                        type="button"
                        onClick={(e) => handleConferenceFormSubmit(e, true)}
                        disabled={isSubmittingForm}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Save as Draft
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingForm}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-[#37494E] hover:bg-[#2c3b3f] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                      <span>{editingConfId ? "Update & Resubmit" : "Submit Conference"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeMenu === "BULK_ADD_CONFERENCES" && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Bulk Add Conferences
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Upload up to 1,000 conferences using one Excel (.xlsx) file.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBulkConferenceTemplate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#37494E] hover:bg-[#2b3a3e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Download Excel Template
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                    <Upload className="h-4 w-4" />
                    Maximum 1,000 Conferences
                  </div>
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 1
                  </div>
                  <div className="mt-1 font-bold text-slate-800">
                    Upload Excel
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 2
                  </div>
                  <div className="mt-1 font-bold text-slate-800">
                    Validate & Review
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 3
                  </div>
                  <div className="mt-1 font-bold text-slate-800">
                    Reach 100%
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 4
                  </div>
                  <div className="mt-1 font-bold text-slate-800">
                    Submit All
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 sm:p-8">
  {bulkImportedRows.length === 0 ? (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
        <Upload className="h-7 w-7 text-slate-500" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-800">
        Upload Excel File
      </h3>

      <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
        Upload the completed InternationalConference bulk template.
        Only .xlsx files are accepted, with a maximum of 1,000 conference rows.
      </p>

      <input
        ref={bulkFileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleBulkConferenceFileUpload}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => bulkFileInputRef.current?.click()}
        disabled={isBulkReadingFile}
        className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#37494E] hover:bg-[#2b3a3e] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all cursor-pointer"
      >
        {isBulkReadingFile ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Reading Excel...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload .xlsx File
          </>
        )}
      </button>

      {bulkImportError && (
        <div className="mt-4 max-w-xl mx-auto bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 text-left">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{bulkImportError}</span>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
            Uploaded File
          </div>

          <div className="mt-1 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />

            <span className="font-bold text-slate-800 break-all">
              {bulkUploadedFileName}
            </span>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            {bulkImportedRows.length} conference
            {bulkImportedRows.length === 1 ? "" : "s"} imported temporarily.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDeleteBulkUpload}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Delete Upload
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
      Total
    </div>
    <div className="mt-1 text-2xl font-bold text-slate-900">
      {bulkValidationSummary.total}
    </div>
  </div>

  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
    <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
      Complete
    </div>
    <div className="mt-1 text-2xl font-bold text-emerald-700">
      {bulkValidationSummary.complete}
    </div>
  </div>

  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
    <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
      Need Fix
    </div>
    <div className="mt-1 text-2xl font-bold text-amber-700">
      {bulkValidationSummary.needFix}
    </div>
  </div>

  <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
  <div className="text-xs font-bold uppercase tracking-wider text-rose-600">
    Duplicates
  </div>

  <div className="mt-1 text-2xl font-bold text-rose-700">
    {bulkValidationSummary.duplicates}
  </div>
</div>

  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
    <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
      Completion
    </div>
    <div className="mt-1 text-2xl font-bold text-blue-700">
      {bulkValidationSummary.completionPercentage}%
    </div>
  </div>
</div>

<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
  <div className="relative w-full lg:max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

    <input
      type="text"
      value={bulkSearchQuery}
      onChange={(e) =>
        setBulkSearchQuery(e.target.value)
      }
      placeholder="Search title, topic, country, city or email..."
      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    />
  </div>

  <div className="flex flex-wrap gap-2">
    {[
      ["ALL", "All"],
      ["COMPLETE", "Complete"],
      ["NEED_FIX", "Need Fix"],
      ["DUPLICATES", "Duplicates"],
    ].map(([value, label]) => (
      <button
        key={value}
        type="button"
        onClick={() =>
          setBulkStatusFilter(
            value as
              | "ALL"
              | "COMPLETE"
              | "NEED_FIX"
              | "DUPLICATES"
          )
        }
        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          bulkStatusFilter === value
            ? "bg-slate-800 text-white"
            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
</div>

<div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
  <div className="flex flex-col xl:flex-row xl:items-end gap-3">
    <div className="flex-1">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        Bulk Fix Field
      </label>

      <select
        value={bulkFixField}
        onChange={(e) => {
          setBulkFixField(
            e.target.value as
              | "topic"
              | "country"
              | "city"
          );
          setBulkFixValue("");
        }}
        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="topic">Topic</option>
        <option value="country">Country</option>
        <option value="city">City</option>
      </select>
    </div>

    <div className="flex-[2]">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        New Value
      </label>

      {bulkFixField === "topic" && (
        <select
          value={bulkFixValue}
          onChange={(e) =>
            setBulkFixValue(e.target.value)
          }
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Select Topic</option>
          {activeCategories.map((category) => (
            <option
              key={category.id}
              value={category.name}
            >
              {category.name}
            </option>
          ))}
        </select>
      )}

      {bulkFixField === "country" && (
        <select
          value={bulkFixValue}
          onChange={(e) =>
            setBulkFixValue(e.target.value)
          }
          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Select Country</option>
          {adminCountryOptions.map((country) => (
            <option
              key={country}
              value={country}
            >
              {country}
            </option>
          ))}
        </select>
      )}

      {bulkFixField === "city" && (
      <select
        value={bulkFixValue}
        onChange={(e) =>
          setBulkFixValue(e.target.value)
        }
        disabled={bulkSelectedRows.length === 0}
        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        <option value="">
          {bulkSelectedRows.length === 0
            ? "Select a row first"
            : "Select City"}
        </option>

        {(() => {
          const selectedRow = bulkImportedRows.find(
            (row) =>
              row.rowNumber === bulkSelectedRows[0]
          );

          if (!selectedRow?.country) {
            return null;
          }

          const selectedCountry =
            selectedRow.country
              .trim()
              .toUpperCase();

          return (citiesList || [])
            .filter((city) => {
              const cityCountry =
                city.country
                  .trim()
                  .toUpperCase();

              const cityName =
                city.name
                  .trim()
                  .toUpperCase();

              const inactiveKey =
                `${selectedCountry}:::${cityName}`;

              const isInactive =
                (inactiveCities || []).some(
                  (inactiveCity) =>
                    inactiveCity
                      .trim()
                      .toUpperCase() === inactiveKey
                );

              return (
                cityCountry === selectedCountry &&
                !isInactive
              );
            })
            .map((city) => (
              <option
                key={`${city.country}-${city.name}`}
                value={city.name}
              >
                {city.name}
              </option>
            ));
        })()}
      </select>
    )}
    </div>

    <div className="flex flex-col sm:flex-row gap-2">
      <button
        type="button"
        disabled={
          bulkSelectedRows.length === 0 ||
          !bulkFixValue
        }
        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        Apply to Selected ({bulkSelectedRows.length})
      </button>

      <button
        type="button"
        onClick={() =>
          applyBulkFix("MATCHING")
        }
        disabled={
          bulkSelectedRows.length === 0 ||
          !bulkFixValue
        }
        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        Apply to All Matching Rows
      </button>
    </div>
  </div>
</div>
<div className="bg-white border border-slate-200 rounded-xl p-4">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <div className="text-sm font-bold text-slate-800">
        Bulk Submission
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {isBulkReadyToSubmit
          ? "All remaining conferences are 100% valid and ready for submission."
          : `Complete ${bulkValidationSummary.complete} of ${bulkValidationSummary.total} conferences before submission.`}
      </div>
    </div>

    <button
      type="button"
      onClick={handleBulkSubmitClick}
      disabled={
        !isBulkReadyToSubmit ||
        isBulkSubmitting
      }
      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
    >
      {isBulkSubmitting ? (
  <>
    <RefreshCw className="h-4 w-4 animate-spin" />
    Submitting...
      </>
    ) : (
      <>
        <CheckCircle2 className="h-4 w-4" />
        Submit All Conferences
      </>
    )}
    </button>
  </div>
  {bulkSubmitProgress.total > 0 && (
  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Processed
        </div>
        <div className="mt-1 text-lg font-bold text-slate-800">
          {bulkSubmitProgress.processed} / {bulkSubmitProgress.total}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          Successful
        </div>
        <div className="mt-1 text-lg font-bold text-emerald-700">
          {bulkSubmitProgress.success}
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
          Failed
        </div>
        <div className="mt-1 text-lg font-bold text-rose-700">
          {bulkSubmitProgress.failed}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
          Progress
        </div>

        <div className="mt-1 text-lg font-bold text-blue-700">
          {bulkSubmitProgress.total === 0
            ? 0
            : Math.round(
                (bulkSubmitProgress.processed /
                  bulkSubmitProgress.total) *
                  100
              )}
          %
        </div>
      </div>
    </div>

    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 transition-all duration-300"
        style={{
          width: `${
            bulkSubmitProgress.total === 0
              ? 0
              : Math.round(
                  (bulkSubmitProgress.processed /
                    bulkSubmitProgress.total) *
                    100
                )
          }%`,
        }}
      />
    </div>
  </div>
)}
{bulkSubmitFailures.length > 0 && (
  <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-rose-600" />

      <div className="text-sm font-bold text-rose-700">
        Failed Conference Rows
      </div>
    </div>

    <div className="mt-3 space-y-2 max-h-[240px] overflow-y-auto">
      {bulkSubmitFailures.map((failure) => (
        <div
          key={`${failure.rowNumber}-${failure.title}`}
          className="bg-white border border-rose-200 rounded-lg px-3 py-2 text-xs"
        >
          <div className="font-bold text-slate-800">
            Excel Row {failure.rowNumber}:{" "}
            {failure.title || "Untitled Conference"}
          </div>

          <div className="mt-1 text-rose-600">
            {failure.error}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
</div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="min-w-[2800px] w-full text-sm table-auto">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
              <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
              <input
                type="checkbox"
                checked={
                  filteredBulkRows.length > 0 &&
                  filteredBulkRows.every((row) =>
                    bulkSelectedRows.includes(row.rowNumber)
                  )
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    const visibleRowNumbers = filteredBulkRows.map(
                      (row) => row.rowNumber
                    );

                    setBulkSelectedRows((current) =>
                      Array.from(
                        new Set([
                          ...current,
                          ...visibleRowNumbers,
                        ])
                      )
                    );
                  } else {
                    const visibleSet = new Set(
                      filteredBulkRows.map(
                        (row) => row.rowNumber
                      )
                    );

                    setBulkSelectedRows((current) =>
                      current.filter(
                        (rowNumber) =>
                          !visibleSet.has(rowNumber)
                      )
                    );
                  }
                }}
                className="h-4 w-4 cursor-pointer"
              />
            </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 min-w-[90px] whitespace-nowrap">
                  Excel Row
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 min-w-[260px]">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Conference Title
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Banner Image URL
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Topic
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Start Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  End Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Country
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  City
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Venue
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Attendance
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Website
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Contact Email
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500">
                  Overview / Call for Papers
                </th>

                <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 min-w-[100px] whitespace-nowrap">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBulkRows.map((row) => (
                <tr
                  key={row.rowNumber}
                  className="hover:bg-slate-50"
                >
                <td className="px-3 py-3">
  <input
    type="checkbox"
    checked={bulkSelectedRows.includes(
      row.rowNumber
    )}
    onChange={(e) => {
      if (e.target.checked) {
        setBulkSelectedRows((current) =>
          Array.from(
            new Set([
              ...current,
              row.rowNumber,
            ])
          )
        );
      } else {
        setBulkSelectedRows((current) =>
          current.filter(
            (rowNumber) =>
              rowNumber !== row.rowNumber
          )
        );
      }
    }}
    className="h-4 w-4 cursor-pointer"
  />
</td>
                  <td className="px-3 py-3 text-slate-500 font-semibold">
                    {row.rowNumber}
                  </td>
                  <td className="px-3 py-3">
                    {row.isDuplicate ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          <XCircle className="h-3.5 w-3.5" />
                          Duplicate
                        </span>

                        {row.errors.length > 0 && (
                          <div className="mt-2 min-w-[240px] max-w-[320px] rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] leading-4 text-red-700 whitespace-normal break-words">
                            {row.errors.join(" • ")}
                          </div>
                        )}
                      </div>
                    ) : row.isValid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Need Fix
                        </span>

                        {row.errors.length > 0 && (
                          <div className="mt-2 min-w-[240px] max-w-[320px] rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] leading-4 text-red-700 whitespace-normal break-words">
                            {row.errors.join(" • ")}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                  <input
                    type="text"
                    value={row.conferenceTitle}
                    onChange={(e) =>
                      updateBulkConferenceRow(
                        row.rowNumber,
                        "conferenceTitle",
                        e.target.value
                      )
                    }
                    className="w-full min-w-[260px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-3">
                <input
                  type="url"
                  value={row.bannerImageUrl}
                  onChange={(e) =>
                    updateBulkConferenceRow(
                      row.rowNumber,
                      "bannerImageUrl",
                      e.target.value
                    )
                  }
                  placeholder="https://example.com/banner.jpg"
                  className="w-full min-w-[300px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.topic}
                      onChange={(e) =>
                        updateBulkConferenceRow(
                          row.rowNumber,
                          "topic",
                          e.target.value
                        )
                      }
                      className="w-full min-w-[220px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Select Topic</option>

                      {activeCategories.map((category) => (
                        <option
                          key={category.id}
                          value={category.name}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="date"
                      min={new Date().toLocaleDateString("en-CA")}
                      value={row.startDate}
                      onChange={(e) => {
                        const today =
                          new Date().toLocaleDateString("en-CA");

                        const newStartDate = e.target.value;

                        if (
                          newStartDate &&
                          newStartDate < today
                        ) {
                          showToast(
                            "Start Date cannot be before today."
                          );
                          return;
                        }

                        setBulkImportedRows((currentRows) => {
                          const updatedRows = currentRows.map(
                            (currentRow) => {
                              if (
                                currentRow.rowNumber !==
                                row.rowNumber
                              ) {
                                return currentRow;
                              }

                              return {
                                ...currentRow,
                                startDate: newStartDate,

                                endDate:
                                  currentRow.endDate &&
                                  currentRow.endDate < newStartDate
                                    ? newStartDate
                                    : currentRow.endDate,
                              };
                            }
                          );

                          return validateBulkConferenceRows(
                            updatedRows
                          );
                        });
                      }}
                      className="w-full min-w-[150px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="date"
                      min={
                        row.startDate ||
                        new Date().toLocaleDateString("en-CA")
                      }
                      value={row.endDate}
                      onChange={(e) => {
                        const today =
                          new Date().toLocaleDateString("en-CA");

                        const minimumDate =
                          row.startDate || today;

                        if (
                          e.target.value &&
                          e.target.value < minimumDate
                        ) {
                          showToast(
                            "End Date cannot be before Start Date."
                          );
                          return;
                        }

                        updateBulkConferenceRow(
                          row.rowNumber,
                          "endDate",
                          e.target.value
                        );
                      }}
                      className="w-full min-w-[150px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                  <select
                    value={row.country}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      void loadBulkCitiesForCountry(
                        newCountry
                      );

                      setBulkImportedRows((currentRows) => {
                        const updatedRows = currentRows.map((currentRow) => {
                          if (currentRow.rowNumber !== row.rowNumber) {
                            return currentRow;
                          }

                          return {
                            ...currentRow,
                            country: newCountry,
                            city: "",
                          };
                        });

                        return validateBulkConferenceRows(updatedRows);
                      });
                    }}
                    className="w-full min-w-[180px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Country</option>

                    {adminCountryOptions.map((country) => (
                      <option
                        key={country}
                        value={country}
                      >
                        {country}
                      </option>
                    ))}
                  </select>
                </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.city}
                      onChange={(e) =>
                        updateBulkConferenceRow(
                          row.rowNumber,
                          "city",
                          e.target.value
                        )
                      }
                      disabled={!row.country}
                      className="w-full min-w-[180px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {row.country
                          ? "Select City"
                          : "Select Country First"}
                      </option>

                      {(
                        bulkCountryCities[
                          row.country.trim().toUpperCase()
                        ] || []
                      )
                        .filter((city) => {
                          const normalizedCountry =
                            row.country.trim().toUpperCase();

                          const cityName =
                            city.name.trim().toUpperCase();

                          const inactiveKey =
                            `${normalizedCountry}:::${cityName}`;

                          const isInactive =
                            (inactiveCities || []).some(
                              (inactiveCity) =>
                                inactiveCity
                                  .trim()
                                  .toUpperCase() === inactiveKey
                            );

                          return !isInactive;
                        })
                        .map((city) => (
                          <option
                            key={`${city.country}-${city.name}`}
                            value={city.name}
                          >
                            {city.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={row.venue}
                      onChange={(e) =>
                        updateBulkConferenceRow(
                          row.rowNumber,
                          "venue",
                          e.target.value
                        )
                      }
                      placeholder="Venue / Address"
                      className="w-full min-w-[260px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                  <select
                    value={row.attendanceType}
                    onChange={(e) =>
                      updateBulkConferenceRow(
                        row.rowNumber,
                        "attendanceType",
                        e.target.value
                      )
                    }
                    className="w-full min-w-[180px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Attendance</option>
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </td>
                  <td className="px-3 py-3">
                    <input
                      type="url"
                      value={row.officialWebsite}
                      onChange={(e) =>
                        updateBulkConferenceRow(
                          row.rowNumber,
                          "officialWebsite",
                          e.target.value
                        )
                      }
                      placeholder="https://example.com"
                      className="w-full min-w-[280px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-3">
                  <input
                    type="email"
                    value={row.contactEmail}
                    onChange={(e) =>
                      updateBulkConferenceRow(
                        row.rowNumber,
                        "contactEmail",
                        e.target.value
                      )
                    }
                    placeholder="contact@example.com"
                    className="w-full min-w-[240px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-3">
                      <textarea
                        value={row.overview}
                        onChange={(e) =>
                          updateBulkConferenceRow(
                            row.rowNumber,
                            "overview",
                            e.target.value
                          )
                        }
                        rows={3}
                        placeholder="Conference overview and call for papers"
                        className="w-full min-w-[360px] text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          deleteBulkConferenceRow(row.rowNumber)
                        }
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer"
                        title="Delete this imported row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
</div>
            </div>
          )}

            {/* SECTION 2.5: PENDING CONFERENCES */}
            {activeMenu === "PENDING_CONFERENCES" && (() => {
              const pendingConfs = sortConferencesNewestFirst(
                orgConferences.filter((c) => isPendingStatus(c.status))
              );
              const totalPages = Math.max(1, Math.ceil(pendingConfs.length / ORG_ITEMS_PER_PAGE));
              const paginated = pendingConfs.slice((pendingPage - 1) * ORG_ITEMS_PER_PAGE, pendingPage * ORG_ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                      <span>Conferences in this view are submitted and currently undergoing review by administrators before publication.</span>
                    </div>
                    <span className="font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full text-[10px]">
                      {stats.pending} Pending Review
                    </span>
                  </div>

                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs min-w-0">
                    {pendingConfs.length === 0 ? (
                      <div className="px-4 py-10 sm:p-12 text-center min-w-0">
                        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-sm">No conferences pending review!</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words max-w-md mx-auto">All your submitted conferences have been processed by administrators.</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-full overflow-x-auto overscroll-x-contain">
                          <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-4 pl-6">Conference Title</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Submission Status</th>
                                <th className="p-4 pr-6 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {paginated.map((conf, idx) => (
                                <tr key={conf.id ? `${conf.id}-${idx}` : `conf-pend-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                      {conf.bannerImage ? (
                                        <img src={conf.bannerImage} alt="" className="h-10 w-16 rounded-lg object-contain border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className="h-10 w-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                          <ImageIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-bold text-slate-900 text-xs break-words">
                                          {conf.title}
                                        </span>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{conf.startDate}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">{conf.category}</td>
                                  <td className="p-4">{conf.city}, {conf.country}</td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> Pending Admin Review
                                    </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <button
                                      onClick={() => startEditConference(conf)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto text-xs font-semibold"
                                      title="Edit Conference"
                                    >
                                      <Edit2 className="h-4 w-4" /> Edit Details
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50 min-w-0">
                          <div>
                            Showing {pendingConfs.length === 0 ? 0 : (pendingPage - 1) * ORG_ITEMS_PER_PAGE + 1} to {Math.min(pendingPage * ORG_ITEMS_PER_PAGE, pendingConfs.length)} of {pendingConfs.length} conferences
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                                disabled={pendingPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-bold text-slate-800">
                                Page {pendingPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setPendingPage((p) => Math.min(totalPages, p + 1))}
                                disabled={pendingPage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION 3: APPROVED CONFERENCES */}
            {activeMenu === "APPROVED_CONFERENCES" && (() => {
              const approvedConfs = sortConferencesNewestFirst(
                  orgConferences.filter(
                    (c) =>
                      c.status === ConferenceStatus.Approved &&
                      !isConferenceCompleted(c)
                  )
                );
              const totalPages = Math.max(1, Math.ceil(approvedConfs.length / ORG_ITEMS_PER_PAGE));
              const paginated = approvedConfs.slice((approvedPage - 1) * ORG_ITEMS_PER_PAGE, approvedPage * ORG_ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span>Conferences in this view have been verified and published live to visitors.</span>
                    </div>
                    <span className="font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full text-[10px]">
                      {stats.approved} Approved
                    </span>
                  </div>

                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs min-w-0">
                    {approvedConfs.length === 0 ? (
                      <div className="text-center px-4 py-10 sm:py-16 min-w-0">
                        <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-sm">No approved conferences found</p>
                       <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words max-w-md mx-auto">When your submitted conferences are approved by admin, they will appear here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-full overflow-x-auto overscroll-x-contain">
                          <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3.5 pl-6 rounded-l-lg">Conference</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5">Location</th>
                                <th className="p-3.5 pr-6 text-right rounded-r-lg">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {paginated.map((conf, idx) => (
                                <tr key={conf.id ? `${conf.id}-${idx}` : `conf-appr-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                      {conf.bannerImage ? (
                                        <img src={conf.bannerImage} alt="" className="h-10 w-16 rounded-lg object-contain border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className="h-10 w-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                          <ImageIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div>
                                        <a
                                          href={`/conference/${getConferenceSlug(conf, conferences)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-xs flex items-center gap-1 cursor-pointer group"
                                          title="View live conference page"
                                        >
                                          <span>{conf.title}</span>
                                          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                        </a>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{conf.startDate}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">{conf.category}</td>
                                  <td className="p-4">{conf.city}, {conf.country}</td>
                                  <td className="p-4 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={async () => {
                                          const result = await onToggleConferenceActive?.(conf.id);
                                          if (!result) return;
                                          showToast(result.success
                                            ? `Conference ${result.isActive ? "activated" : "deactivated"} successfully.`
                                            : (result.error || "Could not update conference status."));
                                        }}
                                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors ${
                                          conf.isDeactivated
                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                        }`}
                                        title={conf.isDeactivated ? "Activate Conference" : "Deactivate Conference"}
                                      >
                                        {conf.isDeactivated ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                        {conf.isDeactivated ? "Activate" : "Deactivate"}
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (
                                              confirm(
                                                `Are you sure you want to permanently delete "${conf.title}"?`
                                              )
                                            ) {
                                              const result = await onDeleteConference?.(conf.id);

                                              if (result?.success) {
                                                showToast(
                                                  result.warning ||
                                                    `Conference "${conf.title}" deleted successfully.`
                                                );
                                              } else {
                                                showToast(
                                                  result?.error ||
                                                    `Unable to delete conference "${conf.title}".`
                                                );
                                              }
                                            } else {
                                              showToast("Delete action cancelled.");
                                            }
                                            }}
                                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50 min-w-0">
                          <div>
                            Showing {approvedConfs.length === 0 ? 0 : (approvedPage - 1) * ORG_ITEMS_PER_PAGE + 1} to {Math.min(approvedPage * ORG_ITEMS_PER_PAGE, approvedConfs.length)} of {approvedConfs.length} conferences
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setApprovedPage((p) => Math.max(1, p - 1))}
                                disabled={approvedPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-bold text-slate-800">
                                Page {approvedPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setApprovedPage((p) => Math.min(totalPages, p + 1))}
                                disabled={approvedPage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION 4: REJECTED CONFERENCES */}
            {activeMenu === "REJECTED_CONFERENCES" && (() => {
              const rejectedConfs = sortConferencesNewestFirst(
                orgConferences.filter(
                  (c) => c.status === ConferenceStatus.Rejected
                )
              );
              const totalPages = Math.max(1, Math.ceil(rejectedConfs.length / ORG_ITEMS_PER_PAGE));
              const paginated = rejectedConfs.slice((rejectedPage - 1) * ORG_ITEMS_PER_PAGE, rejectedPage * ORG_ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  <div className="bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 min-w-0">
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <span>Conferences in this view require revision based on administrator feedback before they can be re-submitted.</span>
                    </div>
                    <span className="font-bold bg-rose-200 text-rose-900 px-2.5 py-1 rounded-full text-[10px]">
                      {stats.rejected} Rejected
                    </span>
                  </div>

                  <div className="space-y-4">
                    {rejectedConfs.length === 0 ? (
                      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-6 sm:p-8 md:p-12 text-center min-w-0">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-sm">No rejected conferences!</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words max-w-md mx-auto">All your submitted conferences are either under review or approved.</p>
                      </div>
                    ) : (
                      <>
                        {paginated.map((conf, idx) => (
                          <div key={conf.id ? `${conf.id}-${idx}` : `conf-rej-${idx}`} className="bg-white rounded-xl sm:rounded-2xl border border-rose-200 p-3 sm:p-4 md:p-5 shadow-2xs space-y-3 sm:space-y-4 min-w-0">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                                {conf.bannerImage ? (
                                  <img src={conf.bannerImage} alt="" className="h-12 w-20 rounded-xl object-contain border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="h-12 w-20 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                    <ImageIcon className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-slate-900 text-sm">{conf.title}</h4>
                                  <p className="text-xs text-slate-500">{conf.category} • {conf.city}, {conf.country}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => startEditConference(conf)}
                                className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
                                <Edit2 className="h-3.5 w-3.5" /> Edit & Resubmit
                              </button>
                            </div>

                            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 sm:p-3.5 text-xs text-rose-900 space-y-1.5 min-w-0">
                              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                <AlertCircle className="h-4 w-4" /> Admin Review Feedback:
                              </div>
                              <p className="text-slate-700 sm:pl-5 leading-5 break-words">
                                Your submission was not approved. Please review the conference details before re-submitting.
                              </p>
                            </div>
                          </div>
                        ))}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200 text-xs text-slate-600 min-w-0">
                          <div>
                            Showing {rejectedConfs.length === 0 ? 0 : (rejectedPage - 1) * ORG_ITEMS_PER_PAGE + 1} to {Math.min(rejectedPage * ORG_ITEMS_PER_PAGE, rejectedConfs.length)} of {rejectedConfs.length} conferences
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setRejectedPage((p) => Math.max(1, p - 1))}
                                disabled={rejectedPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-bold text-slate-800">
                                Page {rejectedPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setRejectedPage((p) => Math.min(totalPages, p + 1))}
                                disabled={rejectedPage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION 4.5: COMPLETED CONFERENCES */}
            {activeMenu === "COMPLETED_CONFERENCES" && (() => {
              const completedConfs = sortConferencesNewestFirst(
                orgConferences.filter((c) => isConferenceCompleted(c))
              );
              const totalPages = Math.max(1, Math.ceil(completedConfs.length / ORG_ITEMS_PER_PAGE));
              const paginated = completedConfs.slice((completedPage - 1) * ORG_ITEMS_PER_PAGE, completedPage * ORG_ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  <div className="bg-slate-100 border border-slate-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-slate-600 shrink-0" />
                      <span>View all completed conferences. Completed conferences cannot be edited. Select single or multiple items to delete them.</span>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col min-[420px]:flex-row items-stretch min-[420px]:items-center gap-2 self-stretch sm:self-auto shrink-0">
                      {selectedCompletedIds.length > 0 && (
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to permanently delete ${selectedCompletedIds.length} completed conference(s)?`)) {
                              let successCount = 0;
                              let failureCount = 0;

                              for (const id of selectedCompletedIds) {
                                const result = await onDeleteConference?.(id);

                                if (result?.success) {
                                  successCount++;
                                } else {
                                  failureCount++;
                                }
                              }

                              if (failureCount === 0) {
                                showToast(
                                  `${successCount} completed conference(s) deleted successfully.`
                                );
                              } else {
                                showToast(
                                  `${successCount} deleted, ${failureCount} failed.`
                                );
                              }

                              setSelectedCompletedIds([]);
                            } else {
                              showToast("Delete action cancelled.");
                            }
                          }}
                          className="w-full min-[420px]:w-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Selected ({selectedCompletedIds.length})
                        </button>
                      )}
                      {completedConfs.length > 0 && (
                        <button
                          onClick={async () => {
  if (
    confirm(
      `Are you sure you want to permanently delete all ${completedConfs.length} completed conference(s)?`
    )
  ) {
    const allIds = completedConfs.map((c) => c.id);

    let successCount = 0;
    let failureCount = 0;

    for (const id of allIds) {
      const result = await onDeleteConference?.(id);

      if (result?.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    if (failureCount === 0) {
      showToast(
        `All ${successCount} completed conference(s) deleted successfully.`
      );
    } else {
      showToast(
        `${successCount} deleted, ${failureCount} failed.`
      );
    }

    setSelectedCompletedIds([]);
  } else {
    showToast("Delete action cancelled.");
  }
}}
                          className="w-full min-[420px]:w-auto px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-rose-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs min-w-0">
                    {completedConfs.length === 0 ? (
                      <div className="text-center px-4 py-10 sm:py-16 min-w-0">
                        <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-sm">No completed conferences found</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words max-w-md mx-auto">When your active conferences pass their scheduled end date, they will automatically move here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-full overflow-x-auto overscroll-x-contain">
                          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3.5 pl-4 w-8 rounded-l-lg">
                                  <input
                                    type="checkbox"
                                    onChange={() => {
                                      const allCompIds = completedConfs.map((c) => c.id);
                                      if (selectedCompletedIds.length === allCompIds.length) {
                                        setSelectedCompletedIds([]);
                                      } else {
                                        setSelectedCompletedIds(allCompIds);
                                      }
                                    }}
                                    checked={completedConfs.length > 0 && selectedCompletedIds.length === completedConfs.length}
                                    className="cursor-pointer"
                                  />
                                </th>
                                <th className="p-3.5 pl-2">Conference</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5">Location & Date</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 pr-6 text-right rounded-r-lg">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {paginated.map((conf, idx) => (
                                <tr key={conf.id ? `${conf.id}-${idx}` : `conf-comp-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-4 pl-4">
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
                                  <td className="p-4 pl-2">
                                    <div className="flex items-center gap-3">
                                      {conf.bannerImage ? (
                                        <img src={conf.bannerImage} alt="" className="h-10 w-16 rounded-lg object-contain border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className="h-10 w-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                          <ImageIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-bold text-slate-900 text-xs break-words">
                                          {conf.title}
                                        </span>
                                        <div className="text-[11px] text-slate-400 mt-0.5">{conf.startDate}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">{conf.category}</td>
                                  <td className="p-4">{conf.city}, {conf.country}</td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                                      Completed
                                    </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setViewingCompletedConference(conf)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                                      title="View completed conference details"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> View
                                    </button>
                                    <button
                                      onClick={async () => {
                                       if (
                                          confirm(
                                            `Are you sure you want to permanently delete completed conference "${conf.title}"?`
                                          )
                                        ) {
                                          const result = await onDeleteConference?.(conf.id);

                                          if (result?.success) {
                                            showToast(
                                              result.warning ||
                                                `Conference "${conf.title}" deleted successfully.`
                                            );
                                          } else {
                                            showToast(
                                              result?.error ||
                                                `Unable to delete conference "${conf.title}".`
                                            );
                                          }
                                        } else {
                                                showToast("Delete action cancelled.");
                                              }
                                              }}
                                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors"
                                      title="Delete completed conference"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50 min-w-0">
                          <div>
                            Showing {completedConfs.length === 0 ? 0 : (completedPage - 1) * ORG_ITEMS_PER_PAGE + 1} to {Math.min(completedPage * ORG_ITEMS_PER_PAGE, completedConfs.length)} of {completedConfs.length} conferences
                          </div>
                          {totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                                disabled={completedPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-bold text-slate-800">
                                Page {completedPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setCompletedPage((p) => Math.min(totalPages, p + 1))}
                                disabled={completedPage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION 5: ALL CONFERENCES & DRAFTS */}                                                    
            {activeMenu === "MANAGE_CONFERENCES" && (() => {
              const filteredConfs = sortConferencesNewestFirst(
              orgConferences.filter((c) => {
              const isDraft =
                c.status === ConferenceStatus.Draft ||
                String(c.status || "").trim().toLowerCase() === "draft";

              const matchesSearch =
                !searchQuery ||
                String(c.title || "")
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());

            return isDraft && matchesSearch;
              })
            );
              const totalPages = Math.max(1, Math.ceil(filteredConfs.length / ORG_ITEMS_PER_PAGE));
              const paginated = filteredConfs.slice((managePage - 1) * ORG_ITEMS_PER_PAGE, managePage * ORG_ITEMS_PER_PAGE);

              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs min-w-0">
                    <div className="p-3 sm:p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm">Draft Conferences ({filteredConfs.length})</h3>
                      <div className="w-full sm:w-auto flex items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-44 text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 sm:py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {filteredConfs.length === 0 ? (
                      <div className="text-center px-4 py-10 sm:py-16 min-w-0">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold text-sm">No draft conferences found</p>
                        <button
                          onClick={() => {
                            resetConferenceForm();
                            setActiveMenu("ADD_CONFERENCE");
                          }}
                          className="mt-3 px-4 py-2 bg-[#37494E] text-white text-xs font-bold rounded-xl hover:bg-[#2c3b3f] transition-all cursor-pointer"
                        >
                          Add Conference
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-full overflow-x-auto overscroll-x-contain"> 
                          <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#37494E] text-white font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3 sm:p-3.5 pl-4 sm:pl-6 rounded-l-lg">Conference Title</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-white">Dates</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 pr-6 text-right rounded-r-lg">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                              {paginated.map((conf, idx) => (
                                <tr key={conf.id ? `${conf.id}-${idx}` : `conf-all-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                      {conf.bannerImage ? (
                                        <img src={conf.bannerImage} alt="" className="h-10 w-16 rounded-lg object-contain border border-slate-200 shrink-0" />
                                      ) : (
                                        <div className="h-10 w-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 text-slate-400">
                                          <ImageIcon className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs">{conf.title}</div>
                                        <div className="text-[11px] text-slate-400">{conf.city}, {conf.country}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4">{conf.category}</td>
                                  <td className="p-4">{conf.startDate}</td>
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                      conf.status === ConferenceStatus.Approved ? "bg-emerald-100 text-emerald-800" :
                                      conf.status === ConferenceStatus.PendingReview ? "bg-amber-100 text-amber-800" :
                                      conf.status === ConferenceStatus.Rejected ? "bg-rose-100 text-rose-800" :
                                      "bg-slate-200 text-slate-700"
                                    }`}>
                                      {conf.status}
                                    </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right space-x-2">
                                    {(isPendingStatus(conf.status) ||
                                        conf.status === ConferenceStatus.Rejected ||
                                        conf.status === ConferenceStatus.Draft) && (
                                        <button
                                        onClick={() => startEditConference(conf)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                        title="Edit Conference"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                    )}
                                    {conf.status === ConferenceStatus.Approved && !isConferenceCompleted(conf) && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            const result = await onToggleConferenceActive?.(conf.id);
                                            if (!result) return;
                                            showToast(result.success
                                              ? `Conference ${result.isActive ? "activated" : "deactivated"} successfully.`
                                              : (result.error || "Could not update conference status."));
                                          }}
                                          className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${conf.isDeactivated ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                          title={conf.isDeactivated ? "Activate Conference" : "Deactivate Conference"}
                                        >
                                          {conf.isDeactivated ? "Activate" : "Deactivate"}
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to permanently delete conference "${conf.title}"?`)) {
                                              await onDeleteConference?.(conf.id);
                                              showToast(`Conference "${conf.title}" deleted successfully.`);
                                            } else {
                                              showToast("Delete action cancelled.");
                                            }
                                          }}
                                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Delete Conference"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                    {isConferenceCompleted(conf) && (
                                      <>
                                        <button
                                          onClick={() => setViewingCompletedConference(conf)}
                                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                          title="View completed conference details"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Are you sure you want to permanently delete completed conference "${conf.title}"?`)) {
                                              await onDeleteConference?.(conf.id);
                                              showToast(`Conference "${conf.title}" deleted successfully.`);
                                            } else {
                                              showToast("Delete action cancelled.");
                                            }
                                          }}
                                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Delete Conference"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                    {conf.status === ConferenceStatus.Draft && (
                                      <button
                                        onClick={async () => {
                                        if (
                                          confirm(
                                            `Are you sure you want to permanently delete draft "${conf.title}"?`
                                          )
                                        ) {
                                          const result = await onDeleteDraft(conf.id);

                                          if (result.success) {
                                            showToast(
                                              `Draft "${conf.title}" deleted successfully.`
                                            );
                                          } else {
                                            showToast(
                                              result.error ||
                                                `Unable to delete draft "${conf.title}".`
                                            );
                                          }
                                        } else {
                                          showToast("Delete action cancelled.");
                                        }
                                      }}
                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Draft"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50 min-w-0">
                          <div>
                            Showing {filteredConfs.length === 0 ? 0 : (managePage - 1) * ORG_ITEMS_PER_PAGE + 1} to {Math.min(managePage * ORG_ITEMS_PER_PAGE, filteredConfs.length)} of {filteredConfs.length} conferences
                          </div>
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setManagePage((p) => Math.max(1, p - 1))}
                                disabled={managePage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Previous
                              </button>
                              <span className="px-2 font-bold text-slate-800">
                                Page {managePage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setManagePage((p) => Math.min(totalPages, p + 1))}
                                disabled={managePage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SECTION 6: MANAGE PROFILE */}
            {activeMenu === "MANAGE_PROFILE" && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
                {/* Header Banner & Mode Selector */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
                  <div className="relative h-40 sm:h-48 bg-[#37494E]">
                    {activeProfile?.coverImage ? (
                      <img src={activeProfile.coverImage} alt="" className="h-full w-full object-contain opacity-60" />
                    ) : (
                      <div className="h-full w-full bg-[#37494E]" />
                    )}
                    <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 max-w-[calc(100%-1.5rem)]">
                      {!isEditingProfile ? (
                        <button
                          onClick={() => {
                          const defaultLogo =
                            "https://images.unsplash.com/photo-1599305445671-ac291c95aba9?auto=format&fit=crop&w=120&h=120&q=80";

                          const defaultCover =
                            "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1000&q=80";

                          if (profileLogo === defaultLogo) {
                            setProfileLogo("");
                          }

                          if (profileCover === defaultCover) {
                            setProfileCover("");
                          }

                          setIsEditingProfile(true);
                        }}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit Profile Details
                        </button>
                      ) : (
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Public Profile
                        </button>
                      )}
                    </div>
                    <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 right-3 sm:right-auto flex items-center gap-3 sm:gap-4 min-w-0">
                      {activeProfile?.logo ? (
                      <img
                        src={getCleanImageSrc(activeProfile.logo)}
                        alt={activeProfile?.organizationName || "Logo"}
                        className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl border-2 border-white object-contain bg-white shadow-md shrink-0"
                      />
                    ) : null}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-xl font-bold text-white font-display leading-tight break-words">
                          {activeProfile?.organizationName || "Organizer Profile"}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-200 break-words">
                          {activeProfile?.city}, {activeProfile?.country}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* View Mode Summary Cards */}
                {activeProfile && !isEditingProfile && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 min-w-0">
                    {/* Card 1: Profile Information */}
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 md:p-6 space-y-4 lg:col-span-2 min-w-0">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" /> Profile Information
                        </h4>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Organizer Profile
                        </span>
                      </div>
                      <div className="space-y-4 text-xs">
                        <div>
                          <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Organization Name</label>
                          <p className="text-slate-800 font-bold text-base mt-0.5">{activeProfile.organizationName}</p>
                        </div>
                        <div>
                          <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Unique Profile URL</label>
                          <div className="flex items-center gap-2 mt-1 min-w-0 max-w-full">
                            <a
                              href={`/organizers/${activeProfile.slug || activeProfile.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 font-bold hover:underline text-xs flex items-center gap-1 cursor-pointer bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100 w-fit max-w-full min-w-0 break-all"
                              title="Click to view unique public organizer profile page"
                            >
                              <span>/organizers/{activeProfile.slug || activeProfile.id}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                        </div>
                        <div>
                          <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Location</label>
                          <p className="text-slate-700 font-medium text-xs mt-0.5 break-words min-w-0">
                            📍 {activeProfile.city}, {activeProfile.country}
                          </p>
                        </div>
                        <div>
                          <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">About Organization</label>
                          <p className="text-slate-600 leading-relaxed text-xs mt-1 whitespace-pre-line bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-100 break-words min-w-0 overflow-hidden">
                            {activeProfile.aboutOrganization || "No description provided."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right column: Contact Details & Social Media Links */}
                    <div className="space-y-4 sm:space-y-5 lg:space-y-6 min-w-0">
                      {/* Card 2: Contact Details */}
                      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 md:p-6 space-y-4 min-w-0">
                        <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4 text-emerald-600" /> Contact Details
                          </h4>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Contact Person</label>
                            <p className="text-slate-800 font-semibold text-xs mt-0.5 break-words min-w-0">{activeProfile.contactPerson}</p>
                          </div>
                          <div>
                            <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Official Email</label>
                            <p className="text-slate-800 font-semibold text-xs mt-0.5 break-all min-w-0">{activeProfile.email}</p>
                          </div>
                          {activeProfile.whatsapp && (
                            <div>
                              <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Phone / WhatsApp</label>
                              <p className="text-slate-800 font-semibold text-xs mt-0.5 break-all min-w-0">{activeProfile.whatsapp}</p>
                            </div>
                          )}
                          <div>
                            <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Official Website</label>
                            {activeProfile.organizationWebsite ? (
                              <a
                                href={activeProfile.organizationWebsite}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-semibold text-xs mt-0.5 flex items-start gap-1 min-w-0 max-w-full break-all"
                              >
                                <Globe className="h-3 w-3 shrink-0" /> {activeProfile.organizationWebsite}
                              </a>
                            ) : (
                              <p className="text-slate-400 italic text-xs mt-0.5">Not specified</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Social Media Links */}
                      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 md:p-6 space-y-4 min-w-0">
                        <div className="flex items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 min-w-0">
                         <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-start sm:items-center gap-2 min-w-0 leading-tight">
                            <Globe className="h-4 w-4 text-purple-600" /> Social Media Links & Web Presence
                          </h4>
                        </div>
                        <div className="space-y-2 text-xs">
                          {activeProfile.organizationWebsite && (
                            <a href={activeProfile.organizationWebsite} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="truncate">Website</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.twitter && (
                            <a href={activeProfile.twitter} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Twitter className="h-4 w-4 text-sky-500 shrink-0" />
                              <span className="truncate">Twitter / X</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.linkedin && (
                            <a href={activeProfile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Linkedin className="h-4 w-4 text-blue-600 shrink-0" />
                              <span className="truncate">LinkedIn</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.facebook && (
                            <a href={activeProfile.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Facebook className="h-4 w-4 text-blue-700 shrink-0" />
                              <span className="truncate">Facebook</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.instagram && (
                            <a href={activeProfile.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Instagram className="h-4 w-4 text-pink-600 shrink-0" />
                              <span className="truncate">Instagram</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.youtube && (
                            <a href={activeProfile.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <Youtube className="h-4 w-4 text-rose-600 shrink-0" />
                              <span className="truncate">YouTube</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.whatsapp && (
                            <a href={`https://wa.me/${activeProfile.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <WhatsAppIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="truncate">WhatsApp ({activeProfile.whatsapp})</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.telegram && (
                            <a href={activeProfile.telegram} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <TelegramIcon className="h-4 w-4 text-sky-600 shrink-0" />
                              <span className="truncate">Telegram</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.tiktok && (
                            <a href={activeProfile.tiktok} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <TikTokIcon className="h-4 w-4 text-slate-900 shrink-0" />
                              <span className="truncate">TikTok</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.github && (
                            <a href={activeProfile.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <GithubIcon className="h-4 w-4 text-slate-800 shrink-0" />
                              <span className="truncate">GitHub</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {activeProfile.pinterest && (
                            <a href={activeProfile.pinterest} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors font-medium">
                              <PinterestIcon className="h-4 w-4 text-red-600 shrink-0" />
                              <span className="truncate">Pinterest</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 ml-auto shrink-0" />
                            </a>
                          )}
                          {!activeProfile.organizationWebsite && !activeProfile.twitter && !activeProfile.linkedin && !activeProfile.facebook && !activeProfile.instagram && !activeProfile.youtube && !activeProfile.whatsapp && !activeProfile.telegram && !activeProfile.tiktok && !activeProfile.github && !activeProfile.pinterest && (
                            <p className="text-slate-400 italic text-xs py-2">No social media or website links added yet. Click "Edit Profile Details" to add your social profiles.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Profile Form */}
                {(isEditingProfile || !activeProfile) && (
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 md:p-6 space-y-5 sm:space-y-6 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Edit2 className="h-5 w-5 text-blue-600" /> Manage Profile & Social Media Details
                      </h3>
                      {activeProfile && (
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (activeProfile) {
                          onUpdateOrganizer({
                            ...activeProfile,
                            organizationName: profileOrgName,
                            contactPerson: profileContact,
                            logo: profileLogo,
                            coverImage: profileCover,
                            galleryImages: profileGallery,
                            organizationWebsite: profileWebsite,
                            aboutOrganization: profileAbout,
                            country: profileCountry,
                            city: profileCity,
                            twitter: profileTwitter,
                            linkedin: profileLinkedin,
                            facebook: profileFacebook,
                            instagram: profileInstagram,
                            youtube: profileYoutube,
                            whatsapp: profileWhatsapp,
                            telegram: profileTelegram,
                            tiktok: profileTiktok,
                            github: profileGithub,
                            pinterest: profilePinterest,
                            updatedAt: new Date().toISOString(),
                          });
                          setIsEditingProfile(false);
                          showToast("Profile details, contact information, and social media links updated successfully!");
                        }
                      }}
                      className="space-y-6 text-xs"
                    >
                      {/* Section A: Profile Information */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" /> Profile Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                          <div className="space-y-1 md:col-span-2 min-w-0">
                            <label className="font-bold uppercase tracking-wider text-slate-700">Organization Name *</label>
                            <input
                              type="text"
                              required
                              value={profileOrgName || ""}
                              onChange={(e) => setProfileOrgName(e.target.value)}
                              className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700">Country *</label>
                            <select
                              required
                              value={profileCountry || ""}
                              onChange={(e) => {
                                const selectedC = e.target.value;
                                setProfileCountry(selectedC);
                                const matchingCities = (citiesList || [])
                                  .filter((c) => c.country.trim().toLowerCase() === selectedC.trim().toLowerCase())
                                  .map((c) => c.name);
                                setProfileCity(matchingCities[0] || "");
                              }}
                              className="w-full min-w-0 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="">Select Country</option>
                              {adminCountryOptions.map((c, idx) => (
                                <option key={`${c}-${idx}`} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700">City *</label>
                            <select
                              required
                              disabled={!profileCountry}
                              value={profileCity || ""}
                              onChange={(e) => setProfileCity(e.target.value)}
                              className={`w-full min-w-0 text-xs sm:text-sm border rounded-xl px-3 sm:px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                                !profileCountry
                                  ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-50 border-slate-200 text-slate-800 cursor-pointer"
                              }`}
                            >
                              <option value="">{profileCountry ? "Select City" : "Select Country First"}</option>
                              {profileCityOptions.map((c, idx) => (
                                <option key={`${c}-${idx}`} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <ImageUploaderField
                            label="Organization Logo"
                            value={profileLogo || ""}
                            onChange={setProfileLogo}
                            placeholder="https://example.com/logo.png"
                            maxWidth={500}
                            maxHeight={500}
                            maxFileSizeKB={50}
                            aspectHint="Square logo (300x300 recommended)"
                            isLogo={true}
                          />

                          <ImageUploaderField
                            label="Cover Image Header"
                            value={profileCover || ""}
                            onChange={setProfileCover}
                            placeholder="https://example.com/cover.jpg"
                            maxWidth={1200}
                            maxHeight={500}
                            maxFileSizeKB={50}
                            aspectHint="Landscape banner (1200x400 recommended)"
                            isLogo={false}
                          />

                          <div className="space-y-1 md:col-span-2 min-w-0">
                            <label className="font-bold uppercase tracking-wider text-slate-700">About Organization *</label>
                            <textarea
                              required
                              rows={4}
                              value={profileAbout || ""}
                              onChange={(e) => setProfileAbout(e.target.value)}
                              className="w-full min-w-0 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section B: Contact Details */}
                      <div className="space-y-4 pt-2">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider pb-1 border-b border-slate-100 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-emerald-600" /> Contact Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700">Contact Person *</label>
                            <input
                              type="text"
                              required
                              value={profileContact || ""}
                              onChange={(e) => setProfileContact(e.target.value)}
                              className="w-full min-w-0 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700">Official Website (Optional)</label>
                            <input
                              type="text"
                              value={profileWebsite || ""}
                              onChange={(e) => setProfileWebsite(e.target.value)}
                              className="w-full min-w-0 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="e.g. example.com or https://www.example.com"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section C: Social Media Management */}
                      <div className="space-y-4 pt-2">
                        <div className="pb-1 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                            <Globe className="h-4 w-4 text-purple-600" /> Social Media Management
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">All social media fields are optional</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Twitter className="h-3.5 w-3.5 text-sky-500" /> Twitter / X Profile URL
                            </label>
                            <input
                              type="text"
                              value={profileTwitter || ""}
                              onChange={(e) => setProfileTwitter(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://x.com/yourhandle"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn Profile URL
                            </label>
                            <input
                              type="text"
                              value={profileLinkedin || ""}
                              onChange={(e) => setProfileLinkedin(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://linkedin.com/in/yourprofile"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Facebook className="h-3.5 w-3.5 text-blue-700" /> Facebook Page URL
                            </label>
                            <input
                              type="text"
                              value={profileFacebook || ""}
                              onChange={(e) => setProfileFacebook(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://facebook.com/yourpage"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Instagram className="h-3.5 w-3.5 text-pink-600" /> Instagram Profile URL
                            </label>
                            <input
                              type="text"
                              value={profileInstagram || ""}
                              onChange={(e) => setProfileInstagram(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://instagram.com/yourprofile"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Youtube className="h-3.5 w-3.5 text-rose-600" /> YouTube Channel URL
                            </label>
                            <input
                              type="text"
                              value={profileYoutube || ""}
                              onChange={(e) => setProfileYoutube(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://youtube.com/@yourchannel"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp / Phone Number
                            </label>
                            <input
                              type="text"
                              value={profileWhatsapp || ""}
                              onChange={(e) => setProfileWhatsapp(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="+1234567890"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <TelegramIcon className="h-3.5 w-3.5 text-sky-600" /> Telegram Link / Username
                            </label>
                            <input
                              type="text"
                              value={profileTelegram || ""}
                              onChange={(e) => setProfileTelegram(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://t.me/yourusername"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <TikTokIcon className="h-3.5 w-3.5 text-slate-900" /> TikTok Profile URL
                            </label>
                            <input
                              type="text"
                              value={profileTiktok || ""}
                              onChange={(e) => setProfileTiktok(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://tiktok.com/@yourhandle"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <GithubIcon className="h-3.5 w-3.5 text-slate-800" /> GitHub Profile / Organization
                            </label>
                            <input
                              type="text"
                              value={profileGithub || ""}
                              onChange={(e) => setProfileGithub(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://github.com/yourorg"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <PinterestIcon className="h-3.5 w-3.5 text-red-600" /> Pinterest Profile URL
                            </label>
                            <input
                              type="text"
                              value={profilePinterest || ""}
                              onChange={(e) => setProfilePinterest(e.target.value)}
                              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://pinterest.com/yourprofile"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                        {activeProfile && (
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-5 py-2.5 bg-[#37494E] hover:bg-[#2c3b3f] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Save className="h-4 w-4" /> Save Profile Details
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {viewingCompletedConference && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 shadow-2xl border border-slate-200 min-w-0">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 mb-2">
                  Completed Conference
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#37494E] leading-tight break-words">
                  {viewingCompletedConference.title}
                </h3>
                {viewingCompletedConference.shortTitle && (
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">({viewingCompletedConference.shortTitle})</p>
                )}
              </div>
              <button
                onClick={() => setViewingCompletedConference(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Close completed conference preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-44 sm:h-56 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
              <img
                src={getCleanImageSrc(viewingCompletedConference.bannerImage, DEFAULT_CONFERENCE_IMAGE)}
                alt={viewingCompletedConference.title}
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_CONFERENCE_IMAGE;
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Topics / Field</p>
                <p className="font-semibold text-slate-800">{viewingCompletedConference.category}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Organizer</p>
                <p className="font-semibold text-slate-800">
                  {activeProfile?.organizationName || viewingCompletedConference.organizerId}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Dates</p>
                <p className="font-semibold text-slate-800">
                  {formatConferenceDate(viewingCompletedConference.startDate)} - {formatConferenceDate(viewingCompletedConference.endDate)}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                <p className="font-semibold text-slate-800">
                  {viewingCompletedConference.city}, {viewingCompletedConference.country}
                  {viewingCompletedConference.venue ? ` (${viewingCompletedConference.venue})` : ""}
                </p>
              </div>
            </div>

            {viewingCompletedConference.conferenceWebsite && (
              <div className="text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Official Website</p>
                <a
                  href={viewingCompletedConference.conferenceWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-start gap-1 font-semibold break-all min-w-0"
                >
                  {viewingCompletedConference.conferenceWebsite} <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
            )}

            {viewingCompletedConference.contactEmail && (
              <div className="text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400">Contact Email</p>
                <a
                  href={`mailto:${viewingCompletedConference.contactEmail}`}
                  className="text-blue-600 hover:underline font-semibold break-all"
                >
                  {viewingCompletedConference.contactEmail}
                </a>
              </div>
            )}

            <div className="text-xs space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-slate-400">Description / Call For Papers</p>
              <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100 text-slate-700 whitespace-pre-line leading-relaxed break-words max-h-48 overflow-y-auto min-w-0">
                {viewingCompletedConference.description || "No description provided."}
              </div>
            </div>

            <div className="flex items-center justify-stretch sm:justify-end pt-3 border-t border-slate-100">
              <button
                onClick={async () => {
                  if (!confirm(`Are you sure you want to permanently delete completed conference "${viewingCompletedConference.title}"?`)) {
                    showToast("Delete action cancelled.");
                    return;
                  }
                      const result = await onDeleteConference?.(
                        viewingCompletedConference.id
                      );

                      if (result?.success) {
                        const deletedTitle = viewingCompletedConference.title;

                        setViewingCompletedConference(null);

                        showToast(
                          result.warning ||
                            `Conference "${deletedTitle}" deleted successfully.`
                        );
                      } else {
                        showToast(
                          result?.error ||
                            `Unable to delete conference "${viewingCompletedConference.title}".`
                        );
                      }
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
