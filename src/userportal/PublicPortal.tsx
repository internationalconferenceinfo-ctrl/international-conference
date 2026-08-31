import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  saveToSupabase,
  fetchFromSupabase,
  fetchCitiesByCountryFromSupabase,
  subscribeToSupabase,
  saveRecordToSupabase
} from "../database/supabase";
import { safeSetLocalStorage } from "../shared/utils/storageUtils";
import { 
  Search, MapPin, Calendar, Clock, Globe, ShieldCheck, 
  ExternalLink, ArrowRight, BookOpen, Layers, Award, 
  Users, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  SlidersHorizontal, Sparkles, TrendingUp, Star,
  Zap, Briefcase, GraduationCap, Building2, Microscope,
  Brain, Heart, Cpu, Leaf, BarChart3, Filter, Mail, Phone, User,
  Facebook, Instagram, Linkedin, Twitter, MessageSquare, Send, Handshake, Upload, X, Quote
} from "lucide-react";
import { Conference, Category, OrganizerProfile, ConferenceStatus, LiveStatus, Banner, formatConferenceDate, BannerContentItem, UserFeedback, SubscriberItem } from "../shared/types";
import { compressImageToTargetSize } from "../shared/utils/imageUtils";
import { ImageUploaderField } from "../shared/components/ImageUploaderField";
import { isConferenceCompleted } from "../shared/utils/expirationUtils";
import { slugify, getConferenceSlug } from "../shared/utils/slugUtils";
import { OFFICIAL_CONTACT_INFO, OFFICIAL_SOCIAL_LINKS, ContactInfo, SocialLinks } from "../constants/contactConfig";
import { aboutUsContent } from "../content/aboutUs";
import { privacyPolicyContent } from "../content/privacyPolicy";
import { termsOfServiceContent } from "../content/termsOfService";

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

interface PublicPortalProps {
  conferences: Conference[];
  categories: Category[];
  organizers: OrganizerProfile[];
  onRegisterClick: (conferenceId: string) => void;
  onSelectOrganizer: (organizerId: string) => void;
  onSelectConference: (conference: Conference) => void;
  banners?: Banner[];
  bannerContents?: BannerContentItem[];
  userFeedbacks?: UserFeedback[];
  subscriberEmails?: SubscriberItem[];
  onUpdateUserFeedbacks?: (feedbacks: UserFeedback[]) => void;
  onUpdateSubscriberEmails?: (subscribers: SubscriberItem[]) => void;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  selectedCountry?: string;
  onCountryChange?: (country: string) => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  countriesList?: string[];
  citiesList?: Array<{ name: string; country: string }>;
  inactiveCountries?: string[];
  inactiveCities?: string[];
  inactiveTopics?: string[];
  onAddNotification?: (title: string, message: string, type: "success" | "warning" | "info" | "error", orgId: string, relatedConferenceId?: string, notificationType?: string) => void;
}

const TESTIMONIALS: any[] = [];

// Dynamic active countries list
export const WORLD_COUNTRIES: string[] = [];

export const ALL_MEDIA_PARTNERS: Array<{
  id: string;
  name: string;
  role?: string;
  badgeColor?: string;
  borderHover?: string;
  initials?: string;
  logo: string;
  description: string;
  website: string;
}> = [];

export const ALL_ASSOCIATES: Array<{
  id: string;
  name: string;
  role?: string;
  badgeColor?: string;
  borderHover?: string;
  initials?: string;
  logo: string;
  description: string;
  website: string;
}> = [];

const getFormattedUrl = (url?: string) => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function PublicPortal({
  conferences,
  categories,
  organizers,
  onRegisterClick,
  onSelectOrganizer,
  onSelectConference,
  banners,
  bannerContents,
  userFeedbacks,
  subscriberEmails,
  onUpdateUserFeedbacks,
  onUpdateSubscriberEmails,
  onLoginClick,
  onSignUpClick,
  currentTab,
  onTabChange,
  selectedCountry: selectedCountryProp,
  onCountryChange,
  selectedCity: selectedCityProp,
  onCityChange,
  selectedCategory: selectedCategoryProp,
  onCategoryChange,
  countriesList: countriesListProp,
  citiesList: citiesListProp,
  inactiveCountries = [],
  inactiveCities = [],
  inactiveTopics = [],
  onAddNotification,
}: PublicPortalProps) {
  const tab = currentTab || "HOME";
  const [searchTerm, setSearchTerm] = useState("");
  const isSlashSearch = searchTerm.startsWith("/");
  const rawSlashQuery = isSlashSearch ? searchTerm.slice(1).trim() : "";
  const slashCountryLabel = rawSlashQuery
    ? rawSlashQuery.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
    : "";
  
  const [selectedCategoryLocal, setSelectedCategoryLocal] = useState<string>("All");
  const [selectedCountryLocal, setSelectedCountryLocal] = useState<string>("All");
  const [selectedCityLocal, setSelectedCityLocal] = useState<string>("All");

  // Cities loaded from Supabase for the currently selected country
  const [selectedCountryCities, setSelectedCountryCities] = useState<
    Array<{ name: string; country: string }>
  >([]);

  const [footerContactInfo, setFooterContactInfo] = useState<ContactInfo>({ ...OFFICIAL_CONTACT_INFO });
  const [footerSocialMedia, setFooterSocialMedia] = useState<SocialLinks>({ ...OFFICIAL_SOCIAL_LINKS });

  const [dynamicAboutUs, setDynamicAboutUs] = useState({
  missionBadge: aboutUsContent.missionBadge,
  title: aboutUsContent.title,
  paragraph1: aboutUsContent.paragraph1,
  paragraph2: aboutUsContent.paragraph2,
  stat1Value: aboutUsContent.stat1Value,
  stat1Label: aboutUsContent.stat1Label,
  stat2Value: aboutUsContent.stat2Value,
  stat2Label: aboutUsContent.stat2Label,
  imageUrl: aboutUsContent.imageUrl,
});

// Dynamic Privacy Policy from Supabase
const [dynamicPrivacyPolicy, setDynamicPrivacyPolicy] = useState({
  title: privacyPolicyContent.title,
  content: [
    privacyPolicyContent.intro,
    ...privacyPolicyContent.sections.flatMap((section) => [
      section.title,
      section.content
    ])
  ].join("\n\n"),
  updated_at: ""
});

// Dynamic Terms of Service from Supabase
const [dynamicTermsOfService, setDynamicTermsOfService] = useState({
  title: termsOfServiceContent.title,
  content: [
    termsOfServiceContent.intro,
    ...termsOfServiceContent.sections.flatMap((section) => [
      section.title,
      section.content
    ])
  ].join("\n\n"),
  updated_at: ""
});

const [homeMainDescription, setHomeMainDescription] = useState("");

const [conferenceDescriptions, setConferenceDescriptions] = useState({
  default_description:
    "Discover verified, peer-reviewed, and high-impact academic conferences, research symposiums, and professional summits from around the world.",

  topic_description:
    "Discover verified conferences focusing on {TOPIC}.",

  country_description:
    "Explore trusted international conferences taking place in {COUNTRY}.",

  city_description:
    "Find upcoming academic conferences in {CITY}, {COUNTRY}.",

  topic_country_description:
  "Discover verified {TOPIC} conferences taking place in {COUNTRY}.",  

  combined_description:
    "Discover verified {TOPIC} conferences taking place in {CITY}, {COUNTRY}."
});

// Load Privacy Policy from Supabase
useEffect(() => {
  const loadPrivacyPolicy = async () => {
    try {
      const data = await fetchFromSupabase<any[]>(
        "privacy_policy",
        true
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const row =
        data.find((item) => item.id === "primary") || data[0];

      if (!row) return;

      setDynamicPrivacyPolicy({
        title: row.title || privacyPolicyContent.title,
        content:
          row.content ||
          [
            privacyPolicyContent.intro,
            ...privacyPolicyContent.sections.flatMap((section) => [
              section.title,
              section.content
            ])
          ].join("\n\n"),
        updated_at: row.updated_at || ""
      });
    } catch (error) {
      console.error(
        "Failed to load Privacy Policy:",
        error
      );
    }
  };

  loadPrivacyPolicy();
}, []);

// Load Terms of Service from Supabase
useEffect(() => {
  const loadTermsOfService = async () => {
    try {
      const data = await fetchFromSupabase<any[]>(
        "terms_of_service",
        true
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const row =
        data.find((item) => item.id === "primary") || data[0];

      if (!row) return;

      setDynamicTermsOfService({
        title: row.title || termsOfServiceContent.title,
        content:
          row.content ||
          [
            termsOfServiceContent.intro,
            ...termsOfServiceContent.sections.flatMap((section) => [
              section.title,
              section.content
            ])
          ].join("\n\n"),
        updated_at: row.updated_at || ""
      });
    } catch (error) {
      console.error(
        "Failed to load Terms of Service:",
        error
      );
    }
  };

  loadTermsOfService();
}, []);

  useEffect(() => {
    const refreshPublicContact = () => {
      fetchFromSupabase<any>("contact_info", true).then((data) => {
        const contact = Array.isArray(data) ? data[0] : data;
        if (contact) setFooterContactInfo({
          email: contact.email || OFFICIAL_CONTACT_INFO.email,
          phone: contact.phone || OFFICIAL_CONTACT_INFO.phone,
          address: contact.address || OFFICIAL_CONTACT_INFO.address,
        });
      });
      fetchFromSupabase<any>("social_links", true).then((data) => {
        const links = Array.isArray(data) ? data[0] : data;
        if (links) setFooterSocialMedia({ ...OFFICIAL_SOCIAL_LINKS, ...links });
      });
    };

    refreshPublicContact();
    const unsubscribeContact = subscribeToSupabase("contact_info", refreshPublicContact);
    const unsubscribeSocial = subscribeToSupabase("social_links", refreshPublicContact);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("gch_realtime_sync");
      channel.onmessage = refreshPublicContact;
    }
    return () => {
      unsubscribeContact();
      unsubscribeSocial();
      channel?.close();
    };
  }, []);
   useEffect(() => {
    const loadAboutUs = async () => {
      try {
        const data = await fetchFromSupabase<any[]>(
          "about_us",
          true
        );

        if (!data || !Array.isArray(data) || data.length === 0) {
          return;
        }

        const row =
          data.find((item) => item.id === "primary") || data[0];

        if (!row) return;

        setDynamicAboutUs({
          missionBadge: row.mission_badge || aboutUsContent.missionBadge,
          title: row.title || aboutUsContent.title,
          paragraph1: row.paragraph1 || aboutUsContent.paragraph1,
          paragraph2: row.paragraph2 || aboutUsContent.paragraph2,
          stat1Value: row.stat1_value || aboutUsContent.stat1Value,
          stat1Label: row.stat1_label || aboutUsContent.stat1Label,
          stat2Value: row.stat2_value || aboutUsContent.stat2Value,
          stat2Label: row.stat2_label || aboutUsContent.stat2Label,
          imageUrl: row.image_url || aboutUsContent.imageUrl,
        });

      } catch (error) {
        console.error("Failed to load About Us:", error);
      }
    };

    loadAboutUs();
  }, []);

  useEffect(() => {
  const loadHomeDescription = async () => {
    try {
      const data = await fetchFromSupabase<any[]>(
        "home_description",
        true
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const row =
        data.find((item) => item.id === "primary") || data[0];

      if (!row) return;

      setHomeMainDescription(row.description || "");
    } catch (error) {
      console.error(
        "Failed to load Home Main Description:",
        error
      );
    }
  };

  loadHomeDescription();
}, []);

useEffect(() => {
  const loadConferenceDescriptions = async () => {
    try {
      const data = await fetchFromSupabase<any[]>(
        "conference_descriptions",
        true
      );

      if (!data || !Array.isArray(data) || data.length === 0) {
        return;
      }

      const row =
        data.find((item) => item.id === "primary") || data[0];

      if (!row) return;

    setConferenceDescriptions({
  default_description:
    row.default_description ||
    "Discover verified, peer-reviewed, and high-impact academic conferences, research symposiums, and professional summits from around the world.",

  topic_description:
    row.topic_description ||
    "Discover verified conferences focusing on {TOPIC}.",

  country_description:
    row.country_description ||
    "Explore trusted international conferences taking place in {COUNTRY}.",

  city_description:
    row.city_description ||
    "Find upcoming academic conferences in {CITY}, {COUNTRY}.",
  
  topic_country_description:
  row.topic_country_description ||
  "Discover verified {TOPIC} conferences taking place in {COUNTRY}.",

  combined_description:
    row.combined_description ||
    "Discover verified {TOPIC} conferences taking place in {CITY}, {COUNTRY}."
});

    } catch (error) {
      console.error(
        "Failed to load Conference Descriptions:",
        error
      );
    }
  };

  loadConferenceDescriptions();
}, []);

  const selectedCategory = selectedCategoryProp !== undefined ? selectedCategoryProp : selectedCategoryLocal;
  const selectedCountry = selectedCountryProp !== undefined ? selectedCountryProp : selectedCountryLocal;
  const selectedCity = selectedCityProp !== undefined ? selectedCityProp : selectedCityLocal;

  const setSelectedCategory = (val: string) => {
    setSelectedCategoryLocal(val);
    if (onCategoryChange) onCategoryChange(val);
  };

  const setSelectedCountry = (val: string) => {
    setSelectedCountryLocal(val);
    if (onCountryChange) onCountryChange(val);
  };

  const setSelectedCity = (val: string) => {
    setSelectedCityLocal(val);
    if (onCityChange) onCityChange(val);
  };

  useEffect(() => {
  const loadCitiesForSelectedCountry = async () => {
    if (!selectedCountry || selectedCountry === "All") {
      setSelectedCountryCities([]);
      return;
    }

    try {
      const rows = await fetchCitiesByCountryFromSupabase(
        selectedCountry.trim().toUpperCase()
      );

      setSelectedCountryCities(
        Array.isArray(rows)
          ? rows.map((city) => ({
              name: String(city.name || "").trim().toUpperCase(),
              country: String(city.country || selectedCountry)
                .trim()
                .toUpperCase()
            }))
          : []
      );
    } catch (error) {
      console.error(
        `Failed to load cities for ${selectedCountry}:`,
        error
      );

      setSelectedCountryCities([]);
    }
  };

  void loadCitiesForSelectedCountry();
}, [selectedCountry]);

  useEffect(() => {
    if (selectedCategoryProp !== undefined) {
      setSelectedCategoryLocal(selectedCategoryProp);
    }
  }, [selectedCategoryProp]);

  useEffect(() => {
    if (selectedCountryProp !== undefined) {
      setSelectedCountryLocal(selectedCountryProp);
    }
  }, [selectedCountryProp]);

  useEffect(() => {
    if (selectedCityProp !== undefined) {
      setSelectedCityLocal(selectedCityProp);
    }
  }, [selectedCityProp]);

  const [selectedLiveStatus, setSelectedLiveStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"Upcoming" | "Newest" | "Latest">("Upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const [mediaPartnerPage, setMediaPartnerPage] = useState(1);
  const [associatesPage, setAssociatesPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);

  // Reset page when filters or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedCountry, selectedCity, selectedLiveStatus, sortBy]);

  useEffect(() => {
    setMediaPartnerPage(1);
    setAssociatesPage(1);
  }, [tab]);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Shuffled & Auto-scrolling Home Feedbacks State
  const [shuffledFeedbacksPool, setShuffledFeedbacksPool] = useState<UserFeedback[]>([]);
  const [homeFeedbackScrollIndex, setHomeFeedbackScrollIndex] = useState(0);
  const [isHomeFeedbackHovered, setIsHomeFeedbackHovered] = useState(false);

  // Dedicated Testimonials / Feedback Page States
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState("");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<string>("ALL");

  // Newsletter & Contact Form States
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  
  // Footer User Feedback Form States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [userFeedbackName, setUserFeedbackName] = useState("");
  const [userFeedbackLocation, setUserFeedbackLocation] = useState("");
  const [userFeedbackImage, setUserFeedbackImage] = useState("");
  const [isFeedbackImageCompressing, setIsFeedbackImageCompressing] = useState(false);
  const [userFeedbackText, setUserFeedbackText] = useState("");
  const [userFeedbackRating, setUserFeedbackRating] = useState(5);
  const [userFeedbackSubmitted, setUserFeedbackSubmitted] = useState(false);
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<
    Array<{ name: string; image: string; text: string; rating: number; date: string }>
  >([]);

  const handleFeedbackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsFeedbackImageCompressing(true);
        const dataUrl = await compressImageToTargetSize(file, 20);
        setUserFeedbackImage(dataUrl);
      } catch (err: any) {
        console.error("Failed to process photo:", err);
      } finally {
        setIsFeedbackImageCompressing(false);
      }
    }
  };

  const [newsletterError, setNewsletterError] = useState("");

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleUserFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFeedbackName.trim() || !userFeedbackText.trim() || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);

    try {
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newFeedback: UserFeedback = {
        id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: userFeedbackName.trim(),
        image: userFeedbackImage.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
        text: userFeedbackText.trim().slice(0, 50),
        rating: userFeedbackRating || 5,
        status: "Approved",
        date: formattedDate,
        country: userFeedbackLocation.trim() || "Global"
      };

      const currentList = Array.isArray(userFeedbacks) ? userFeedbacks : [];
      const deduplicated = Array.from(
        new Map([newFeedback, ...currentList].map((f) => [f.id, f])).values()
      );

      safeSetLocalStorage("gch_feedbacks", deduplicated);
      if (onUpdateUserFeedbacks) {
        onUpdateUserFeedbacks(deduplicated);
      }

      onAddNotification?.(
        "New Feedback Submission 💬",
        `New feedback submitted by ${newFeedback.name} (${newFeedback.country}).`,
        "info",
        "ADMIN",
        newFeedback.id,
        "FEEDBACK_SUBMISSION"
      );

      // Persist to database in background
      saveToSupabase("user_feedbacks", deduplicated).catch((err) => {
        console.warn("[Feedback save notice]:", err);
      });

      setUserFeedbackSubmitted(true);
      setUserFeedbackName("");
      setUserFeedbackLocation("");
      setUserFeedbackImage("");
      setUserFeedbackText("");
      setUserFeedbackRating(5);
      setIsFeedbackModalOpen(false);

      setTimeout(() => {
        setUserFeedbackSubmitted(false);
      }, 3500);
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Collaboration / Partner Application States
  const [collabLogo, setCollabLogo] = useState("");
  const [isLogoCompressing, setIsLogoCompressing] = useState(false);
  const [collabName, setCollabName] = useState("");
  const [collabDescription, setCollabDescription] = useState("");
  const [collabUrl, setCollabUrl] = useState("");
  const [collabCategory, setCollabCategory] = useState<"Event Partner" | "Associates">("Event Partner");
  const [collabSubmitted, setCollabSubmitted] = useState(false);

  // Dynamic media partners and associates state sourced from Supabase
  const [dynamicMediaPartners, setDynamicMediaPartners] = useState<any[]>([]);
  const [dynamicAssociates, setDynamicAssociates] = useState<any[]>([]);

  // Handle Logo Upload with Auto Compression
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsLogoCompressing(true);
        const dataUrl = await compressImageToTargetSize(file, 20);
        setCollabLogo(dataUrl);
      } catch (err: any) {
        console.error("Failed to process logo:", err);
      } finally {
        setIsLogoCompressing(false);
      }
    }
  };

  // Handle Collaboration Submission (Saves directly to Supabase and goes live immediately)
  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabName.trim() || !collabUrl.trim() || !collabDescription.trim()) {
      alert("Please fill in all required fields (Company Name, Website, and Description).");
      return;
    }

    // Strict 150-character validation
    if (collabDescription.trim().length > 150) {
      alert("Description exceeds the 150-character maximum limit. Please shorten your description.");
      return;
    }

    let formattedUrl = collabUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (collabCategory === "Event Partner" || collabCategory === "Media Partner") {
        const newPartner = {
          id: `mp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: collabName.trim(),
          type: "Media Partner",
          logo: collabLogo || "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=120&h=120&q=80",
          website: formattedUrl,
          description: collabDescription.trim().slice(0, 150),
          email: "",
          submittedAt: dateStr,
        };

        const res = await saveRecordToSupabase("media_partners", newPartner);
        if (res.success) {
          const fresh = await fetchFromSupabase<any[]>("media_partners", true);
          if (fresh) setDynamicMediaPartners(fresh);
        }

        setCollabSubmitted(true);
        setCollabName("");
        setCollabUrl("");
        setCollabDescription("");
        setCollabLogo("");

        onAddNotification?.(
          "New Media Partner Submission 🤝",
          `New media partner '${newPartner.name}' submitted and is now live.`,
          "info",
          "ADMIN",
          newPartner.id,
          "MEDIA_PARTNER_SUBMISSION"
        );
      } else {
        const newAssoc = {
          id: `assoc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: collabName.trim(),
          category: "Associates",
          logo: collabLogo || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&h=120&q=80",
          website: formattedUrl,
          description: collabDescription.trim().slice(0, 150),
          email: "",
          submittedAt: dateStr,
        };

        const res = await saveRecordToSupabase("associates", newAssoc);
        if (res.success) {
          const fresh = await fetchFromSupabase<any[]>("associates", true);
          if (fresh) setDynamicAssociates(fresh);
        }

        setCollabSubmitted(true);
        setCollabName("");
        setCollabUrl("");
        setCollabDescription("");
        setCollabLogo("");

        onAddNotification?.(
          "New Associate Submission 🏢",
          `New associate '${newAssoc.name}' submitted and is now live.`,
          "info",
          "ADMIN",
          newAssoc.id,
          "ASSOCIATE_SUBMISSION"
        );
      }

      if (typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("gch_realtime_sync");
          bc.postMessage({ type: "DATA_UPDATED", timestamp: Date.now() });
          bc.close();
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error submitting collaboration application:", err);
    }
  };

  // Real-time sync for dynamic partners and associates
  useEffect(() => {
    const fetchPartnersAndAssociates = () => {
      fetchFromSupabase<any[]>("media_partners", true).then((val) => {
        if (val !== null && Array.isArray(val)) {
          setDynamicMediaPartners(val);
        }
      });

      fetchFromSupabase<any[]>("associates", true).then((val) => {
        if (val !== null && Array.isArray(val)) {
          setDynamicAssociates(val);
        }
      });
    };

    fetchPartnersAndAssociates();

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("gch_realtime_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "DATA_UPDATED") {
            fetchPartnersAndAssociates();
          }
        };
      } catch (e) {}
    }

    const unsubMP = subscribeToSupabase("media_partners", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        setDynamicMediaPartners(list as any[]);
      }
    });

    const unsubAssoc = subscribeToSupabase("associates", (val) => {
      const list = Array.isArray(val) ? val : Object.values(val || {});
      if (list && Array.isArray(list)) {
        setDynamicAssociates(list as any[]);
      }
    });

    window.addEventListener("focus", fetchPartnersAndAssociates);
    return () => {
      if (bc) bc.close();
      unsubMP();
      unsubAssoc();
      window.removeEventListener("focus", fetchPartnersAndAssociates);
    };
  }, []);

  // Media Partners list - newest submission first
const approvedMediaPartnersList = useMemo(() => {
  return [...dynamicMediaPartners]
    .sort((a, b) => {
      const timeA = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : 0;

      const timeB = b.submittedAt
        ? new Date(b.submittedAt).getTime()
        : 0;

      if (timeA !== timeB) {
        return timeB - timeA;
      }

      return String(b.id || "").localeCompare(
        String(a.id || "")
      );
    })
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: m.title || m.type || "Media Partner",
      badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
      borderHover: "hover:border-blue-300",
      initials:
        m.name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 4) || "MP",
      logo:
        m.logo ||
        "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=120&h=120&q=80",
      description:
        m.description ||
        "Official media distribution and scientific publishing partner.",
      website: m.website
    }));
}, [dynamicMediaPartners]);

 // Associates list - newest submission first
  const approvedAssociatesList = useMemo(() => {
    return [...dynamicAssociates]
      .sort((a, b) => {
        const timeA = a.submittedAt
          ? new Date(a.submittedAt).getTime()
          : 0;

        const timeB = b.submittedAt
          ? new Date(b.submittedAt).getTime()
          : 0;

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        return String(b.id || "").localeCompare(
          String(a.id || "")
        );
      })
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.title || a.category || "Associate",
        badgeColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
        borderHover: "hover:border-indigo-300",
        initials:
          a.name
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 4) || "ASC",
        logo:
          a.logo ||
          "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=120&h=120&q=80",
        description:
          a.description ||
          "Official academic associative network board.",
        website: a.website
      }));
  }, [dynamicAssociates]);

  // Admin-managed countries and cities synced from props or localStorage
  const rawCountries = countriesListProp || [];
  const rawCities = citiesListProp || [];

  const adminCountries = useMemo(() => {
    return rawCountries
      .map((c) => (typeof c === "string" ? c : String((c as any)?.name || (c as any)?.id || "")).trim().toUpperCase())
      .filter((c) => Boolean(c) && !inactiveCountries.some((ic) => ic.toUpperCase() === c));
  }, [rawCountries, inactiveCountries]);

  const adminCities = useMemo(() => {
    return rawCities
      .map((c) => ({
        name: String(c.name || "").trim().toUpperCase(),
        country: String(c.country || "").trim().toUpperCase()
      }))
      .filter(
        (c) =>
          Boolean(c.name) &&
          !inactiveCountries.some((ic) => ic.toUpperCase() === c.country) &&
          !inactiveCities.some((ic) => ic.toUpperCase() === `${c.country}:::${c.name}`)
      );
  }, [rawCities, inactiveCountries, inactiveCities]);

  // Approved conferences list
  const approvedConferences = useMemo(() => {
    return conferences.filter(
      (c) => c.status === ConferenceStatus.Approved && !c.isDeactivated && !isConferenceCompleted(c)
    );
  }, [conferences]);

  // Active Countries list for dropdowns (Includes active admin-added countries and approved conference countries)
  const activeCountriesList = useMemo(() => {
    const list = new Set<string>([
      ...adminCountries.filter(Boolean),
      ...approvedConferences.map((c) => c.country).filter((c) => Boolean(c) && !inactiveCountries.includes(c))
    ]);
    return Array.from(list).map(String).sort((a: string, b: string) => a.localeCompare(b));
  }, [adminCountries, approvedConferences, inactiveCountries]);

  // Countries dropdown list for filters
  const countriesDropdown = useMemo(() => {
    return ["All", ...activeCountriesList];
  }, [activeCountriesList]);

  // Cities dropdown list (Includes active admin-added cities and approved conference cities for selected country)
     const citiesDropdown = useMemo(() => {
  if (selectedCountry === "All" || !selectedCountry) {
    return ["All Cities (Select Country First)"];
  }

  const selectedCountryNormalized = selectedCountry
    .trim()
    .toUpperCase();

  // Cities loaded directly from Supabase for the selected country
  const supabaseCities = selectedCountryCities
    .filter(
      (city) =>
        city.country.trim().toUpperCase() ===
        selectedCountryNormalized
    )
    .map((city) => city.name.trim())
    .filter(Boolean);

  // Keep cities already used by approved conferences as a fallback
  const conferenceCities = approvedConferences
    .filter(
      (conference) =>
        String(conference.country || "")
          .trim()
          .toUpperCase() === selectedCountryNormalized
    )
    .map((conference) => String(conference.city || "").trim())
    .filter(Boolean);

  const combined = new Set<string>([
    ...supabaseCities,
    ...conferenceCities
  ]);

  return [
    "All",
    ...Array.from(combined).sort((a, b) =>
      a.localeCompare(b)
    )
  ];
}, [
  selectedCountry,
  selectedCountryCities,
  approvedConferences
]);

  // Countries shown on Home only when at least 1 approved/live conference exists
      const allFilterCountries = useMemo(() => {
        const countrySet = new Set<string>();

        approvedConferences.forEach((conf) => {
          const country = String(conf.country || "").trim();
          if (!country) return;

          const isInactive = inactiveCountries.some(
            (item) => String(item || "").trim().toLowerCase() === country.toLowerCase()
          );

          if (!isInactive) {
            countrySet.add(country);
          }
        });

        return Array.from(countrySet).sort((a, b) => {
        const aCount = approvedConferences.filter(
          (conf) =>
            String(conf.country || "").trim().toLowerCase() ===
            a.trim().toLowerCase()
        ).length;

        const bCount = approvedConferences.filter(
          (conf) =>
            String(conf.country || "").trim().toLowerCase() ===
            b.trim().toLowerCase()
        ).length;

        // Highest conference count first
        if (aCount !== bCount) {
          return bCount - aCount;
        }

        // Same count → alphabetical
        return a.localeCompare(b);
      });
      }, [approvedConferences, inactiveCountries]);

  // Search states for country, city, and topic cards
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [topicSearchQuery, setTopicSearchQuery] = useState("");

  // Filtered countries list
  const filteredCountriesList = useMemo(() => {
    if (!countrySearchQuery.trim()) return allFilterCountries;
    const q = countrySearchQuery.toLowerCase().trim();
    return allFilterCountries.filter((c) => c.toLowerCase().includes(q));
  }, [allFilterCountries, countrySearchQuery]);

  // Cities shown on Home only when at least 1 approved/live conference exists
const allFilterCities = useMemo(() => {
  const cityMap = new Map<
    string,
    { cityName: string; countryName: string }
  >();

  for (const conf of approvedConferences) {
    const cityName = String(conf.city || "").trim();
    const countryName = String(conf.country || "").trim();

    if (!cityName || !countryName) continue;

    const cityInactive = inactiveCities.some(
      (item) =>
        String(item || "").trim().toLowerCase() ===
        `${countryName}:::${cityName}`.toLowerCase()
    );

    const countryInactive = inactiveCountries.some(
      (item) =>
        String(item || "").trim().toLowerCase() ===
        countryName.toLowerCase()
    );

    if (cityInactive || countryInactive) continue;

    const key = `${cityName.toLowerCase()}|||${countryName.toLowerCase()}`;

    if (!cityMap.has(key)) {
      cityMap.set(key, {
        cityName,
        countryName,
      });
    }
  }

  return Array.from(cityMap.values()).sort((a, b) => {
  const aCount = approvedConferences.filter(
    (conf) =>
      String(conf.city || "").trim().toLowerCase() ===
        a.cityName.trim().toLowerCase() &&
      String(conf.country || "").trim().toLowerCase() ===
        a.countryName.trim().toLowerCase()
  ).length;

  const bCount = approvedConferences.filter(
    (conf) =>
      String(conf.city || "").trim().toLowerCase() ===
        b.cityName.trim().toLowerCase() &&
      String(conf.country || "").trim().toLowerCase() ===
        b.countryName.trim().toLowerCase()
  ).length;

  // Highest conference count first
  if (aCount !== bCount) {
    return bCount - aCount;
  }

  // Same count → city name, then country name
  return (
    a.cityName.localeCompare(b.cityName) ||
    a.countryName.localeCompare(b.countryName)
  );
});
}, [approvedConferences, inactiveCities, inactiveCountries]);

  // Filtered cities list based on citySearchQuery
  const filteredCitiesList = useMemo(() => {
    if (!citySearchQuery.trim()) return allFilterCities;
    const q = citySearchQuery.toLowerCase().trim();
    return allFilterCities.filter(
      (item) =>
        item.cityName.toLowerCase().includes(q) ||
        item.countryName.toLowerCase().includes(q)
    );
  }, [allFilterCities, citySearchQuery]);

  // Helper to count conferences in a city
  const getCityConferenceCount = (cityName: string, countryName: string) => {
    return approvedConferences.filter(
      (c) =>
        c.city?.trim().toLowerCase() === cityName.trim().toLowerCase() &&
        (!c.country || c.country.trim().toLowerCase() === countryName.trim().toLowerCase())
    ).length;
  };

  // Approved and active category mapping for Topics Section
  const topicsMapping: Record<string, string> = {
    "Business & Economics": "Business, Finance & Fintech",
    "Health & Medicine": "Medical & Health Sciences",
    "Mathematics & Statistics": "Mathematics & Statistics",
    "Engineering & Technology": "Civil & Mechanical Engineering",
    "Computer Science": "Information Technology & Security",
    "Artificial Intelligence": "Artificial Intelligence & ML",
    "Education": "Education & EdTech",
    "Environmental Science": "Environmental Science & Sustainability",
  };

  const reverseTopicsMapping: Record<string, string> = {
    "Business, Finance & Fintech": "Business & Economics",
    "Medical & Health Sciences": "Health & Medicine",
    "Mathematics & Statistics": "Mathematics & Statistics",
    "Civil & Mechanical Engineering": "Engineering & Technology",
    "Information Technology & Security": "Computer Science",
    "Artificial Intelligence & ML": "Artificial Intelligence",
    "Education & EdTech": "Education",
    "Environmental Science & Sustainability": "Environmental Science",
  };

  // Active categories list filtering out deactivated topics
  const activeCategories = useMemo(() => {
    return (categories || []).filter((cat) => {
      return !inactiveTopics.includes(cat.id) && !inactiveTopics.includes(cat.name);
    });
  }, [categories, inactiveTopics]);

  // Topics shown on Home only when at least 1 approved/live conference exists
const allFilterCategories = useMemo(() => {
  const topicSet = new Set<string>();

  approvedConferences.forEach((conf) => {
    if (!conf.category) return;

    const topicName = topicsMapping[conf.category] || conf.category;

    const isInactive = inactiveTopics.some((item) => {
      const inactiveValue = String(item || "").trim();

      return (
        inactiveValue === conf.category ||
        inactiveValue === topicName ||
        categories.some(
          (cat) =>
            cat.id === inactiveValue &&
            (cat.name === conf.category || cat.name === topicName)
        )
      );
    });

    if (!isInactive) {
      topicSet.add(topicName);
    }
  });

  return Array.from(topicSet)
  .filter(Boolean)
  .sort((a, b) => {
    const aCount = approvedConferences.filter((conf) => {
      const topicName = topicsMapping[conf.category] || conf.category;

      return (
        String(topicName || "").trim().toLowerCase() ===
        a.trim().toLowerCase()
      );
    }).length;

    const bCount = approvedConferences.filter((conf) => {
      const topicName = topicsMapping[conf.category] || conf.category;

      return (
        String(topicName || "").trim().toLowerCase() ===
        b.trim().toLowerCase()
      );
    }).length;

    // Highest conference count first
    if (aCount !== bCount) {
      return bCount - aCount;
    }

    // Same count → alphabetical
    return a.localeCompare(b);
  });
}, [approvedConferences, inactiveTopics, categories]);

  // Filtered topics list based on topicSearchQuery
  const filteredTopicsList = useMemo(() => {
    if (!topicSearchQuery.trim()) return allFilterCategories;
    const q = topicSearchQuery.toLowerCase().trim();
    return allFilterCategories.filter((topic) => topic.toLowerCase().includes(q));
  }, [allFilterCategories, topicSearchQuery]);

  // Helper to determine Trusted Organizer status (Verified badge or >= 101 completed conferences)
  const getIsOrganizerTrusted = (org: OrganizerProfile) => {
    if (org.isSuspended) return false;
    const completedCount = conferences.filter((c) => 
      (c.organizerId === org.id || (c.contactEmail && org.email && c.contactEmail.toLowerCase().trim() === org.email.toLowerCase().trim())) &&
      isConferenceCompleted(c)
    ).length;
    return Boolean(org.isVerified || completedCount >= 101);
  };

 // Home organizers: only organizers having at least 1 approved/live conference
// Highest number of approved conferences appears first
const trustedOrganizersList = useMemo(() => {
  const getPublishedConferenceCount = (org: OrganizerProfile) => {
    return approvedConferences.filter((conf) => {
      const sameOrganizerId = conf.organizerId === org.id;

      const sameEmail =
        Boolean(conf.contactEmail) &&
        Boolean(org.email) &&
        conf.contactEmail!.trim().toLowerCase() ===
          org.email!.trim().toLowerCase();

      return sameOrganizerId || sameEmail;
    }).length;
  };

  return organizers
    .filter((org) => {
      if (org.isSuspended) return false;

      // Home Trusted Organizers should only show organizers
      // that currently have at least one approved/live conference
      return getPublishedConferenceCount(org) > 0;
    })
    .sort((a, b) => {
      const aCount = getPublishedConferenceCount(a);
      const bCount = getPublishedConferenceCount(b);

      // Highest conference count first
      if (aCount !== bCount) {
        return bCount - aCount;
      }

      // If both have the same count, sort alphabetically
      return String(a.organizationName || "").localeCompare(
        String(b.organizationName || "")
      );
    });
}, [organizers, approvedConferences]);

    // All active organizers - for full Organizers page
    // Sort by highest number of approved conferences first
    const allPublicOrganizersList = useMemo(() => {
      const getPublishedConferenceCount = (org: OrganizerProfile) => {
        return approvedConferences.filter((conf) => {
          const sameOrganizerId = conf.organizerId === org.id;

          const sameEmail =
            Boolean(conf.contactEmail) &&
            Boolean(org.email) &&
            conf.contactEmail!.trim().toLowerCase() ===
              org.email!.trim().toLowerCase();

          return sameOrganizerId || sameEmail;
        }).length;
      };

      return organizers
        .filter((org) => !org.isSuspended)
        .sort((a, b) => {
          const aCount = getPublishedConferenceCount(a);
          const bCount = getPublishedConferenceCount(b);

          // Highest number of conferences first
          if (aCount !== bCount) {
            return bCount - aCount;
          }

          // If conference counts are equal, sort alphabetically
          return String(a.organizationName || "").localeCompare(
            String(b.organizationName || "")
          );
        });
    }, [organizers, approvedConferences]);

  const organizersScrollRef = useRef<HTMLDivElement>(null);

  const scrollOrganizers = (direction: "left" | "right") => {
    if (organizersScrollRef.current) {
      const scrollAmount = 340;
      organizersScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  // Filtered Conferences
  const filteredConferences = useMemo(() => {
    const list = approvedConferences.filter((c) => {
      let matchesSearch = false;
      const term = searchTerm.trim().toLowerCase();
      if (term === "") {
        matchesSearch = true;
      } else if (term.startsWith("/")) {
        const slashCountryName = term.slice(1).trim();
        if (slashCountryName === "") {
          matchesSearch = true;
        } else {
          matchesSearch = (c.country || "").toLowerCase().includes(slashCountryName);
        }
      } else {
        matchesSearch =
          (c.title || "").toLowerCase().includes(term) ||
          (c.shortTitle || "").toLowerCase().includes(term) ||
          (c.description || "").toLowerCase().includes(term) ||
          (c.seoKeywords || "").toLowerCase().includes(term) ||
          (c.city || "").toLowerCase().includes(term) ||
          (c.country || "").toLowerCase().includes(term);
      }

      const matchesCategory =
        selectedCategory === "All" ||
        c.category === selectedCategory ||
        topicsMapping[c.category] === selectedCategory ||
        reverseTopicsMapping[selectedCategory] === c.category;

      const matchesCountry =
        selectedCountry === "All" ||
        (c.country || "").trim().toLowerCase() === selectedCountry.trim().toLowerCase();

      const matchesCity =
        selectedCity === "All" ||
        (c.city || "").trim().toLowerCase() === selectedCity.trim().toLowerCase();

      const matchesLiveStatus =
        selectedLiveStatus === "All" ||
        c.liveStatus === selectedLiveStatus ||
        (selectedLiveStatus === LiveStatus.Upcoming && c.liveStatus === LiveStatus.Upcoming) ||
        (selectedLiveStatus === LiveStatus.Completed && c.liveStatus === LiveStatus.Completed);

      return matchesSearch && matchesCategory && matchesCountry && matchesCity && matchesLiveStatus;
    });

    const todayStr = new Date().toISOString().split("T")[0];

    // Hide all past dates (yesterday and earlier): only today and future dates are shown
    const activeList = list.filter((c) => (c.endDate || c.startDate || "").split("T")[0] >= todayStr);

    if (selectedLiveStatus === LiveStatus.Upcoming) {
      const upcomingList = activeList.filter((c) => (c.startDate || "").split("T")[0] > todayStr);
      upcomingList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return upcomingList;
    }

    if (sortBy === "Upcoming") {
      activeList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return activeList;
    } else if (sortBy === "Newest") {
      activeList.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
      return activeList;
    } else if (sortBy === "Latest") {
      activeList.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return activeList;
    }

    activeList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return activeList;
  }, [approvedConferences, searchTerm, selectedCategory, selectedCountry, selectedCity, selectedLiveStatus, sortBy]);

  const pageSize = 48;
  const totalPages = Math.ceil(filteredConferences.length / pageSize) || 1;
  const paginatedConferences = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredConferences.slice(start, start + pageSize);
  }, [filteredConferences, currentPage, pageSize]);

  // Dynamic calculation for right sidebar cards to match left main content height exactly without overflowing
  const visibleAssociates = useMemo(() => {
    if (!approvedAssociatesList || approvedAssociatesList.length === 0) return [];
    // In grid view (3 cols on lg screen), each card height ~320px.
    const rows = Math.ceil(paginatedConferences.length / 3);
    const gridEstimatedHeight = rows * 320 + 90;
    const maxCards = Math.max(1, Math.floor((gridEstimatedHeight - 50) / 135));
    return approvedAssociatesList.slice(0, Math.min(approvedAssociatesList.length, maxCards));
  }, [approvedAssociatesList, paginatedConferences.length]);

  // Top Featured Section
  const featuredConferences = useMemo(() => {
    return approvedConferences.filter((c) => c.isFeatured).slice(0, 3);
  }, [approvedConferences]);

  // Selected keyword for dynamic display
  const selectedKeyword = useMemo(() => {
    if (selectedCity !== "All") return selectedCity;
    if (selectedCountry !== "All") return selectedCountry;
    if (selectedCategory !== "All") return selectedCategory;
    if (searchTerm !== "") return searchTerm;
    return "World";
  }, [selectedCity, selectedCountry, selectedCategory, searchTerm]);

  // Dynamic page heading with required H1 formats
  const pageHeadingTitle = useMemo(() => {
    const hasCategory = selectedCategory !== "All";
    const hasCity = selectedCity !== "All";
    const hasCountry = selectedCountry !== "All";

    if (hasCategory && hasCity && hasCountry) {
      return `${selectedCategory} Conferences in ${selectedCity}, ${selectedCountry}`;
    }
    if (hasCategory && hasCity) {
      return `${selectedCategory} Conferences in ${selectedCity}`;
    }
    if (hasCategory && hasCountry) {
      return `${selectedCategory} Conferences in ${selectedCountry}`;
    }
    if (hasCategory) {
      return `${selectedCategory} Conferences`;
    }
    if (hasCity && hasCountry) {
      return `International Conferences in ${selectedCity}, ${selectedCountry}`;
    }
    if (hasCity) {
      return `International Conferences in ${selectedCity}`;const [footerContactInfo, setFooterContactInfo] = useState<ContactInfo>({ ...OFFICIAL_CONTACT_INFO });
    }
    if (hasCountry) {
      return `International Conferences in ${selectedCountry}`;
    }
    if (searchTerm !== "") {
      if (searchTerm.startsWith("/")) {
        const country = searchTerm.slice(1).trim();
        return country ? `International Conferences in ${country}` : "International Conferences";
      }
      return `${searchTerm} Conferences`;
    }
    return "International Conferences";
  }, [selectedCategory, selectedCity, selectedCountry, searchTerm]);

 // Dynamic filter description from Admin-controlled templates
const filterDescription = useMemo(() => {
  const hasCategory = selectedCategory !== "All";
  const hasCity = selectedCity !== "All";
  const hasCountry = selectedCountry !== "All";

  const replacePlaceholders = (template: string) => {
    return template
      .replace(/\{TOPIC\}/g, hasCategory ? selectedCategory : "")
      .replace(/\{CITY\}/g, hasCity ? selectedCity : "")
      .replace(/\{COUNTRY\}/g, hasCountry ? selectedCountry : "")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  // Topic + City + Country
  if (hasCategory && hasCity && hasCountry) {
    return replacePlaceholders(
      conferenceDescriptions.combined_description
    );
  }

// Topic + Country
if (hasCategory && hasCountry) {
  return replacePlaceholders(
    conferenceDescriptions.topic_country_description
  );
}

  // City selected
  if (hasCity) {
    return replacePlaceholders(
      conferenceDescriptions.city_description
    );
  }

  // Country selected
  if (hasCountry) {
    return replacePlaceholders(
      conferenceDescriptions.country_description
    );
  }

  // Topic selected
  if (hasCategory) {
    return replacePlaceholders(
      conferenceDescriptions.topic_description
    );
  }

  // No filter selected - keep existing default behavior
  return replacePlaceholders(
  conferenceDescriptions.default_description
);


}, [
  selectedCategory,
  selectedCity,
  selectedCountry,
  selectedKeyword,
  conferenceDescriptions
]);

  // Check if events have mens or not
  const hasMensEvents = useMemo(() => {
    return filteredConferences.some((c) => {
      const textToSearch = `${c.title} ${c.description} ${c.category} ${c.shortTitle} ${c.seoKeywords}`.toLowerCase();
      return textToSearch.includes("mens") || textToSearch.includes("men's") || textToSearch.includes("men ");
    });
  }, [filteredConferences]);

      const activeBannersList = useMemo(() => {
      if (!banners || banners.length === 0) {
        return [];
      }

      const seen = new Set<string>();
      const unique: Banner[] = [];

      for (const item of banners) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }

      return unique
        .sort(
          (a, b) =>
            (Number(a.place ?? a.order) || 999) -
            (Number(b.place ?? b.order) || 999)
        )
        .slice(0, 5);
    }, [banners]);

  // Filter ONLY Approved banner content entries
  const approvedBannerContents = useMemo(() => {
    if (!bannerContents || bannerContents.length === 0) return [];
    return bannerContents.filter((bc) => bc.status === "Approved" || bc.status === "Active");
  }, [bannerContents]);

  // Find the corresponding title and description for current slide's banner
  const currentBannerContent = useMemo(() => {
    const currentBanner = activeBannersList && activeBannersList.length > 0
      ? activeBannersList[currentSlide % activeBannersList.length]
      : null;

    if (!currentBanner) {
      return approvedBannerContents.length > 0 ? approvedBannerContents[0] : null;
    }

    // 1. Priority: Banner's own title and description set directly on the banner
    if (currentBanner.title || currentBanner.description) {
      return {
        id: `direct-${currentBanner.id}`,
        bannerId: currentBanner.id,
        title: currentBanner.title || "International Academic Conferences",
        description: currentBanner.description || "Browse vetted international conferences, submit research papers, and connect with academic societies worldwide.",
        status: "Approved" as const
      };
    }

    // 2. Look for an approved banner content entry linked specifically to this banner's ID
    const linkedApproved = approvedBannerContents.find((bc) => bc.bannerId === currentBanner.id);
    if (linkedApproved) {
      return linkedApproved;
    }

    // 3. Fallback to unlinked approved content
    const unlinked = approvedBannerContents.find((bc) => !bc.bannerId);
    if (unlinked) return unlinked;

    return null;
  }, [currentSlide, activeBannersList, approvedBannerContents]);

  // Auto scroll effects
  useEffect(() => {
    if (!activeBannersList || activeBannersList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBannersList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBannersList]);

  const approvedFeedbacksList = useMemo(() => {
    const list: UserFeedback[] = userFeedbacks || [];
    const activeOnly = list.filter(
      (f) => Boolean(f)
    );
    const seen = new Set<string>();
    const unique: UserFeedback[] = [];
    for (const item of activeOnly) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }, [userFeedbacks]);

  // Helper to shuffle feedback list randomly (Fisher-Yates)
  const shuffleFeedbackList = (list: UserFeedback[]): UserFeedback[] => {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize and synchronize shuffled feedbacks pool from ALL approved feedbacks
  useEffect(() => {
    if (approvedFeedbacksList.length > 0) {
      setShuffledFeedbacksPool(
        shuffleFeedbackList(approvedFeedbacksList).slice(0, 10)
      );
      setHomeFeedbackScrollIndex(0);
    } else {
      setShuffledFeedbacksPool([]);
      setHomeFeedbackScrollIndex(0);
    }
  }, [approvedFeedbacksList]);

  // Auto-scroll carousel one-by-one continuously through the entire shuffled pool
  useEffect(() => {
    if (shuffledFeedbacksPool.length <= 1 || isHomeFeedbackHovered) return;
    const interval = setInterval(() => {
      setHomeFeedbackScrollIndex((prev) => (prev + 1) % shuffledFeedbacksPool.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [shuffledFeedbacksPool.length, isHomeFeedbackHovered]);

  // Current single active feedback in the carousel
  const currentHomeFeedback = useMemo(() => {
    if (shuffledFeedbacksPool.length === 0) return null;
    return shuffledFeedbacksPool[homeFeedbackScrollIndex % shuffledFeedbacksPool.length];
  }, [shuffledFeedbacksPool, homeFeedbackScrollIndex]);

  const handleManualScrollFeedback = (direction: "left" | "right") => {
    if (shuffledFeedbacksPool.length <= 1) return;
    const total = shuffledFeedbacksPool.length;
    if (direction === "left") {
      setHomeFeedbackScrollIndex((prev) => (prev - 1 + total) % total);
    } else {
      setHomeFeedbackScrollIndex((prev) => (prev + 1) % total);
    }
  };

  // Dedicated Testimonials / Feedback Page filtered feedbacks list
  const filteredAllFeedbacks = useMemo(() => {
    return approvedFeedbacksList.filter((fb) => {
      if (feedbackRatingFilter !== "ALL") {
        const targetRating = Number(feedbackRatingFilter);
        if ((fb.rating || 5) !== targetRating) return false;
      }
      if (feedbackSearchQuery.trim()) {
        const q = feedbackSearchQuery.toLowerCase().trim();
        const matchName = fb.name?.toLowerCase().includes(q);
        const matchText = fb.text?.toLowerCase().includes(q);
        const matchCountry = fb.country?.toLowerCase().includes(q);
        if (!matchName && !matchText && !matchCountry) return false;
      }
      return true;
    });
  }, [approvedFeedbacksList, feedbackSearchQuery, feedbackRatingFilter]);

  const feedbackItemsPerPage = 48;
  const feedbackTotalPages = Math.max(1, Math.ceil(filteredAllFeedbacks.length / feedbackItemsPerPage));
  const paginatedFeedbacks = useMemo(() => {
    const start = (feedbackPage - 1) * feedbackItemsPerPage;
    return filteredAllFeedbacks.slice(start, start + feedbackItemsPerPage);
  }, [filteredAllFeedbacks, feedbackPage]);

  useEffect(() => {
    setFeedbackPage(1);
  }, [feedbackSearchQuery, feedbackRatingFilter]);

  useEffect(() => {
    if (feedbackPage > feedbackTotalPages) setFeedbackPage(feedbackTotalPages);
  }, [feedbackPage, feedbackTotalPages]);

  const feedbackMetrics = useMemo(() => {
    const total = approvedFeedbacksList.length;
    if (total === 0) return { average: "5.0", fiveStars: 0, fiveStarPct: 100, fourPlus: 0 };
    const sum = approvedFeedbacksList.reduce((acc, f) => acc + (f.rating || 5), 0);
    const avg = (sum / total).toFixed(1);
    const fiveStars = approvedFeedbacksList.filter((f) => (f.rating || 5) === 5).length;
    const fourPlus = approvedFeedbacksList.filter((f) => (f.rating || 5) >= 4).length;
    const fiveStarPct = Math.round((fiveStars / total) * 100);
    return { average: avg, fiveStars, fiveStarPct, fourPlus };
  }, [approvedFeedbacksList]);

  const handleCountryClick = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity("All");
    if (onTabChange) {
      onTabChange("EVENTS");
    } else {
      const target = document.getElementById("all-conferences");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleCityClick = (city: string, country?: string) => {
    setSelectedCity(city);
    if (country) {
      setSelectedCountry(country);
    }
    if (onTabChange) {
      onTabChange("EVENTS");
    } else {
      const target = document.getElementById("all-conferences");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleTopicClick = (topic: string) => {
    const mappedCat = topicsMapping[topic] || topic;
    setSelectedCategory(mappedCat);
    if (onTabChange) {
      onTabChange("EVENTS");
    } else {
      const target = document.getElementById("all-conferences");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Stats calculation
  const dynamicStats = useMemo(() => {
    const verifiedCount = approvedConferences.length;
    const liveCount = approvedConferences.filter((c) => c.liveStatus === LiveStatus.Ongoing).length;
    
    const uniqueCountriesSet = new Set([
      ...approvedConferences.map((c) => c.country).filter(Boolean),
      ...adminCountries.filter(Boolean)
    ]);
    const countriesCount = uniqueCountriesSet.size;
    
    const activeOrganizers = organizers.filter((o) => !o.isSuspended);
    const organizersCount = activeOrganizers.length;

    return {
      verified: `${verifiedCount}`,
      live: liveCount,
      countries: `${countriesCount}`,
      organizers: `${organizersCount}`,
    };
  }, [approvedConferences, adminCountries, organizers]);

  const getCountryEmoji = (countryName: string) => {
    const flags: Record<string, string> = {
      "United States": "🇺🇸",
      "Japan": "🇯🇵",
      "United Kingdom": "🇬🇧",
      "Singapore": "🇸🇬",
      "Switzerland": "🇨🇭",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Australia": "🇦🇺",
      "Canada": "🇨🇦",
      "Sweden": "🇸🇪",
      "Norway": "🇳🇴",
      "Finland": "🇫🇮",
      "Denmark": "🇩🇰",
      "New Zealand": "🇳🇿",
    };
    return flags[countryName] || "🌐";
  };

  const getTopicIcon = (topic: string) => {
    const icons: Record<string, any> = {
      "Business & Economics": Briefcase,
      "Business, Finance & Fintech": Briefcase,
      "Health & Medicine": Heart,
      "Medical & Health Sciences": Heart,
      "Mathematics & Statistics": BarChart3,
      "Engineering & Technology": Building2,
      "Civil & Mechanical Engineering": Building2,
      "Computer Science": Cpu,
      "Information Technology & Security": Cpu,
      "Artificial Intelligence": Brain,
      "Artificial Intelligence & ML": Brain,
      "Education": GraduationCap,
      "Education & EdTech": GraduationCap,
      "Environmental Science": Leaf,
      "Environmental Science & Sustainability": Leaf,
      "Social Sciences & Humanities": Users,
      "Physics & Astronomy": Zap,
      "Chemistry & Materials Science": Microscope,
    };
    return icons[topic] || BookOpen;
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) return;

    setNewsletterError("");
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newSub: SubscriberItem = {
      id: `sub-${Date.now()}`,
      email: email,
      date: formattedDate,
    };

    const result = await saveRecordToSupabase("subscriber_emails", newSub);
    if (!result.success) {
      const duplicate = /duplicate|unique|already exists/i.test(result.error || "");
      setNewsletterError(duplicate ? "This email is already subscribed to our newsletter!" : "Subscription failed. Please try again.");
      return;
    }

    // Avoid downloading the entire subscriber table to every public visitor.
    if (onUpdateSubscriberEmails) onUpdateSubscriberEmails([newSub]);

    setNewsletterSubscribed(true);
    setNewsletterEmail("");
    setTimeout(() => setNewsletterSubscribed(false), 5000);
  };

  return (
    <div className="space-y-10 sm:space-y-12 md:space-y-16 lg:space-y-20 w-full min-w-0">
      
      {tab === "HOME" && (
        <>
          {/* Hero Carousel Banner Section */}
        <section
        id="home"
        className="relative w-full min-w-0 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl min-h-[430px] sm:min-h-[440px] md:min-h-[480px] lg:min-h-[520px] flex items-center bg-slate-900"
      >
        {/* Carousel Slide Images */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            {activeBannersList && activeBannersList.length > 0 ? (
              <motion.div
                key={activeBannersList[currentSlide % activeBannersList.length]?.id || `slide-${currentSlide}`}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 w-full h-full"
              >
                <img
                  src={activeBannersList[currentSlide % activeBannersList.length]?.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"}
                  alt={activeBannersList[currentSlide % activeBannersList.length]?.title || "Conference Banner"}
                  className="w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-indigo-900" />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/35 to-transparent" />
        </div>

          {/* Hero Overlay Content */}
        <div className="relative z-10 w-full min-w-0 px-4 py-10 sm:px-6 sm:py-12 md:px-10 md:py-14 lg:px-12 text-white flex flex-col items-center justify-center text-center gap-4 sm:gap-5">
          <div className="space-y-2">
            <h1 className="text-[1.75rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-display tracking-tight max-w-5xl mx-auto line-clamp-3 sm:line-clamp-2 break-words">
              {currentBannerContent?.title ? (
                currentBannerContent.title
              ) : (
                <>Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">International</span> Conferences</>
              )}
            </h1>
            <p className="text-slate-100 text-sm leading-6 sm:text-base sm:leading-7 md:text-lg lg:text-xl max-w-3xl mx-auto font-medium line-clamp-3 sm:line-clamp-2 px-1">
              {currentBannerContent?.description ? (
                currentBannerContent.description
              ) : (
                "Find and connect with academic, professional, and technology conferences worldwide. All listings are verified for index and quality."
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="w-full sm:w-auto flex flex-col min-[420px]:flex-row sm:flex-row justify-center items-stretch sm:items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                if (onTabChange) {
                  onTabChange("EVENTS");
                }
                setTimeout(() => {
                  const target = document.getElementById("all-conferences");
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }, 50);
              }}
              className="w-full sm:w-auto min-h-11 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all border border-blue-500 hover:border-blue-600 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm md:text-base"
            >
              Explore Conferences <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (onLoginClick) onLoginClick();
              }}
              className="w-full sm:w-auto min-h-11 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/30 hover:border-white/55 flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base cursor-pointer"
            >
              Submit a Conference
            </button>
          </div>

          {/* Search Box on Hero */}
          <div className="w-full max-w-2xl min-w-0 mx-auto bg-slate-900/60 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-white/10 shadow-lg mt-1 sm:mt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:flex-1 min-w-0 min-h-11 flex items-center px-3 gap-2.5 bg-white/5 rounded-xl border border-white/5">
                <Search className="h-4 w-4 text-blue-300 shrink-0" />
                <input
                  type="text"
                  placeholder="Search conferences, or try /INDIA for country spotlight..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (onTabChange && currentTab !== "EVENTS") {
                      onTabChange("EVENTS");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (onTabChange) onTabChange("EVENTS");
                      setTimeout(() => {
                        const target = document.getElementById("all-conferences");
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }
                  }}
                  className="w-full bg-transparent border-none py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 text-xs sm:text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (onTabChange) onTabChange("EVENTS");
                  setIsFilterOpen(true);
                  setTimeout(() => {
                    const target = document.getElementById("all-conferences");
                    if (target) target.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        {activeBannersList && activeBannersList.length > 1 && (
          <div className="absolute bottom-3 right-4 sm:bottom-5 sm:right-6 flex gap-2 z-10">
            {activeBannersList.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                  (currentSlide % activeBannersList.length) === i ? "bg-blue-500 w-6" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Statistics Section */}
      <section className="relative z-10 mt-0 sm:-mt-4 md:-mt-6 lg:-mt-10">
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <div className="bg-white border border-slate-150 hover:border-blue-300 rounded-2xl p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Award className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{dynamicStats.verified}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans leading-tight">Verified Conferences</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 hover:border-emerald-300 rounded-2xl p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{dynamicStats.live}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans leading-tight">Live Conferences</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 hover:border-indigo-300 rounded-2xl p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{dynamicStats.countries}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans leading-tight">Countries Available</div>
            </div>
          </div>

          <div className="bg-white border border-slate-150 hover:border-purple-300 rounded-2xl p-3.5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900">{dynamicStats.organizers}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans leading-tight">Trusted Organizers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Controlled Home Main Description */}
        {homeMainDescription && (
          <section className="w-full">
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-5 sm:px-7 sm:py-6 shadow-sm">
              <p className="text-sm sm:text-base text-slate-600 leading-7 text-justify">
                {homeMainDescription}
              </p>
            </div>
          </section>
        )}



      {/* International Conference Countries */}
      <section className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-start sm:items-center gap-2 leading-tight">
              <Globe className="h-6 w-6 text-blue-600" /> International Conference Countries
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Browse and filter academic conferences hosted by verified physical locations dynamically.
            </p>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={countrySearchQuery}
              onChange={(e) => setCountrySearchQuery(e.target.value)}
              placeholder="Search Country..."
              className="w-full pl-9 pr-8 py-2.5 text-xs border-2 border-slate-300 rounded-xl bg-white shadow-sm transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 focus:shadow-md"
            />
            {countrySearchQuery && (
              <button
                onClick={() => setCountrySearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredCountriesList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 border border-dashed border-slate-200 text-xs font-medium">
            No countries found matching "{countrySearchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredCountriesList.map((country, cIdx) => (
              <motion.button
                key={`${country}-${cIdx}`}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCountryClick(country)}
                className={`p-3 sm:p-3.5 min-h-[72px] rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-xs ${
                  selectedCity === "All" && selectedCountry === country
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-150 text-slate-800 hover:border-blue-300"
                }`}
              >
                <span className="text-2xl shrink-0">{getCountryEmoji(country)}</span>
                <div className="truncate min-w-0">
                  <p className="font-bold text-xs md:text-sm truncate">{country}</p>
                  <p className={`text-[10px] ${selectedCity === "All" && selectedCountry === country ? "text-blue-100" : "text-slate-400"} font-medium`}>
                    {approvedConferences.filter((c) => c.country === country).length} Events
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* International Conference Cities */}
      <section className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-start sm:items-center gap-2 leading-tight">
              <Building2 className="h-6 w-6 text-emerald-600" /> International Conference Cities
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-5 sm:leading-6">
              Browse conferences by city. Click any city to view all conferences held in that location.
            </p>
          </div>
          <div className="relative w-full sm:w-64 md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={citySearchQuery}
              onChange={(e) => setCitySearchQuery(e.target.value)}
              placeholder="Search City..."
              className="w-full pl-9 pr-8 py-2.5 text-xs border-2 border-slate-300 rounded-xl bg-white shadow-sm transition-all duration-300 hover:border-emerald-400 hover:shadow-md focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/15 focus:shadow-md"/>
            {citySearchQuery && (
              <button
                onClick={() => setCitySearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredCitiesList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 border border-dashed border-slate-200 text-xs font-medium">
            No cities found matching "{citySearchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredCitiesList.map((item, cIdx) => {
              const count = getCityConferenceCount(item.cityName, item.countryName);
              const isSelected = selectedCity === item.cityName && (selectedCountry === "All" || selectedCountry === item.countryName);

              return (
                <motion.button
                  key={`${item.cityName}-${item.countryName}-${cIdx}`}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCityClick(item.cityName, item.countryName)}
                  className={`p-3 sm:p-3.5 min-h-[86px] rounded-xl sm:rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-slate-150 text-slate-800 hover:border-emerald-300"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="truncate min-w-0 flex-1">
                    <p className="font-bold text-xs md:text-sm truncate leading-snug">{item.cityName}</p>
                    <p className={`text-[11px] truncate font-medium ${
                      isSelected ? "text-emerald-100" : "text-slate-500"
                    }`}>
                      {item.countryName}
                    </p>
                    <p className={`text-[10px] ${
                      isSelected ? "text-emerald-100" : "text-slate-400"
                    } font-medium mt-0.5`}>
                      {count === 1 ? "1 Conference" : `${count} Conferences`}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* International Conference Topics */}
      <section className="space-y-4 sm:space-y-5 md:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display flex items-start sm:items-center gap-2 leading-tight">
              <BookOpen className="h-6 w-6 text-indigo-600" /> International Conference Topics
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-5 sm:leading-6">
              Explore diverse topics and research fields available in event filter categories.
            </p>
          </div>
          <div className="relative w-full sm:w-64 md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={topicSearchQuery}
              onChange={(e) => setTopicSearchQuery(e.target.value)}
              placeholder="Search Topic..."
              className="w-full pl-9 pr-8 py-2.5 text-xs border-2 border-slate-300 rounded-xl bg-white shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-md focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 focus:shadow-md"/>
            {topicSearchQuery && (
              <button
                onClick={() => setTopicSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredTopicsList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 border border-dashed border-slate-200 text-xs font-medium">
            No topics found.
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {filteredTopicsList.map((topic, tIdx) => {
              const IconComponent = getTopicIcon(topic);
              const mappedCat = topicsMapping[topic] || topic;
              const isSelected = selectedCategory === topic || selectedCategory === mappedCat;
              const matchingCount = approvedConferences.filter(
                (c) => c.category === topic || c.category === mappedCat
              ).length;

              return (
                <motion.button
                  key={`${topic}-${tIdx}`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTopicClick(topic)}
                  className={`p-3 sm:p-3.5 min-h-[82px] rounded-xl sm:rounded-2xl border text-left flex items-start gap-2 sm:gap-2.5 transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-150 text-slate-800 hover:border-indigo-300"
                  }`}
                >
                  <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                    <IconComponent className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-bold text-xs sm:text-sm leading-snug break-words">{topic}</p>
                    <p className={`text-[9px] sm:text-[10px] ${isSelected ? "text-indigo-100" : "text-slate-400"} font-medium`}>
                      {matchingCount} {matchingCount === 1 ? "Conference" : "Conferences"}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>

      {/* Trusted Organizers */}
      <section
          id="organizers"
          className="scroll-mt-24 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-sm space-y-5 sm:space-y-6 min-w-0"
        >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">Verified Institutions</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 font-display flex items-center gap-2 leading-tight">
              <Users className="h-6 w-6 text-blue-600" /> Trusted Organizers
            </h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Browse verified academic institutions, scientific societies, and professional boards hosting events globally. Click any card to view their complete profile.
            </p>
          </div>
        </div>

        {trustedOrganizersList.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl text-slate-400 border border-dashed border-slate-200">
            No organizers available at this moment.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {trustedOrganizersList.slice(0, 8).map((org, oIdx) => {
                const count = approvedConferences.filter((conf) => {
                  const sameOrganizerId = conf.organizerId === org.id;

                  const sameEmail =
                    Boolean(conf.contactEmail) &&
                    Boolean(org.email) &&
                    conf.contactEmail!.trim().toLowerCase() ===
                      org.email!.trim().toLowerCase();

                  return sameOrganizerId || sameEmail;
                }).length;
                return (
                  <motion.div
                    key={org.id ? `${org.id}-${oIdx}` : `org-${oIdx}`}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectOrganizer(org.id)}
                    className="group bg-white border border-slate-200 hover:border-blue-300 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 text-center hover:shadow-md transition-all flex flex-col justify-between items-center gap-3 sm:gap-4 cursor-pointer relative h-full min-w-0"
                  >
                    <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-150 shadow-xs shrink-0 bg-slate-50 flex items-center justify-center">
                      {(() => {
                        const logoUrl = getCleanImageSrc(org.logo, "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80");
                        return (
                          <img
                            src={logoUrl}
                            alt={org.organizationName}
                            className="h-full w-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                        );
                      })()}
                      {getIsOrganizerTrusted(org) && (
                        <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-0.5 sm:p-1 rounded-full border-2 border-white shadow-md" title="Trusted & Verified Organizer">
                          <ShieldCheck className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-center w-full">
                      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-xs sm:text-sm leading-snug break-words">
                          {org.organizationName}
                        </h3>
                        {getIsOrganizerTrusted(org) && (
                          <span className="text-blue-600 shrink-0" title="Trusted Badge">
                            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </span>
                        )}
                      </div>
                      {org.city || org.country ? (
                        <p className="text-[10px] sm:text-xs text-slate-400 flex items-center justify-center gap-0.5 sm:gap-1 font-medium">
                          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 shrink-0" />
                          <span>{[org.city, org.country].filter(Boolean).join(", ")}</span>
                        </p>
                      ) : null}
                      <p className="text-[9px] sm:text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full w-fit mx-auto mt-1 sm:mt-2 border border-blue-100">
                        {count} {count === 1 ? "Conference" : "Conferences"}
                      </p>
                    </div>

                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium break-words">
                      {(() => {
                        const text = org.aboutOrganization || "Verified academic system hosting premium indexes and journal partnerships.";
                        return text.length > 200 ? `${text.slice(0, 200)}...` : text;
                      })()}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrganizer(org.id);
                      }}
                      className="w-full py-1.5 sm:py-2.5 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white text-slate-700 font-bold rounded-xl text-[11px] sm:text-xs transition-all border border-slate-200 group-hover:border-blue-600 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 mt-1 sm:mt-2"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={() => {
                  if (onTabChange) {
                    onTabChange("ORGANIZERS");
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/15 flex items-center gap-2 cursor-pointer"
              >
                <span>View More Organizers</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
        </>
      )}

      {/* EVENTS PAGE */}
      {tab === "EVENTS" && (
        /* All Conferences Section */
        <section id="all-conferences" className="scroll-mt-24 space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
        <div className="space-y-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Conference Directory</span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-1 leading-tight break-words">
                {pageHeadingTitle}
              </h1>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                Currently showing {filteredConferences.length} approved {filteredConferences.length === 1 ? "conference" : "conferences"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Active Filter Badges */}
              {selectedCategory !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
                  Topic: {selectedCategory}
                  <button onClick={() => setSelectedCategory("All")} className="hover:text-blue-900 font-bold ml-1 cursor-pointer">✕</button>
                </span>
              )}
              {selectedCountry !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
                  Country: {selectedCountry}
                  <button onClick={() => setSelectedCountry("All")} className="hover:text-indigo-900 font-bold ml-1 cursor-pointer">✕</button>
                </span>
              )}
              {selectedCity !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-semibold">
                  City: {selectedCity}
                  <button onClick={() => setSelectedCity("All")} className="hover:text-violet-900 font-bold ml-1 cursor-pointer">✕</button>
                </span>
              )}
              {selectedLiveStatus !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
                  Status: {selectedLiveStatus}
                  <button onClick={() => setSelectedLiveStatus("All")} className="hover:text-amber-900 font-bold ml-1 cursor-pointer">✕</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="hover:text-slate-900 font-bold ml-1 cursor-pointer">✕</button>
                </span>
              )}

              {/* Clear All Filters Button */}
              {(selectedCategory !== "All" || selectedCountry !== "All" || selectedCity !== "All" || selectedLiveStatus !== "All" || searchTerm !== "" || sortBy !== "Upcoming") && (
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedCountry("All");
                    setSelectedCity("All");
                    setSelectedLiveStatus("All");
                    setSearchTerm("");
                    setSortBy("Upcoming");
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 px-3 py-1 rounded-lg border border-red-100 transition-colors cursor-pointer"
                >
                  Clear All Filters ✕
                </button>
              )}
            </div>
          </div>

          <p className="text-slate-600 text-xs md:text-sm leading-relaxed max-w-5xl">
            {filterDescription}
          </p>
        </div>

        <div className="flex flex-col gap-8 w-full">
          {/* Top horizontal filter bar - Fixed sticky positioning right below top navbar */}
          <div className="sticky top-[64px] sm:top-[68px] z-30 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md space-y-3 transition-all duration-300 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                {/* Fixed Filter Button */}
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
                >
                  <Filter className="h-4 w-4 text-white" />
                  <span>Filters</span>
                  <SlidersHorizontal className="h-3.5 w-3.5 opacity-80" />
                </button>

                <h3 className="font-bold text-slate-800 text-xs sm:text-sm hidden sm:flex items-center gap-1.5">
                  Refine Search
                </h3>
              </div>

              {/* Quick Search Input inside sticky bar */}
              <div className="relative w-full sm:flex-1 sm:max-w-sm md:max-w-md min-w-0">
                <input
                  type="text"
                  placeholder="Search titles, or use /INDIA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-white border-2 border-slate-300 rounded-xl pl-8 pr-7 py-2.5 text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-400 hover:shadow-md focus:border-blue-600 focus:ring-4 focus:ring-blue-500/15 focus:shadow-md focus:outline-none"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Active Filter Badges / Quick Clear */}
              {(selectedCategory !== "All" || selectedCountry !== "All" || selectedCity !== "All" || selectedLiveStatus !== "All") && (
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setSelectedCountry("All");
                    setSelectedCity("All");
                    setSelectedLiveStatus("All");
                    setSearchTerm("");
                    setSortBy("Upcoming");
                  }}
                  className="text-[11px] text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-100 transition-colors shrink-0 cursor-pointer hidden md:block"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Filter Dropdowns Grid - Collapsible / Expandable on Filter Button Click */}
            {isFilterOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topic</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Topics</option>
                    {activeCategories.map((cat, idx) => {
                      const topicName = topicsMapping[cat.name] || cat.name;

                      return (
                        <option key={`${cat.id || topicName}-${idx}`} value={topicName}>
                          {topicName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      const cnt = e.target.value;
                      setSelectedCountry(cnt);
                      if (cnt !== "All" && selectedCity !== "All") {
                        const adminValidCities = adminCities.filter((c) => c.country.trim().toLowerCase() === cnt.trim().toLowerCase()).map((c) => c.name);
                        const dbCities = approvedConferences.filter((c) => (c.country || "").trim().toLowerCase() === cnt.trim().toLowerCase()).map((c) => c.city);
                        const allValid = new Set([...adminValidCities, ...dbCities].map((s) => (s || "").trim().toLowerCase()));
                        if (!allValid.has(selectedCity.trim().toLowerCase())) {
                          setSelectedCity("All");
                        }
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {countriesDropdown.map((c, idx) => (
                      <option key={`${c}-${idx}`} value={c}>
                        {c === "All" ? "All Countries" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">City</label>
                  <select
                    value={selectedCountry === "All" ? "All Cities (Select Country First)" : selectedCity}
                    disabled={selectedCountry === "All" || !selectedCountry}
                    onChange={(e) => {
                      const ct = e.target.value;
                      setSelectedCity(ct);
                    }}
                    className={`w-full text-xs border rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                      selectedCountry === "All" || !selectedCountry
                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
                    }`}
                  >
                    {citiesDropdown.map((c, idx) => (
                      <option key={`${c}-${idx}`} value={c}>
                        {c === "All" ? "All Cities" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Event Status</label>
                  <select
                    value={selectedLiveStatus}
                    onChange={(e) => setSelectedLiveStatus(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="All">All Active Statuses</option>
                    <option value={LiveStatus.Upcoming}>Upcoming</option>
                    <option value={LiveStatus.Ongoing}>Ongoing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "Upcoming" | "Newest" | "Latest")}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="Upcoming">Date Order (Today Onwards)</option>
                    <option value="Newest">Newest Added</option>
                    <option value="Latest">Latest Event Date</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area: Directory Grid Container */}
          <div className="w-full">
            {/* Conference Directory Container */}
            <div className="w-full min-w-0 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 md:p-5 shadow-xs flex flex-col justify-between gap-5 sm:gap-6">
              <div className="space-y-6 flex-1">
                {/* Subheading displaying count after filter */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                    <span>
                      {filteredConferences.length > 0
                        ? `Currently showing ${filteredConferences.length} approved ${filteredConferences.length === 1 ? "conference" : "conferences"}`
                        : "Currently showing 0 approved conferences"}
                    </span>
                  </h3>
                </div>

                {isSlashSearch && slashCountryLabel && (
                  <div className="p-8 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl relative overflow-hidden border border-blue-800/50">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
                        <Globe className="h-4 w-4 animate-spin-slow" /> Regional Spotlight Directory
                      </div>
                      <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-white">
                        Top International Conferences in {slashCountryLabel}
                      </h3>
                      <p className="text-blue-100/80 text-sm max-w-3xl leading-relaxed">
                        Explore verified, peer-reviewed, and high-impact academic conferences, research symposiums, and professional summits taking place in {slashCountryLabel}. All listed events undergo rigorous vetting by International Conference to ensure credential legitimacy, past record authenticity, and index authority.
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-blue-200/90 font-medium">
                        <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Active International Conference Auditing
                        </span>
                        <span className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                          Showing {filteredConferences.length} {filteredConferences.length === 1 ? "event" : "events"} in {slashCountryLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {filteredConferences.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto" />
                    <p className="text-slate-800 font-bold text-lg">
                      {selectedCountry !== "All"
                        ? `No conferences available for ${selectedCountry}.`
                        : selectedCategory !== "All"
                        ? `No conferences available for topic "${selectedCategory}".`
                        : "No conferences found matching your filters."}
                    </p>
                    <p className="text-slate-400 text-sm">Try resetting filters to explore other options.</p>
                    <button
                      onClick={() => {
                        setSelectedCategory("All");
                        setSelectedCountry("All");
                        setSelectedCity("All");
                        setSelectedLiveStatus("All");
                        setSearchTerm("");
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
                    >
                      View All Conferences
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grid View: 2 columns on mobile, 2 on sm, 3 on md, 4 on lg */}
                    <div className="grid grid-cols-1 min-[520px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                      {paginatedConferences.map((conf, confIdx) => {
                        const org = organizers.find((o) => o.id === conf.organizerId);
                        const orgName = org ? org.organizationName : "Verified Organizer";
                        const confSlug = getConferenceSlug(conf, conferences);
                        const confUrl = `/conference/${confSlug}`;
                        const isCompleted = conf.liveStatus === LiveStatus.Completed;
                        return (
                          <motion.div
                            key={conf.id ? `${conf.id}-${confIdx}` : `conf-${confIdx}`}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={isCompleted ? {} : { y: -4 }}
                            onClick={isCompleted ? (e) => e.preventDefault() : () => {
                              window.open(confUrl, "_blank");
                            }}
                            className={`group bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col h-full min-w-0 relative transition-all duration-300 ${
                              isCompleted ? "opacity-75 bg-slate-50 cursor-not-allowed" : "hover:border-blue-500 shadow-xs hover:shadow-lg cursor-pointer"
                            }`}
                          >
                              {/* Card Content */}
                              <div className="p-3.5 sm:p-4 md:p-4.5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                                <div className="space-y-2.5 sm:space-y-3">
                                  {/* Badges Row & Category Badge */}
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-block text-[9px] sm:text-[10px] font-extrabold bg-indigo-50/90 text-indigo-700 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg tracking-wider uppercase">
                                        {conf.category}
                                      </span>

                                      <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs shrink-0 ${
                                        conf.liveStatus === LiveStatus.Ongoing
                                          ? "bg-emerald-500 text-white"
                                          : conf.liveStatus === LiveStatus.Upcoming
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-600 text-white"
                                      }`}>
                                        {conf.liveStatus}
                                      </span>

                                      {conf.attendanceType && (
                                        <span className="text-[9px] sm:text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-full shrink-0">
                                          {conf.attendanceType}
                                        </span>
                                      )}
                                    </div>

                                    {conf.isVerified && (
                                      <span className="text-[9px] sm:text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 shadow-2xs">
                                        <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" /> Verified
                                      </span>
                                    )}
                                  </div>

                                  {/* Conference Title & Description & Posted by Organizer */}
                                  <div className="space-y-1.5">
                                    <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-xs sm:text-sm leading-snug break-words font-display">
                                      {conf.title}
                                    </h3>
                                    <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed break-words whitespace-pre-line line-clamp-2 font-normal">
                                      {conf.description && conf.description.length > 180
                                        ? `${conf.description.slice(0, 180)}...`
                                        : conf.description}
                                    </p>
                                    
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] sm:text-[11px] font-medium pt-1">
                                      <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                      <span className="break-words">Hosted by <strong className="text-slate-800 font-semibold">{orgName}</strong></span>
                                    </div>
                                  </div>
                                </div>

                                {/* Colored Info Boxes for Date & Location */}
                                <div className="space-y-2 pt-2.5 border-t border-slate-100">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    <div className="bg-blue-50/80 border border-blue-100/90 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] sm:text-[11px] text-blue-900 font-bold truncate">
                                      <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      <span className="truncate">{formatConferenceDate(conf.startDate)}</span>
                                    </div>
                                    <div className="bg-emerald-50/80 border border-emerald-100/90 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-900 font-bold truncate">
                                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span className="truncate">{conf.city}, {conf.country}</span>
                                    </div>
                                  </div>

                                  {isCompleted ? (
                                    <button
                                      disabled
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full py-2 bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px] sm:text-xs cursor-not-allowed text-center"
                                    >
                                      Conference Completed
                                    </button>
                                  ) : (
                                    <a
                                      href={confUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-[11px] sm:text-xs transition-all shadow-xs hover:shadow-md flex items-center justify-center gap-1.5 cursor-pointer group/btn text-center"
                                    >
                                      <span>View More</span>
                                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover/btn:translate-x-1" />
                                    </a>
                                  )}
                                </div>
                              </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status summary & Pagination Controls - matching Media Partners & Our Associates layout */}
              {filteredConferences.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200/80 mt-auto">
                  {/* Status summary */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Showing {filteredConferences.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredConferences.length)} of {filteredConferences.length} Conferences</span>
                    <span className="font-semibold text-slate-700">Page {currentPage} of {totalPages}</span>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          setCurrentPage((prev) => Math.max(prev - 1, 1));
                          const target = document.getElementById("all-conferences");
                          if (target) target.scrollIntoView({ behavior: "smooth" });
                        }}
                        disabled={currentPage === 1}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </button>

                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              const target = document.getElementById("all-conferences");
                              if (target) target.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`h-9 min-w-9 px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                          const target = document.getElementById("all-conferences");
                          if (target) target.scrollIntoView({ behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-2xs"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
      )}

      {/* HOME PAGE (CONTINUED) */}
      {tab === "HOME" && (
        <>
          {/* Customer Feedback Testimonials - Single-Card Shuffled Auto-sliding Carousel */}
      <section
        className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-6 sm:p-8 md:p-10 space-y-8 shadow-sm"
        onMouseEnter={() => setIsHomeFeedbackHovered(true)}
        onMouseLeave={() => setIsHomeFeedbackHovered(false)}
      >
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10 text-center md:text-left">
        <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Community Reviews</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              What Our Community Says
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl leading-relaxed">
              Real feedback shared by researchers, academics, organizers, and conference attendees from around the world.
            </p>
          </div>

          {/* Controls: Active Slide Counter & Step Controls */}
          {shuffledFeedbacksPool.length > 0 && (
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                {shuffledFeedbacksPool.length <= 1
                  ? `${shuffledFeedbacksPool.length} Review`
                  : `${(homeFeedbackScrollIndex % shuffledFeedbacksPool.length) + 1} / ${shuffledFeedbacksPool.length}`}
              </span>

              {shuffledFeedbacksPool.length > 1 && (
                <>
                  <button
                    onClick={() => handleManualScrollFeedback("left")}
                    aria-label="Previous testimonial"
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleManualScrollFeedback("right")}
                    aria-label="Next testimonial"
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all hover:shadow-md active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Single-Card Carousel Stage */}
        <div 
          className="relative z-10 max-w-2xl mx-auto"
          onMouseEnter={() => setIsHomeFeedbackHovered(true)}
          onMouseLeave={() => setIsHomeFeedbackHovered(false)}
        >
          {shuffledFeedbacksPool.length === 0 || !currentHomeFeedback ? (
            <div className="text-center py-10 px-4 text-slate-400 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <MessageSquare className="h-8 w-8 text-slate-500 mx-auto" />
             <p className="text-sm font-semibold text-slate-300">
              No feedback available yet.
            </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Be the first to share your experience with conferences and our platform.
              </p>
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-amber-300" />
                <span>Add First Feedback</span>
              </button>
            </div>
          ) : (
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                    key={`home-fb-slide-${currentHomeFeedback.id || currentHomeFeedback.name}-${homeFeedbackScrollIndex}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 text-left"
                  >
                    {/* Top accent */}
                    <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />

                    <div className="p-6 sm:p-8">
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getCleanImageSrc(
                              currentHomeFeedback.image,
                              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                            )}
                            alt={currentHomeFeedback.name}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
                            referrerPolicy="no-referrer"
                          />

                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                              {currentHomeFeedback.name}
                            </h4>

                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                              <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">
                                {currentHomeFeedback.country || "Global"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Quote className="h-5 w-5" />
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-0.5">
                          {[...Array(currentHomeFeedback.rating || 5)].map((_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-amber-400 text-amber-400"
                            />
                          ))}
                        </div>

                        <span className="text-xs font-bold text-slate-600">
                          {currentHomeFeedback.rating || 5}.0
                        </span>
                      </div>

                      {/* Feedback */}
                      <p className="text-slate-700 text-sm sm:text-base leading-7 font-medium">
                        “{currentHomeFeedback.text}”
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Community Feedback
                        </span>

                        {currentHomeFeedback.date && (
                          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                            {currentHomeFeedback.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
              </AnimatePresence>

              {/* Progress Dots Indicator (shows for <= 12 items, or compact progress for more) */}
              {shuffledFeedbacksPool.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-5">
                  {shuffledFeedbacksPool.map((_, dotIdx) => {
                    const isActive =
                      (homeFeedbackScrollIndex % shuffledFeedbacksPool.length) === dotIdx;

                    return (
                      <button
                        key={dotIdx}
                        onClick={() => setHomeFeedbackScrollIndex(dotIdx)}
                        aria-label={`Go to feedback ${dotIdx + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive
                            ? "w-7 bg-blue-600"
                            : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom "View More" & "Add Feedback" Options */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4 border-t border-white/10 relative z-10">
          <button
            onClick={() => {
              if (onTabChange) onTabChange("FEEDBACK");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full sm:w-auto px-7 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>View More</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span>Add Your Feedback</span>
          </button>
        </div>
      </section>
        </>
      )}


      {/* About Us Section */}
      {tab === "ABOUT" && (
        <section
          id="about"
          className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center min-w-0"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{dynamicAboutUs.missionBadge}</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-display leading-tight break-words">
                {dynamicAboutUs.title}
              </h1>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              {dynamicAboutUs.paragraph1}
            </p>
            <p className="text-slate-600 leading-relaxed font-medium">
              {dynamicAboutUs.paragraph2}
            </p>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <div className="text-2xl font-extrabold text-blue-600">{dynamicAboutUs.stat1Value}</div>
                <p className="text-xs text-slate-400 font-bold uppercase">{dynamicAboutUs.stat1Label}</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-extrabold text-indigo-600">{dynamicAboutUs.stat2Value}</div>
                <p className="text-xs text-slate-400 font-bold uppercase">{dynamicAboutUs.stat2Label}</p>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg min-w-0">
            <img
              src={dynamicAboutUs.imageUrl}
              alt="About Conference Hall"
              className="w-full h-auto object-cover block"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
          </div>
        </section>
      )}

      {/* Contact Us Section */}
      {tab === "CONTACT" && (
        <section id="contact" className="scroll-mt-24">
          <div className="flex flex-col lg:flex-row items-stretch gap-6 md:gap-8 w-full">
            {/* Left Side (40% Width) - Contact Information */}
            <div className="w-full lg:w-[40%] min-w-0 shrink-0 bg-[#37494E] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-9 shadow-md flex flex-col justify-between gap-5 sm:gap-6 border border-[#2b3a3e]">
              {/* Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-slate-100 font-bold text-[10px] uppercase tracking-wider">
                  <Mail className="h-3.5 w-3.5 text-slate-200" /> Get In Touch
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-display text-white leading-tight">Contact Information</h1>
                <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                  Have questions, issues, or feedback? Get in touch with our operations center.
                </p>
              </div>

              {/* Contact Details List */}
              <div className="space-y-3.5 my-auto py-2">
                {/* Email Address */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="p-2.5 bg-white/10 rounded-xl shrink-0 text-white">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">Email Address</p>
                    <a href={`mailto:${footerContactInfo.email || "ops@internationalconference.org"}`} className="text-xs sm:text-sm font-bold text-white hover:underline break-all block mt-0.5">
                      {footerContactInfo.email || "ops@internationalconference.org"}
                    </a>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="p-2.5 bg-white/10 rounded-xl shrink-0 text-white">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">Phone Number</p>
                    <a href={`tel:${(footerContactInfo.phone || "").replace(/[^0-9+]/g, "")}`} className="text-xs sm:text-sm font-bold text-white hover:underline block mt-0.5">
                      {footerContactInfo.phone || "+1 (555) 304-4581"}
                    </a>
                  </div>
                </div>

                {/* Office Address */}
                {footerContactInfo.address && (
                  <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition-colors">
                    <div className="p-2.5 bg-white/10 rounded-xl shrink-0 text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider">Office Address</p>
                      <p className="text-xs sm:text-sm font-bold text-white mt-0.5 whitespace-pre-line">
                        {footerContactInfo.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Follow Us */}
              <div className="pt-4 border-t border-white/15">
                <p className="text-[10px] uppercase font-extrabold text-slate-300 tracking-wider mb-2.5">Follow Us</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {footerSocialMedia.facebook && (
                    <a href={footerSocialMedia.facebook} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Facebook">
                      <Facebook className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {footerSocialMedia.instagram && (
                    <a href={footerSocialMedia.instagram} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Instagram">
                      <Instagram className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {footerSocialMedia.linkedin && (
                    <a href={footerSocialMedia.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="LinkedIn">
                      <Linkedin className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {footerSocialMedia.twitter && (
                    <a href={footerSocialMedia.twitter} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Twitter / X">
                      <Twitter className="h-4.5 w-4.5" />
                    </a>
                  )}
                  {footerSocialMedia.other && (
                    <a href={footerSocialMedia.other} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors" title="Website / Other">
                      <Globe className="h-4.5 w-4.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side (60% Width) - Collaboration Portal / Registration Form */}
            <div className="w-full lg:w-[60%] min-w-0 flex-1 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-9 shadow-sm flex flex-col justify-between gap-4">
              <div className="space-y-1 pb-3 border-b border-slate-100">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                  <Handshake className="h-3.5 w-3.5" /> Collaboration Portal
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 font-display leading-tight break-words">
                  Collaboration Portal / Registration Form
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Submit your organization details to feature as a Media Partner or Associate.
                </p>
              </div>

              {collabSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 my-auto">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">Application Submitted Successfully!</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">Thank you for submitting your organization profile. Our verification team will review your application shortly.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCollabSubmit} className="space-y-3.5 flex-1 flex flex-col justify-between pt-1">
                  <div className="space-y-3">
                    {/* Upload Logo or URL - Full Width Compact */}
                    <ImageUploaderField
                      label="Organization Logo"
                      value={collabLogo}
                      onChange={setCollabLogo}
                      placeholder="Paste logo URL (https://...)"
                      aspectHint="PNG, JPG, SVG, WEBP"
                      isLogo={true}
                    />

                    {/* Company Name - Full Width */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Company Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Global Science Media"
                        value={collabName || ""}
                        onChange={(e) => setCollabName(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    {/* Website - Full Width */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Website *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. example.org or https://example.org"
                        value={collabUrl || ""}
                        onChange={(e) => setCollabUrl(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    {/* Partnership Type - Full Width */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Partnership Type *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            collabCategory === "Event Partner"
                              ? "border-blue-600 bg-blue-50/60 text-blue-900 shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="collabCategory"
                            value="Event Partner"
                            checked={collabCategory === "Event Partner"}
                            onChange={() => setCollabCategory("Event Partner")}
                            className="accent-blue-600 h-3.5 w-3.5"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold truncate">Media Partner</div>
                            <div className="text-[10px] text-slate-500 truncate">Journal & press network</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            collabCategory === "Associates"
                              ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="collabCategory"
                            value="Associates"
                            checked={collabCategory === "Associates"}
                            onChange={() => setCollabCategory("Associates")}
                            className="accent-indigo-600 h-3.5 w-3.5"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold truncate">Our Associates</div>
                            <div className="text-[10px] text-slate-500 truncate">Academic board & society</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Description - Full Width (Strict 150 char max limit) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                          Description *
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                            collabDescription.length >= 150
                              ? "bg-amber-100 text-amber-800 font-extrabold border border-amber-300"
                              : "text-slate-400 bg-slate-100"
                          }`}
                        >
                          {collabDescription.length} / 150 chars
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        required
                        maxLength={150}
                        placeholder="Briefly describe your organization, publishing scope, or mission (max 150 chars)..."
                        value={collabDescription || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCollabDescription(val.slice(0, 150));
                        }}
                        className={`w-full text-xs sm:text-sm bg-slate-50 border rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:bg-white focus:outline-none resize-none transition-all ${
                          collabDescription.length >= 150
                            ? "border-amber-400 focus:ring-amber-500 bg-amber-50/30"
                            : "border-slate-200 focus:ring-blue-500"
                        }`}
                      />
                      {collabDescription.length >= 150 && (
                        <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1.5 pt-0.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                          <span>Maximum character limit reached (150/150 characters).</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Application Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/10"
                    >
                      <Send className="h-4 w-4" /> Submit Application
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Media Partner Section */}
      {tab === "MEDIAPARTNER" && (() => {
        const itemsPerPage = 48;
        const totalPages = Math.ceil(approvedMediaPartnersList.length / itemsPerPage) || 1;
        const paginatedPartners = approvedMediaPartnersList.slice(
          (mediaPartnerPage - 1) * itemsPerPage,
          mediaPartnerPage * itemsPerPage
        );

        return (
          <section id="media-partner" className="scroll-mt-24 space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
            {/* Header block */}
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-blue-600 font-bold text-[10px] uppercase tracking-wider">
                <Globe className="h-3.5 w-3.5" /> Media Distribution & Outreach
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-display leading-tight">
                Media Partners
              </h1>
              <p className="text-slate-600 leading-relaxed font-medium">
                International Conference collaborates with esteemed scientific publishers, technology journals, and academic networks to ensure that our audited and listed conferences gain maximum visibility and authentic academic reach.
              </p>
            </div>

            {/* Status summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-b border-slate-100 pb-3">
              <span>Showing {approvedMediaPartnersList.length === 0 ? 0 : ((mediaPartnerPage - 1) * itemsPerPage) + 1} - {Math.min(mediaPartnerPage * itemsPerPage, approvedMediaPartnersList.length)} of {approvedMediaPartnersList.length} Media Partners</span>
              <span className="font-semibold text-slate-700">Page {mediaPartnerPage} of {totalPages}</span>
            </div>

            {/* Partners Grid */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {paginatedPartners.map((partner, pIdx) => (
                <div
                  key={partner.id ? `${partner.id}-${pIdx}` : `partner-${pIdx}`}
                  className={`bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md ${partner.borderHover} transition-all flex flex-col h-full min-w-0 justify-between`}
                >
                  <div>
                    {/* Logo */}
                    <div className="w-full flex justify-start mb-4">
                      <div className="w-30 h-20 sm:w-30 sm:h-20 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
                        <img 
                          src={partner.logo} 
                          alt={`${partner.name} Logo`} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1 mt-2.5 sm:mt-4">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm md:text-base leading-tight break-words">{partner.name}</h4>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 text-[11px] sm:text-xs font-medium leading-relaxed mt-2 sm:mt-3 break-words whitespace-pre-line">
                      {partner.description}
                    </p>
                  </div>

                  {/* Visit Website Button */}
                  <div className="pt-2.5 sm:pt-3 mt-3 sm:mt-4 border-t border-slate-100 flex items-center justify-start">
                    <a 
                      href={getFormattedUrl(partner.website)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition-all border border-blue-200/80 hover:border-blue-600 shadow-2xs group cursor-pointer"
                    >
                      Visit Website <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <button
                  onClick={() => {
                    setMediaPartnerPage((prev) => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  disabled={mediaPartnerPage === 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setMediaPartnerPage(pageNum);
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className={`h-9 min-w-9 px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        mediaPartnerPage === pageNum
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setMediaPartnerPage((prev) => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  disabled={mediaPartnerPage === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Collaborate Callout Box */}
            <div className="bg-[#37494E] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6 border border-[#2b3a3e]">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-bold font-display">Are you a scientific publisher, press network, or journal partner?</h3>
                <p className="text-slate-200 text-xs font-medium leading-relaxed">
                  Partner with International Conference to co-promote verified events and maximize global research distribution.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onTabChange) onTabChange("CONTACT");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="w-full md:w-auto bg-white hover:bg-slate-100 text-[#37494E] hover:text-[#2b3a3e] font-bold px-5 sm:px-6 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-md">
                Collaborate With Us <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        );
      })()}

      {/* Our Associates Section */}
      {tab === "ASSOCIATES" && (() => {
        const itemsPerPage = 48;
        const totalPages = Math.ceil(approvedAssociatesList.length / itemsPerPage) || 1;
        const paginatedAssociates = approvedAssociatesList.slice(
          (associatesPage - 1) * itemsPerPage,
          associatesPage * itemsPerPage
        );

        return (
          <section id="associates" className="scroll-mt-24 space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
            {/* Header block */}
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 font-bold text-[10px] uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" /> Trusted Global Network
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-display leading-tight">
                Our Associates
              </h1>
              <p className="text-slate-600 leading-relaxed font-medium">
                We work in association with high-tier global scientific consortiums, national educational societies, and review councils to continuously verify conference authenticity and set publishing quality guidelines.
              </p>
            </div>

            {/* Status summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-b border-slate-100 pb-3">
              <span>Showing {approvedAssociatesList.length === 0 ? 0 : ((associatesPage - 1) * itemsPerPage) + 1} - {Math.min(associatesPage * itemsPerPage, approvedAssociatesList.length)} of {approvedAssociatesList.length} Associates</span>
              <span className="font-semibold text-slate-700">Page {associatesPage} of {totalPages}</span>
            </div>

            {/* Associates Grid */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {paginatedAssociates.map((assoc, aIdx) => (
                <div
                  key={assoc.id ? `${assoc.id}-${aIdx}` : `assoc-${aIdx}`}
                  className={`bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md ${assoc.borderHover} transition-all flex flex-col h-full min-w-0 justify-between`}
                >
                  <div>
                    {/* Logo */}
                      <div className="w-full flex justify-start mb-4">
                        <div className="w-30 h-20 sm:w-30 sm:h-20 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
                          <img 
                            src={assoc.logo} 
                            alt={`${assoc.name} Logo`} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-2"
                          />
                        </div>
                      </div>

                    {/* Name */}
                    <div className="space-y-1 mt-2.5 sm:mt-4">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm md:text-base leading-tight break-words">{assoc.name}</h4>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 text-[11px] sm:text-xs font-medium leading-relaxed mt-2 sm:mt-3 break-words whitespace-pre-line">
                      {assoc.description}
                    </p>
                  </div>

                  {/* Visit Website Button */}
                  <div className="pt-2.5 sm:pt-3 mt-3 sm:mt-4 border-t border-slate-100 flex items-center justify-start">
                    <a 
                      href={getFormattedUrl(assoc.website)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold text-xs transition-all border border-indigo-200/80 hover:border-indigo-600 shadow-2xs group cursor-pointer"
                    >
                      Visit Website <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 pb-2">
                <button
                  onClick={() => {
                    setAssociatesPage((prev) => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  disabled={associatesPage === 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        setAssociatesPage(pageNum);
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className={`h-9 min-w-9 px-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        associatesPage === pageNum
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setAssociatesPage((prev) => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  disabled={associatesPage === totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Collaborate Callout Box */}
            <div className="bg-[#37494E] text-white rounded-3xl p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 border border-[#2b3a3e]">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl font-bold font-display">Are you a university, academic society, or reviewer council?</h3>
                <p className="text-slate-200 text-xs font-medium leading-relaxed">
                  Join our associative network to co-audit academic listings, verify conference events in your area, and promote scientific integrity.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onTabChange) onTabChange("CONTACT");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="bg-white hover:bg-slate-100 text-[#37494E] hover:text-[#2b3a3e] font-bold px-6 py-3 rounded-xl text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
              >
                Collaborate With Us <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        );
      })()}

      {/* ORGANIZERS PAGE */}
      {tab === "ORGANIZERS" && (
        <section className="space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
          <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-sm space-y-4 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <Users className="h-3.5 w-3.5" /> Verified Global Network
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 font-display tracking-tight leading-tight break-words">
                  Trusted Organizers
                </h1>
              </div>
              <div className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 bg-slate-50 border border-slate-150 px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl shrink-0">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">
                  {allPublicOrganizersList.length} Verified Organizer
                </span>
              </div>
            </div>

            <p className="text-slate-600 text-sm md:text-base leading-relaxed font-medium max-w-4xl">
              Browse verified academic institutions, scientific societies, professional organizations, universities, and research boards hosting conferences worldwide. Click any organizer card to view its complete profile and published conferences.
            </p>
          </div>

          {allPublicOrganizersList.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Users className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No verified organizers listed at this moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {allPublicOrganizersList.map((org, oIdx) => {
                const publishedCount = approvedConferences.filter((c) => c.organizerId === org.id).length;
                return (
                  <div
                    key={org.id ? `${org.id}-${oIdx}` : `org-page-${oIdx}`}
                    className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full min-w-0 group"
                  >
                    <div className="space-y-2.5 sm:space-y-4">
                      {/* Organizer Logo & Verified Badge */}
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-150 bg-slate-50 shadow-2xs shrink-0 flex items-center justify-center">
                          {(() => {
                            const logoUrl = getCleanImageSrc(org.logo, "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80");
                            return (
                              <img
                                src={logoUrl}
                                alt={org.organizationName}
                                className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80";
                                }}
                              />
                            );
                          })()}
                        </div>
                        {getIsOrganizerTrusted(org) && (
                          <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold shrink-0">
                            <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600" /> <span className="hidden sm:inline">Verified</span>
                          </span>
                        )}
                      </div>

                      {/* Organizer Name */}
                      <div className="space-y-0.5 sm:space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-xs sm:text-base font-display leading-snug group-hover:text-blue-600 transition-colors break-words">
                          {org.organizationName}
                        </h3>
                        {/* City & Country */}
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                          <span>{[org.city, org.country].filter(Boolean).join(", ") || "Global / Worldwide"}</span>
                        </p>
                      </div>

                      {/* Number of Conferences Published */}
                      <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50/80 border border-blue-100 rounded-lg text-[9px] sm:text-xs font-semibold text-blue-800">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 shrink-0" />
                        <span>{publishedCount} {publishedCount === 1 ? "Conference" : "Conferences"}</span>
                      </div>

                      {/* Short Description */}
                      <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed font-normal break-words">
                        {(() => {
                          const text = org.aboutOrganization || "Verified academic and research institution hosting international peer-reviewed scientific conferences.";
                          return text.length > 200 ? `${text.slice(0, 200)}...` : text;
                        })()}
                      </p>
                    </div>

                    {/* View Organizer Profile Button */}
                    <div className="pt-3 sm:pt-5 mt-3 sm:mt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onSelectOrganizer(org.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="w-full py-1.5 sm:py-2.5 px-2 sm:px-4 bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white font-bold text-[11px] sm:text-xs rounded-xl border border-blue-200 group-hover:border-blue-600 transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-2xs group-hover:shadow-xs"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

     {/* Privacy Policy Tab */}
{tab === "PRIVACY" && (
  <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
      {dynamicPrivacyPolicy.title}
    </h1>

    <p className="text-sm text-slate-500 mb-8">
      Last updated:{" "}
      {dynamicPrivacyPolicy.updated_at
        ? new Date(dynamicPrivacyPolicy.updated_at).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric"
            }
          )
        : privacyPolicyContent.lastUpdated}
    </p>

    <div className="prose prose-slate max-w-none text-slate-700 leading-7 whitespace-pre-line">
      {dynamicPrivacyPolicy.content}
    </div>
  </section>
)}

      {/* Terms of Service Tab */}
{tab === "TERMS" && (
  <section className="bg-white border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm space-y-6">
    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display leading-tight break-words">
      {dynamicTermsOfService.title}
    </h1>

    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
      Last updated:{" "}
      {dynamicTermsOfService.updated_at
        ? new Date(dynamicTermsOfService.updated_at).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric"
            }
          )
        : termsOfServiceContent.lastUpdated}
    </p>

    <div className="prose prose-blue max-w-none text-sm text-slate-600 leading-7 whitespace-pre-line">
      {dynamicTermsOfService.content}
    </div>
  </section>
)}

      {/* Customer Feedback / Testimonials Full Dedicated Page */}
      {(tab === "FEEDBACK" || tab === "TESTIMONIALS") && (
        <section className="space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
          {/* Hero Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 text-white relative overflow-hidden shadow-xl min-w-0">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span>Community Reviews & Testimonials</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white tracking-tight leading-tight break-words">
                  Customer Feedback & Testimonials
                </h1>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Read authentic feedback and verified reviews from researchers, academic leaders, conference organizers, and scholars around the world.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="w-full sm:w-auto px-4 sm:px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4 text-amber-300" />
                  <span>Add Your Feedback</span>
                </button>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/10 relative z-10">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 font-extrabold text-lg shrink-0">
                  ★
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-white">{feedbackMetrics.average}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ 5.0</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Average Rating</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{approvedFeedbacksList.length}</div>
                  <p className="text-xs text-slate-300 font-medium">Total Testimonials</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{feedbackMetrics.fiveStarPct}%</div>
                  <p className="text-xs text-slate-300 font-medium">5-Star Satisfaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, country, keyword..."
                value={feedbackSearchQuery}
                onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {feedbackSearchQuery && (
                <button
                  onClick={() => setFeedbackSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rating Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { label: "All Reviews", value: "ALL" },
                { label: "5 Stars", value: "5" },
                { label: "4 Stars", value: "4" },
                { label: "3 Stars", value: "3" },
              ].map((rf) => {
                const isActive = feedbackRatingFilter === rf.value;
                return (
                  <button
                    key={rf.value}
                    onClick={() => setFeedbackRatingFilter(rf.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#37494E] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Testimonials Grid */}
          {filteredAllFeedbacks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <MessageSquare className="h-10 w-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800">No Testimonials Found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {feedbackSearchQuery || feedbackRatingFilter !== "ALL"
                  ? "No reviews matched your current search or rating filter. Try clearing filters to see all reviews."
                  : "No feedback has been approved yet. Be the first to share your thoughts!"}
              </p>
              {(feedbackSearchQuery || feedbackRatingFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setFeedbackSearchQuery("");
                    setFeedbackRatingFilter("ALL");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium border-b border-slate-200 pb-3">
                <span>
                  Showing {(feedbackPage - 1) * feedbackItemsPerPage + 1} - {Math.min(feedbackPage * feedbackItemsPerPage, filteredAllFeedbacks.length)} of {filteredAllFeedbacks.length} Feedbacks
                </span>
                <span className="font-semibold text-slate-700">Page {feedbackPage} of {feedbackTotalPages}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {paginatedFeedbacks.map((fb, idx) => (
                <div
                  key={fb.id || `all-fb-${idx}`}
                  className="bg-white border border-slate-200/90 hover:border-blue-400/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(fb.rating || 5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                      </span>
                    </div>

                    <p className="text-slate-700 text-sm md:text-base leading-relaxed italic font-normal">
                      "{fb.text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <img
                      src={getCleanImageSrc(fb.image, "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80")}
                      alt={fb.name}
                      className="w-11 h-11 rounded-full border-2 border-slate-200 object-contain shadow-xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{fb.name}</h4>
                      <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{fb.country || "Global"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {feedbackTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setFeedbackPage((page) => Math.max(1, page - 1))}
                    disabled={feedbackPage === 1}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: feedbackTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => setFeedbackPage(pageNumber)}
                      className={`h-9 min-w-9 px-2 rounded-xl text-xs font-bold cursor-pointer ${
                        feedbackPage === pageNumber
                          ? "bg-[#37494E] text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    onClick={() => setFeedbackPage((page) => Math.min(feedbackTotalPages, page + 1))}
                    disabled={feedbackPage === feedbackTotalPages}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Community CTA */}
          <div className="bg-gradient-to-br from-[#37494E] to-slate-900 border border-slate-800 rounded-3xl p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-xl font-bold font-display">Attended a Conference or Used Our Portal?</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                We value your insights. Share your feedback to help fellow scholars, speakers, and organizers make informed choices.
              </p>
            </div>
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-[#37494E] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer shrink-0 flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <span>Submit Your Feedback</span>
            </button>
          </div>
        </section>
      )}

      {/* Footer Section */}
      <footer className="bg-[#37494E] text-slate-300 border-t border-[#2b3a3e] rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-12 space-y-8 sm:space-y-10 relative z-10 overflow-hidden shadow-lg min-w-0">
        {/* 5-Column Grid Layout: Logo, Quick Links, Contact Info, Follow Us, Newsletter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          
          {/* Column 1: Logo & Branding */}
          <div className="space-y-4">
            <div 
              onClick={() => {
                if (onTabChange) onTabChange("HOME");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-[145px] h-10 sm:w-[170px] sm:h-12 lg:w-[190px] lg:h-14 flex items-center justify-start shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src="/company-logo.png"
                  alt="International Conference Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Global directory for peer-reviewed academic conferences, research symposiums, and professional summits taking place worldwide.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm">Quick Links</h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("HOME");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("ABOUT");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("EVENTS");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Conferences
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("ORGANIZERS");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Organizers
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("MEDIAPARTNER");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Media Partner
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("ASSOCIATES");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Our Associates
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("CONTACT");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onTabChange) onTabChange("FEEDBACK");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Testimonials
                </button>
              </li>
              <li>
                <button onClick={onLoginClick} className="hover:text-blue-300 transition-colors cursor-pointer">
                  Login
                </button>
              </li>
              <li>
                <button onClick={onSignUpClick} className="hover:text-blue-300 transition-colors cursor-pointer">
                  Sign Up
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className="space-y-4 text-xs font-semibold">
            <h4 className="font-bold text-white text-sm">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-300 shrink-0" />
                <span className="break-all">{footerContactInfo.email || "ops@internationalconference.org"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-300 shrink-0" />
                <span>{footerContactInfo.phone || "+1 (555) 304-4581"}</span>
              </li>
              {footerContactInfo.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{footerContactInfo.address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Follow Us */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Follow Us</h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Connect with our global network across official social channels for daily conference updates.
            </p>
            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              {footerSocialMedia.facebook && (
                <a href={footerSocialMedia.facebook} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 cursor-pointer" title="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {footerSocialMedia.instagram && (
                <a href={footerSocialMedia.instagram} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 cursor-pointer" title="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {footerSocialMedia.linkedin && (
                <a href={footerSocialMedia.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 cursor-pointer" title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {footerSocialMedia.twitter && (
                <a href={footerSocialMedia.twitter} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 cursor-pointer" title="Twitter / X">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {footerSocialMedia.other && (
                <a href={footerSocialMedia.other} target="_blank" rel="noreferrer" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all hover:scale-105 cursor-pointer" title="Website / Other">
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Column 5: Newsletter */}
          <div className="space-y-4">
            <h4 className="font-bold text-white text-sm">Newsletter</h4>
            <p className="text-xs font-medium text-slate-300 leading-relaxed">
              Subscribe to receive indexes of vetted conferences directly in your inbox.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                required
                placeholder="Enter your email..."
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  if (newsletterError) setNewsletterError("");
                }}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border border-white/20 shadow-xs flex items-center justify-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Subscribe Now</span>
              </button>
            </form>

            {newsletterError && (
              <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                ✕ {newsletterError}
              </p>
            )}

            {newsletterSubscribed && (
              <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Successfully subscribed!
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-850 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-semibold">
          <div>
            © 2026 International Conference Portal. All Rights Reserved.
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (onTabChange) onTabChange("PRIVACY");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                if (onTabChange) onTabChange("TERMS");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Feedback Pop-Up Modal */}
      <AnimatePresence>
        {userFeedbackSubmitted && !isFeedbackModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-200 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xl flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Feedback submitted successfully and sent to admin for review.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#37494E] border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white"
            >
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/40 sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-400/15 rounded-xl border border-amber-400/30 text-amber-300">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Add Your Feedback</h3>
                    <p className="text-[11px] text-slate-300">We appreciate your review & thoughts</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleUserFeedbackSubmit} className="p-4 sm:p-6 space-y-4">
                {userFeedbackSubmitted && (
                  <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Thank you! Your feedback has been submitted successfully and sent to admin for review.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      Your Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Sarah Jenkins"
                      value={userFeedbackName || ""}
                      onChange={(e) => setUserFeedbackName(e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      Location / Country Name
                    </label>
                    <select
                      value={userFeedbackLocation || "Global"}
                      onChange={(e) => setUserFeedbackLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all cursor-pointer"
                    >
                      <option value="Global" className="bg-slate-900 text-slate-300">
                        Global / International
                      </option>
                      {activeCountriesList.map((c) => (
                        <option key={c} value={c} className="bg-slate-900 text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ImageUploaderField
                  label="Your Photo / Avatar"
                  value={userFeedbackImage}
                  onChange={setUserFeedbackImage}
                  placeholder="Paste image URL (https://...)"
                  aspectHint="PNG, JPG, SVG, WEBP"
                  isLogo={true}
                  darkBg={true}
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      Your Rating <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setUserFeedbackRating(star)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                          title={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              star <= userFeedbackRating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      Feedback / Description <span className="text-rose-400">*</span>
                    </label>
                    <span className={`text-[11px] font-semibold ${userFeedbackText.length >= 50 ? "text-amber-400" : "text-slate-400"}`}>
                      {userFeedbackText.length}/50
                    </span>
                  </div>

                  <textarea
                    required
                    rows={3}
                    maxLength={50}
                    placeholder="Share your brief feedback (max 50 characters)..."
                    value={userFeedbackText || ""}
                    onChange={(e) => setUserFeedbackText(e.target.value.slice(0, 50))}
                    className="w-full bg-slate-900/50 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all resize-none"
                  />
                </div>

                {/* Actions */}
             <div className="pt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="px-5 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-[#37494E] font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
