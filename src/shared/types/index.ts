export type Role = "VISITOR" | "ORGANIZER" | "ADMIN";

export function formatConferenceDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  let date: Date;
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    date = new Date(year, month, day);
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const day = date.getDate();
  const year = date.getFullYear();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];

  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) {
    suffix = "st";
  } else if (day === 2 || day === 22) {
    suffix = "nd";
  } else if (day === 3 || day === 23) {
    suffix = "rd";
  }

  return `${day}${suffix} ${month} ${year}`;
}

export enum ConferenceStatus {
  Draft = "Draft",
  PendingReview = "Pending Review",
  Approved = "Approved",
  Rejected = "Rejected",
}

export enum LiveStatus {
  Upcoming = "Upcoming",
  Ongoing = "Ongoing",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export interface UserFeedback {
  id: string;
  name: string;
  image?: string;
  text: string;
  rating: number;
  status: "Approved" | "Pending" | "Active" | "Inactive";
  date: string;
  country?: string;
}

export interface BannerContentItem {
  id: string;
  bannerId?: string;
  title: string;
  description: string;
  status: "Approved" | "Pending" | "Rejected" | "Active" | "Deactivated" | string;
}

export interface SubscriberItem {
  id: string;
  email: string;
  date: string;
}

export interface OrganizerProfile {
  id: string;
  authUserId?: string; // Supabase Auth user id (profile ownership)
  email: string;
  organizationName: string;
  contactPerson: string;
  logo: string;
  coverImage: string;
  organizationWebsite: string;
  aboutOrganization: string;
  country: string;
  city: string;
  isVerified: boolean;
  isSuspended: boolean;
  isFeatured: boolean;
  isProfileComplete?: boolean;
  createdAt: string;
  updatedAt?: string;
  slug?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
  telegram?: string;
  tiktok?: string;
  github?: string;
  pinterest?: string;
  galleryImages?: string[];
}

export interface QualityBreakdown {
  completeness: number;
  clarity: number;
  validity: number;
  seo: number;
}

export interface ConferenceHistoryItem {
  timestamp: string;
  action: string;
  actor: string;
  note?: string;
}

export interface Conference {
  id: string;
  slug?: string;
  title: string;
  shortTitle: string;
  category: string;
  bannerImage: string;
  description: string;
  startDate: string;
  endDate: string;
  time: string;
  timeZone: string;
  country: string;
  state?: string;
  city: string;
  venue: string;
  isOnline: boolean;
  attendanceType: "Online" | "Offline" | "Hybrid";
  organizerWebsite: string;
  conferenceWebsite: string;
  registrationLink: string;
  contactEmail?: string;
  
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  
  status: ConferenceStatus;
  liveStatus: LiveStatus;
  organizerId: string;
  organizerName?: string;
  rejectionReason?: string;
  isVerified: boolean;
  isFeatured: boolean;
  isDeactivated?: boolean;
  
  qualityScore?: number;
  qualityBreakdown?: QualityBreakdown;
  qualityFeedback?: string;
  qualitySuggestions?: string[];
  
  history: ConferenceHistoryItem[];
  views: number;
  registrationClicks: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export interface Notification {
  id: string;
  organizerId: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "error";
  notificationType?: string;
  relatedConferenceId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: string;
  role: string;
}

export interface Country {
  name: string;
  code: string;
  cities: string[];
}

export const COUNTRIES_AND_CITIES: Record<string, string[]> = {};

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_ORGANIZERS: OrganizerProfile[] = [];

export const INITIAL_CONFERENCES: Conference[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export interface Banner {
  id: string;
  image: string;
  order: number;
  place?: number;
  title?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  image_url?: string;
  link?: string;
  linkUrl?: string;
  link_url?: string;
  active?: boolean;
  status?: "Active" | "Deactivated" | "Inactive";
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export const INITIAL_BANNERS: Banner[] = [];
