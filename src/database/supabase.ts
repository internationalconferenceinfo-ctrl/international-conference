import { createClient, SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { adminFetch, getAdminTabToken } from "../shared/utils/adminSession";

/**
 * Supabase Primary Backend, Database, & Auth Client
 */

export const getSupabaseConfig = () => {
  const metaEnv = (typeof import.meta !== "undefined" && (import.meta as Record<string, any>).env) ? (import.meta as Record<string, any>).env : {};
  const url = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL || "";
  const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_ANON_KEY || "";
  return { url, anonKey };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && anonKey !== "" && anonKey !== "YOUR_PUBLISHABLE_KEY");
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseInstance && isSupabaseConfigured()) {
    const { url, anonKey } = getSupabaseConfig();
    try {
      supabaseInstance = createClient(url, anonKey);
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
    }
  }
  return supabaseInstance;
};

// Convert camelCase to snake_case for Supabase table names
const TABLE_NAME_MAP: Record<string, string> = {
  categories: "categories",
  topics: "categories",
  subscriberEmails: "subscriber_emails",
  subscriber_emails: "subscriber_emails",
  subscribers: "subscriber_emails",
  userFeedbacks: "user_feedbacks",
  user_feedbacks: "user_feedbacks",
  feedbacks: "user_feedbacks",
  bannerContents: "banner_contents",
  banner_contents: "banner_contents",
  inactiveCountries: "inactive_countries",
  inactive_countries: "inactive_countries",
  inactiveCities: "inactive_cities",
  inactive_cities: "inactive_cities",
  inactiveTopics: "inactive_topics",
  inactive_topics: "inactive_topics",
  mediaPartners: "media_partners",
  media_partners: "media_partners",
  associates: "associates",
  ourAssociates: "associates",
  our_associates: "associates",
  socialLinks: "social_links",
  social_links: "social_links",
  contactInfo: "contact_info",
  contact_info: "contact_info",
  notifications: "notifications",
  auditLogs: "audit_logs",
  audit_logs: "audit_logs"
};

const getSnakeTableName = (key: string): string => {
  if (TABLE_NAME_MAP[key]) return TABLE_NAME_MAP[key];
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Sanitize data array items or objects to match database column definitions
 */
function sanitizeForTable(table: string, data: any[]): any[] {
  if (!Array.isArray(data)) return [];

  if (table === "conferences") {
    return data.map((item: any) => ({
      id: String(item.id),
      title: item.title || "",
      category: item.category || "",
      slug: item.slug || "",
      country: item.country || "",
      city: item.city || "",
      location: item.venue || item.location || "",
      start_date: item.startDate || item.start_date || "",
      end_date: item.endDate || item.end_date || "",
      deadline: item.time || item.deadline || "",
      description: item.description || "",
      status: item.status || "Pending Review",
      rejection_reason: item.rejectionReason || item.rejection_reason || null,
      organizer_id: item.organizerId || item.organizer_id || "",
      organizer_email: item.contactEmail || item.organizer_email || "",
      organizer_name: item.organizerName || item.organizer_name || "",
      organizer_phone: item.organizerPhone || item.organizer_phone || "",
      organizer_website: item.organizerWebsite || item.organizer_website || "",
      banner_image: item.bannerImage || item.banner_image || "",
      short_title: item.shortTitle || item.short_title || "",
      time_zone: item.timeZone || item.time_zone || "GMT",
      attendance_type: item.attendanceType || item.attendance_type || "Offline",
      is_online: Boolean(item.isOnline !== undefined ? item.isOnline : item.is_online),
      conference_website: item.conferenceWebsite || item.conference_website || "",
      registration_link: item.registrationLink || item.registration_link || "",
      live_status: item.liveStatus || item.live_status || "Upcoming",
      is_deactivated: Boolean(item.isDeactivated !== undefined ? item.isDeactivated : item.is_deactivated),
      is_verified: Boolean(item.isVerified !== undefined ? item.isVerified : item.is_verified),
      is_featured: Boolean(item.isFeatured !== undefined ? item.isFeatured : item.is_featured),
      views_count: typeof item.views === "number" ? item.views : (item.views_count || 0),
      registration_clicks: typeof item.registrationClicks === "number" ? item.registrationClicks : (item.registration_clicks || 0),
      history: Array.isArray(item.history) ? item.history : [],
      created_at: item.createdAt || item.created_at || new Date().toISOString(),
      updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
    }));
  }

  if (table === "organizers") {
    return data.map((item: any) => ({
      id: String(item.id),
      name: item.organizationName || item.name || "",
      contact_person: item.contactPerson || item.contact_person || "",
      email: item.email || "",
      phone: item.phone || "",
      website: item.organizationWebsite || item.website || "",
      about_organization: item.aboutOrganization || item.about_organization || "",
      logo: item.logo || "",
      cover_image: item.coverImage || item.cover_image || "",
      country: item.country || "",
      city: item.city || "",
      is_verified: Boolean(item.isVerified !== undefined ? item.isVerified : item.is_verified),
      is_suspended: Boolean(item.isSuspended !== undefined ? item.isSuspended : item.is_suspended),
      is_featured: Boolean(item.isFeatured !== undefined ? item.isFeatured : item.is_featured),
      is_profile_complete: Boolean(item.isProfileComplete !== undefined ? item.isProfileComplete : item.is_profile_complete),
      slug: item.slug || "",
      twitter: item.twitter || "",
      linkedin: item.linkedin || "",
      facebook: item.facebook || "",
      instagram: item.instagram || "",
      youtube: item.youtube || "",
      whatsapp: item.whatsapp || "",
      telegram: item.telegram || "",
      tiktok: item.tiktok || "",
      github: item.github || "",
      pinterest: item.pinterest || "",
      gallery_images: Array.isArray(item.galleryImages) ? item.galleryImages : (Array.isArray(item.gallery_images) ? item.gallery_images : []),
      created_at: item.createdAt || item.created_at || new Date().toISOString()
    }));
  }

  if (table === "categories") {
    return data.map((item: any) => ({
      id: String(item.id),
      name: item.name || "",
      icon: item.icon || "Sparkles",
      count: item.count || 0,
      created_at: new Date().toISOString()
    }));
  }

  if (table === "banners") {
    return data.map((item: any) => {
      const isActive = item.status ? (item.status === "Active") : (item.active !== undefined ? Boolean(item.active) : true);
      const statusStr = isActive ? "Active" : "Inactive";
      const img = item.imageUrl || item.image_url || item.image || "";
      const lnk = item.linkUrl || item.link_url || item.link || "";
      const ord = typeof item.place === "number" ? item.place : (typeof item.order === "number" ? item.order : 1);
      const desc = String(item.description || item.content || "").trim().slice(0, 100);
      return {
        id: String(item.id),
        title: String(item.title || "").trim().slice(0, 50),
        description: desc,
        content: desc,
        image: img,
        image_url: img,
        link: lnk,
        link_url: lnk,
        active: isActive,
        status: statusStr,
        place: ord,
        order: ord,
        created_at: item.createdAt || item.created_at || new Date().toISOString(),
        updated_at: item.updatedAt || item.updated_at || new Date().toISOString()
      };
    });
  }

  if (table === "banner_contents") {
    return data.map((item: any) => ({
      id: String(item.id || `bc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      subtitle: item.subtitle || "",
      title: item.title || "",
      content: item.content || item.description || "",
      active: item.active !== undefined ? item.active : (item.status === "Active" || item.status === "Approved"),
      created_at: item.created_at || new Date().toISOString()
    }));
  }

  if (table === "subscriber_emails") {
    return data.map((item: any) => ({
      id: String(item.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      email: typeof item === "string" ? item : (item.email || ""),
      created_at: item.created_at || (item.date ? new Date(item.date).toISOString() : new Date().toISOString())
    }));
  }

  if (table === "contact_inquiries") {
    return data.map((item: any) => ({
      id: String(item.id || `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      name: String(item.name || "").trim().slice(0, 120),
      email: String(item.email || "").trim().toLowerCase().slice(0, 254),
      subject: String(item.subject || "General inquiry").trim().slice(0, 180),
      message: String(item.message || "").trim().slice(0, 4000),
      status: item.status || "Open",
      created_at: item.createdAt || item.created_at || new Date().toISOString()
    }));
  }

  if (table === "user_feedbacks") {
    return data.map((item: any) => ({
      id: String(item.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      name: item.name || "",
      image: item.image || "",
      text: item.text || item.message || "",
      message: item.text || item.message || "",
      rating: typeof item.rating === "number" ? item.rating : 5,
      status: item.status || "Pending",
      country: item.country || "",
      date: item.date || (item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()),
      created_at: item.created_at || (item.date ? new Date(item.date).toISOString() : new Date().toISOString())
    }));
  }

  if (table === "countries" || table === "inactive_countries" || table === "inactive_cities" || table === "inactive_topics") {
    return data.map((item: any) => {
      if (typeof item === "string") {
        const val = item.trim().toUpperCase();
        return { id: val, name: val, created_at: new Date().toISOString() };
      }
      const val = String(item.name || item.id || "").trim().toUpperCase();
      return {
        id: String(item.id || val),
        name: val,
        created_at: item.created_at || new Date().toISOString()
      };
    });
  }

  if (table === "cities") {
    return data.map((item: any) => {
      if (typeof item === "string") {
        const val = item.trim().toUpperCase();
        return { id: val, name: val, country: "", created_at: new Date().toISOString() };
      }
      const countryStr = String(item.country || "").trim().toUpperCase();
      const nameStr = String(item.name || "").trim().toUpperCase();
      const calculatedId = item.id || (countryStr ? `${countryStr}:::${nameStr}` : nameStr);
      return {
        id: String(calculatedId),
        name: nameStr,
        country: countryStr,
        created_at: item.created_at || new Date().toISOString()
      };
    });
  }

  if (table === "media_partners") {
    return data.map((item: any) => {
      let createdAtIso = new Date().toISOString();
      if (item.created_at) {
        try { createdAtIso = new Date(item.created_at).toISOString(); } catch(e) {}
      } else if (item.submittedAt) {
        try { createdAtIso = new Date(item.submittedAt).toISOString(); } catch(e) {}
      }
      return {
        id: String(item.id || `mp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        name: item.name || "",
        type: item.type || "Media Partner",
        description: String(item.description || "").trim().slice(0, 150),
        logo: item.logo || "",
        website: item.website || "",
        email: item.email || "",
        status: item.status || "Pending",
        created_at: createdAtIso
      };
    });
  }

  if (table === "associates") {
    return data.map((item: any) => {
      let createdAtIso = new Date().toISOString();
      if (item.created_at) {
        try { createdAtIso = new Date(item.created_at).toISOString(); } catch(e) {}
      } else if (item.submittedAt) {
        try { createdAtIso = new Date(item.submittedAt).toISOString(); } catch(e) {}
      }
      return {
        id: String(item.id || `assoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        name: item.name || "",
        category: item.category || "Associates",
        description: String(item.description || "").trim().slice(0, 150),
        logo: item.logo || "",
        website: item.website || "",
        email: item.email || "",
        status: item.status || "Pending",
        created_at: createdAtIso
      };
    });
  }

  if (table === "topics" || table === "categories") {
    return data.map((item: any) => ({
      id: String(item.id || item.name || `topic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      name: item.name || "",
      icon: item.icon || "Sparkles",
      count: item.count || 0,
      description: item.description || "",
      status: item.status || "Active",
      created_at: item.created_at || new Date().toISOString()
    }));
  }

  if (table === "notifications") {
    return data.map((item: any) => ({
      id: String(item.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      organizer_id: item.organizerId || item.organizer_id || "ADMIN",
      title: item.title || "",
      message: item.message || "",
      type: item.type || item.notification_type || "info",
      notification_type: item.notificationType || item.notification_type || item.type || "info",
      related_conference_id: item.relatedConferenceId || item.related_conference_id || null,
      read: Boolean(item.read !== undefined ? item.read : item.is_read),
      created_at: item.createdAt || item.created_at || new Date().toISOString()
    }));
  }

  if (table === "audit_logs") {
    return data.map((item: any) => ({
      id: String(item.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      conference_id: item.conferenceId || item.conference_id || null,
      organizer_id: item.organizerId || item.organizer_id || null,
      admin_id: item.adminId || item.admin_id || "ADMIN",
      action: String(item.action || ""),
      // The audit_logs table stores display text here. Always serialize legacy
      // object values so React can never receive an object as a text child.
      details: typeof item.details === "string"
        ? item.details
        : item.details == null
          ? ""
          : JSON.stringify(item.details),
      actor: String(item.actor || "System"),
      role: String(item.role || "ADMIN"),
      timestamp: item.timestamp || item.createdAt || item.created_at || new Date().toISOString()
    }));
  }

  return data;
}

/**
 * Normalize data rows returned from relational table queries
 */
const normalizeConferenceStatus = (value: any): string => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "draft") return "Draft";
  if (normalized === "pending" || normalized === "pending review" || normalized === "pendingreview") return "Pending Review";
  return value || "Pending Review";
};

function normalizeFromTable(table: string, data: any): any {
  if (!Array.isArray(data)) return data;

  if (table === "conferences") {
    return data.map((row: any) => ({
      id: row.id,
      title: row.title || "",
      shortTitle: row.short_title || row.title || "",
      category: row.category || "",
      slug: row.slug || "",
      country: row.country || "",
      city: row.city || "",
      venue: row.location || row.venue || "",
      startDate: row.start_date || "",
      endDate: row.end_date || "",
      time: row.deadline || "",
      timeZone: row.time_zone || "GMT",
      description: row.description || "",
      status: normalizeConferenceStatus(row.status),
      rejectionReason: row.rejection_reason || row.rejectionReason || undefined,
      liveStatus: row.live_status || "Upcoming",
      organizerId: row.organizer_id || "",
      organizerName: row.organizer_name || row.organizerName || "",
      contactEmail: row.organizer_email || row.contactEmail || "",
      organizerWebsite: row.organizer_website || row.organizerWebsite || "",
      conferenceWebsite: row.conference_website || row.organizer_website || "",
      registrationLink: row.registration_link || row.organizer_website || "",
      bannerImage: row.banner_image || "",
      isDeactivated: Boolean(row.is_deactivated ?? row.isDeactivated),
      isVerified: Boolean(row.is_verified),
      isFeatured: Boolean(row.is_featured),
      views: row.views_count || row.views || 0,
      registrationClicks: row.registration_clicks || 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      attendanceType: row.attendance_type || "Offline",
      isOnline: Boolean(row.is_online),
      history: Array.isArray(row.history)
        ? row.history
        : typeof row.history === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(row.history);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : []
    }));
  }

  if (table === "organizers") {
    return data.map((row: any) => {
      const orgName = row.name || row.organizationName || row.organization_name || "";
      const isComplete = Boolean(
        row.is_profile_complete ||
        row.isProfileComplete ||
        (orgName && orgName.trim().length > 0)
      );
      return {
        id: String(row.id),
        authUserId: row.auth_user_id || row.authUserId || undefined,
        email: row.email || "",
        organizationName: orgName,
        contactPerson: row.contact_person || row.contactPerson || "",
        phone: row.phone || "",
        logo: row.logo || "",
        coverImage: row.cover_image || row.coverImage || "",
        organizationWebsite: row.website || row.organizationWebsite || row.organization_website || "",
        aboutOrganization: row.about_organization || row.aboutOrganization || "",
        country: row.country || "",
        city: row.city || "",
        isVerified: Boolean(row.is_verified || row.isVerified),
        isSuspended: Boolean(row.is_suspended || row.isSuspended),
        isFeatured: Boolean(row.is_featured || row.isFeatured),
        isProfileComplete: isComplete,
        slug: row.slug || "",
        twitter: row.twitter || "",
        linkedin: row.linkedin || "",
        facebook: row.facebook || "",
        instagram: row.instagram || "",
        youtube: row.youtube || "",
        whatsapp: row.whatsapp || "",
        telegram: row.telegram || "",
        tiktok: row.tiktok || "",
        github: row.github || "",
        pinterest: row.pinterest || "",
        galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : (Array.isArray(row.galleryImages) ? row.galleryImages : []),
        createdAt: row.created_at || row.createdAt || new Date().toISOString()
      };
    });
  }

  if (table === "subscriber_emails") {
    return data.map((item: any) => ({
      id: item.id,
      email: item.email || "",
      date: item.date || item.created_at || new Date().toLocaleDateString()
    }));
  }

  if (table === "user_feedbacks") {
    return data.map((item: any) => ({
      id: String(item.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
      name: item.name || "",
      image: item.image || "",
      text: item.text || item.message || "",
      rating: typeof item.rating === "number" ? item.rating : 5,
      status: item.status || "Pending",
      date: item.date || item.created_at || new Date().toLocaleDateString(),
      country: item.country || ""
    }));
  }

  if (table === "banners") {
    const items = data.map((item: any) => {
      let statusVal: "Active" | "Inactive" = "Active";
      if (item.status === "Inactive" || item.status === "Deactivated" || item.active === false) {
        statusVal = "Inactive";
      } else if (item.status === "Active" || item.active === true) {
        statusVal = "Active";
      }

      const desc = item.description || item.content || "";
      const img = item.image_url || item.image || "";
      const ord = typeof item.place === "number" ? item.place : (typeof item.order === "number" ? item.order : 1);

      return {
        id: String(item.id),
        title: item.title || "",
        description: desc,
        content: desc,
        image: img,
        image_url: img,
        link: item.link_url || item.link || "",
        status: statusVal,
        active: statusVal === "Active",
        order: ord,
        place: ord
      };
    });

    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of items) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }

  if (table === "banner_contents") {
    return data.map((item: any) => ({
      id: item.id,
      bannerId: item.bannerId || item.banner_id,
      title: item.title || "",
      description: item.content || item.description || "",
      status: item.active ? "Active" : "Deactivated"
    }));
  }

  if (table === "countries" || table === "inactive_countries" || table === "inactive_cities" || table === "inactive_topics") {
    return data
      .map((item: any) => (typeof item === "object" && item !== null ? String(item.name || item.id || "") : String(item || "")))
      .map((s: string) => s.trim().toUpperCase())
      .filter(Boolean);
  }

  if (table === "cities") {
    return data
      .map((item: any) => {
        if (typeof item === "object" && item !== null) {
          return {
            name: String(item.name || item.id || "").trim().toUpperCase(),
            country: String(item.country || "").trim().toUpperCase()
          };
        }
        return { name: String(item || "").trim().toUpperCase(), country: "" };
      })
      .filter((c: any) => Boolean(c.name));
  }

  if (table === "media_partners") {
    return data.map((item: any) => {
      let createdAtIso = new Date().toISOString();
      if (item.created_at) {
        try { createdAtIso = new Date(item.created_at).toISOString(); } catch(e) {}
      } else if (item.submittedAt) {
        try { createdAtIso = new Date(item.submittedAt).toISOString(); } catch(e) {}
      }
      return {
        id: String(item.id || `mp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        name: item.name || "",
        type: item.type || "Media Partner",
        description: String(item.description || "").trim().slice(0, 150),
        logo: item.logo || "",
        website: item.website || "",
        email: item.email || "",
        status: item.status || "Pending",
        created_at: createdAtIso
      };
    });
  }

  if (table === "associates") {
    return data.map((item: any) => {
      let createdAtIso = new Date().toISOString();
      if (item.created_at) {
        try { createdAtIso = new Date(item.created_at).toISOString(); } catch(e) {}
      } else if (item.submittedAt) {
        try { createdAtIso = new Date(item.submittedAt).toISOString(); } catch(e) {}
      }
      return {
        id: String(item.id || `assoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
        name: item.name || "",
        category: item.category || "Associates",
        description: String(item.description || "").trim().slice(0, 150),
        logo: item.logo || "",
        website: item.website || "",
        email: item.email || "",
        status: item.status || "Pending",
        created_at: createdAtIso
      };
    });
  }

  if (table === "topics" || table === "categories") {
    return data.map((item: any) => ({
      id: String(item.id || item.name || ""),
      name: item.name || "",
      icon: item.icon || "Sparkles",
      count: item.count || 0,
      description: item.description || "",
      status: item.status || "Active"
    }));
  }

  if (table === "notifications") {
    return data.map((item: any) => ({
      id: String(item.id),
      organizerId: item.organizer_id || item.organizerId || "ADMIN",
      title: item.title || "",
      message: item.message || "",
      type: item.type || item.notification_type || "info",
      notificationType: item.notification_type || item.notificationType || item.type || "info",
      relatedConferenceId: item.related_conference_id || item.relatedConferenceId || null,
      read: Boolean(item.read !== undefined ? item.read : item.is_read),
      createdAt: item.created_at || item.createdAt || new Date().toISOString()
    }));
  }

  if (table === "audit_logs") {
    return data.map((item: any) => ({
      id: String(item.id),
      timestamp: item.timestamp || item.created_at || item.createdAt || new Date().toISOString(),
      action: String(item.action || ""),
      details: typeof item.details === "string"
        ? item.details
        : item.details == null
          ? ""
          : JSON.stringify(item.details),
      actor: String(item.actor || item.admin_id || item.adminId || "System"),
      role: String(item.role || (item.organizer_id || item.organizerId ? "ORGANIZER" : "ADMIN")),
      conferenceId: item.conference_id || item.conferenceId || null,
      organizerId: item.organizer_id || item.organizerId || null,
      adminId: item.admin_id || item.adminId || "ADMIN"
    }));
  }

  return data;
}

// Request deduplication cache to prevent identical concurrent HTTP requests
const inflightRequests = new Map<string, Promise<any>>();
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // absorb repeated component reads without serving long-stale data

const ADMIN_SERVER_TABLES = new Set([
  "conferences", "organizers", "categories", "banners", "banner_contents",
  "user_feedbacks", "subscriber_emails", "contact_inquiries", "countries", "cities",
  "inactive_countries", "inactive_cities", "inactive_topics", "media_partners", "associates",
  "contact_info", "social_links", "notifications", "audit_logs"
]);

const ADMIN_READ_PREFERRED_TABLES = new Set([
  "conferences", "organizers", "user_feedbacks", "subscriber_emails", "contact_inquiries",
  "media_partners", "associates", "notifications", "audit_logs"
]);

type AdminServerResult = { handled: boolean; success: boolean; data?: any; error?: string };

async function tryAdminServerUpsert(table: string, records: any): Promise<AdminServerResult> {
  if (!ADMIN_SERVER_TABLES.has(table) || typeof fetch === "undefined" || !getAdminTabToken()) return { handled: false, success: false };
  try {
    const response = await adminFetch("/api/admin/db/upsert", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, records }),
    });
    if (response.status === 401) return { handled: false, success: false };
    const body = await response.json().catch(() => ({}));
    return { handled: true, success: response.ok && body.success === true, data: body.data, error: body.error };
  } catch {
    return { handled: false, success: false };
  }
}

async function tryAdminServerDelete(table: string, id: string): Promise<AdminServerResult> {
  if (!ADMIN_SERVER_TABLES.has(table) || typeof fetch === "undefined" || !getAdminTabToken()) return { handled: false, success: false };
  try {
    const response = await adminFetch(`/api/admin/db/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.status === 401) return { handled: false, success: false };
    const body = await response.json().catch(() => ({}));
    return { handled: true, success: response.ok && body.success === true, error: body.error };
  } catch {
    return { handled: false, success: false };
  }
}

async function tryAdminServerRead(table: string): Promise<AdminServerResult> {
  if (!ADMIN_READ_PREFERRED_TABLES.has(table) || typeof fetch === "undefined" || !getAdminTabToken()) return { handled: false, success: false };
  try {
    const response = await adminFetch(`/api/admin/db/${encodeURIComponent(table)}`, { credentials: "same-origin" });
    if (response.status === 401) return { handled: false, success: false };
    const body = await response.json().catch(() => ({}));
    return { handled: true, success: response.ok && body.success === true, data: body.data, error: body.error };
  } catch {
    return { handled: false, success: false };
  }
}

/**
 * Save data to Supabase relational database directly
 */
export async function saveToSupabase(key: string, data: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  // Invalidate cache for this key on save
  queryCache.delete(key);
  inflightRequests.delete(key);

  let success = false;
  const snakeTable = getSnakeTableName(key);

  // Primary source of truth: Upsert directly into dedicated relational table
  try {
    if (Array.isArray(data)) {
  if (data.length > 0) {
    const sanitized = sanitizeForTable(
      snakeTable,
      data
    );

    // Save large arrays in smaller batches.
    // This is especially important for cities imported from Excel.
    const BATCH_SIZE = 200;

    success = true;

    for (
      let start = 0;
      start < sanitized.length;
      start += BATCH_SIZE
    ) {
      const batch = sanitized.slice(
        start,
        start + BATCH_SIZE
      );

      let batchSuccess = false;

      // First try secured Admin API for this batch
      const adminWrite =
        await tryAdminServerUpsert(
          snakeTable,
          batch
        );

      if (adminWrite.handled) {
        if (!adminWrite.success) {
          console.error(
            `[Database Batch Save Error] Table ${snakeTable}, rows ${start + 1}-${Math.min(
              start + batch.length,
              sanitized.length
            )}:`,
            adminWrite.error
          );

          success = false;
          break;
        }

        batchSuccess = true;
      } else {
        // Fallback directly to Supabase
        let currentPayload = [...batch];
        let attempts = 0;

        while (attempts < 10) {
          attempts++;

          const res = await client
            .from(snakeTable)
            .upsert(currentPayload);

          if (!res.error) {
            batchSuccess = true;
            break;
          }

          console.warn(
            `[Supabase Batch Save Notice] Table ${snakeTable} batch ${start + 1}-${Math.min(
              start + batch.length,
              sanitized.length
            )}, attempt ${attempts}:`,
            res.error
          );

          const match =
            res.error.message?.match(
              /Could not find the '([^']+)' column/i
            );

          if (match && match[1]) {
            const badCol = match[1];

            currentPayload =
              currentPayload.map(
                (item: any) => {
                  const cleaned = {
                    ...item
                  };

                  delete cleaned[
                    badCol
                  ];

                  return cleaned;
                }
              );

            continue;
          }

          break;
        }
      }

      if (!batchSuccess) {
        success = false;
        break;
      }

      console.log(
        `[Database Batch Saved] ${snakeTable}: ${Math.min(
          start + batch.length,
          sanitized.length
        )}/${sanitized.length}`
      );
    }
  } else {
    success = true;
  }
}
    else if (typeof data === "object" && data !== null) {
      if (snakeTable === "contact_info") {
        const payload = {
          id: data.id || "primary",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          website: data.website || "",
          updated_at: new Date().toISOString()
        };
        const res = await client.from("contact_info").upsert(payload);
        if (!res.error) success = true;
      } else if (snakeTable === "social_links") {
        const payload = {
          id: data.id || "primary",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          linkedin: data.linkedin || "",
          twitter: data.twitter || "",
          youtube: data.youtube || "",
          other: data.other || "",
          updated_at: new Date().toISOString()
        };
        const res = await client.from("social_links").upsert(payload);
        if (!res.error) success = true;
      }
    }
  } catch (err) {
    console.error("[Supabase Table Sync Error]:", err);
  }

  return success;
}

/**
 * Permanently delete a record from Supabase relational table
 */
export async function deleteFromSupabase(key: string, id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  queryCache.delete(key);
  inflightRequests.delete(key);

  const snakeTable = getSnakeTableName(key);

  try {
    const adminDelete = await tryAdminServerDelete(snakeTable, id);
    if (adminDelete.handled) return adminDelete.success;
    const { error } = await client.from(snakeTable).delete().eq('id', id);
    if (error) {
      console.warn(`[Supabase Delete Error] Table ${snakeTable}, id=${id}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Supabase Delete Notice] key=${key}, id=${id}:`, err);
    return false;
  }
}

/**
 * Save or update a single record in Supabase relational table
 */
export async function saveRecordToSupabase(tableKey: string, record: any): Promise<{ success: boolean; data?: any; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "Supabase client not initialized." };

  const snakeTable = getSnakeTableName(tableKey);
  queryCache.delete(tableKey);
  queryCache.delete(snakeTable);
  inflightRequests.delete(tableKey);
  inflightRequests.delete(snakeTable);

  try {
    const sanitizedArray = sanitizeForTable(snakeTable, [record]);
    const payload = sanitizedArray[0] || record;

    const adminWrite = await tryAdminServerUpsert(snakeTable, payload);
    if (adminWrite.handled) {
      if (!adminWrite.success) return { success: false, error: adminWrite.error || "Admin database write failed." };
      const normalized = normalizeFromTable(snakeTable, adminWrite.data || [payload]);
      return { success: true, data: normalized[0] || payload };
    }

    let currentPayload = { ...payload };
    let data: any[] | null = null;
    let finalError: any = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      let result: any;
      if (snakeTable === "organizers") {
        // Organizer profiles are created by the secured signup endpoint. Browser
        // profile saves are UPDATE-only so RLS does not need a public INSERT path.
        result = await client.from(snakeTable).update(currentPayload).eq("id", String(currentPayload.id)).select();
      } else if (snakeTable === "conferences") {
        // Avoid UPSERT under RLS: PostgreSQL ON CONFLICT requires INSERT
        // privileges even for an existing row. Determine ownership-visible
        // existence first, then perform the correct operation explicitly.
        const existing = await client.from(snakeTable).select("id").eq("id", String(currentPayload.id)).maybeSingle();
        result = existing.data
          ? await client.from(snakeTable).update(currentPayload).eq("id", String(currentPayload.id)).select()
          : await client.from(snakeTable).insert(currentPayload).select();
      } else {
        result = await client.from(snakeTable).upsert(currentPayload).select();
      }
      data = result.data;
      finalError = result.error;
      if (!finalError) break;

      // Support an older live schema by removing only columns that Supabase
      // explicitly reports as absent. Authentication secrets are never written by the browser.
      const missingColumn = finalError.message?.match(/Could not find the '([^']+)' column/i)?.[1];
      if (!missingColumn || !(missingColumn in currentPayload)) break;
      delete currentPayload[missingColumn];
    }
    if (finalError) {
      console.warn(`[Supabase saveRecord Error] Table ${snakeTable}:`, finalError);
      return { success: false, error: finalError.message };
    }

    const normalized = normalizeFromTable(snakeTable, data || [currentPayload]);
    return { success: true, data: normalized[0] || currentPayload };
  } catch (err: any) {
    console.error(`[Supabase saveRecord Exception] Table ${snakeTable}:`, err);
    return { success: false, error: err?.message || "Database write failed." };
  }
}

/**
 * Permanently delete a record from Supabase relational table
 */
export async function deleteRecordFromSupabase(tableKey: string, id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: "Supabase client not initialized." };

  const snakeTable = getSnakeTableName(tableKey);
  queryCache.delete(tableKey);
  queryCache.delete(snakeTable);
  inflightRequests.delete(tableKey);
  inflightRequests.delete(snakeTable);

  try {
    const adminDelete = await tryAdminServerDelete(snakeTable, id);
    if (adminDelete.handled) return adminDelete.success ? { success: true } : { success: false, error: adminDelete.error || "Admin database deletion failed." };
    const { error } = await client.from(snakeTable).delete().eq('id', id);
    if (error) {
      console.warn(`[Supabase deleteRecord Error] Table ${snakeTable}, id=${id}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`[Supabase deleteRecord Exception] Table ${snakeTable}, id=${id}:`, err);
    return { success: false, error: err?.message || "Database deletion failed." };
  }
}

/**
 * Fetch data from Supabase relational database directly
 */
export async function fetchFromSupabase<T = any>(key: string, forceRefresh: boolean = false): Promise<T | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  if (forceRefresh) {
    queryCache.delete(key);
    queryCache.delete(getSnakeTableName(key));
    inflightRequests.delete(key);
    inflightRequests.delete(getSnakeTableName(key));
  } else {
    // Check short-lived cache to prevent identical back-to-back requests
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  // Deduplicate concurrent in-flight requests for the same key
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const fetchPromise = (async (): Promise<T | null> => {
    const snakeTable = getSnakeTableName(key);

    const adminRead = await tryAdminServerRead(snakeTable);
    if (adminRead.handled) {
      inflightRequests.delete(key);
      if (!adminRead.success) return null;
      const normalized = normalizeFromTable(snakeTable, adminRead.data || []) as unknown as T;
      queryCache.set(key, { data: normalized, timestamp: Date.now() });
      return normalized;
    }

    try {
      const { data: tableData, error } = await client.from(snakeTable).select('*');
      if (!error && tableData !== null) {
        const normalized = normalizeFromTable(snakeTable, tableData) as unknown as T;
        queryCache.set(key, { data: normalized, timestamp: Date.now() });
        return normalized;
      }
      if (error) {
        console.warn(`[Supabase Relational Fetch Notice] Table ${snakeTable}:`, error.message);
      }
    } catch (err) {
      console.warn("[Supabase Fetch Error]:", err);
    } finally {
      inflightRequests.delete(key);
    }

    return null;
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

/**
 * Server-side / Database-level paginated conferences query
 * Supports maximum 100 conferences per page with search, filters, and sorting.
 */
export async function fetchPaginatedConferencesFromSupabase(params: {
  page: number;
  pageSize?: number;
  searchTerm?: string;
  category?: string;
  country?: string;
  city?: string;
  liveStatus?: string;
  sortBy?: "Upcoming" | "Newest" | "Latest";
  onlyApproved?: boolean;
}): Promise<{ data: any[]; total: number } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const {
      page = 1,
      pageSize = 100,
      searchTerm = "",
      category = "All",
      country = "All",
      city = "All",
      liveStatus = "All",
      sortBy = "Upcoming",
      onlyApproved = true
    } = params;

    const limit = Math.min(Math.max(1, pageSize), 100);
    const from = (Math.max(1, page) - 1) * limit;
    const to = from + limit - 1;

    let query = client.from("conferences").select("*", { count: "exact" });

    if (onlyApproved) {
      query = query.or("status.eq.Approved,status.eq.Verified");
    }

    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    if (country && country !== "All") {
      query = query.ilike("country", country);
    }

    if (city && city !== "All") {
      query = query.ilike("city", city);
    }

    if (liveStatus && liveStatus !== "All") {
      query = query.eq("live_status", liveStatus);
    }

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim();
      if (term.startsWith("/")) {
        const slashCtry = term.slice(1).trim();
        if (slashCtry) {
          query = query.ilike("country", `%${slashCtry}%`);
        }
      } else {
        query = query.or(`title.ilike.%${term}%,short_title.ilike.%${term}%,description.ilike.%${term}%,city.ilike.%${term}%,country.ilike.%${term}%`);
      }
    }

    if (sortBy === "Newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "Latest") {
      query = query.order("start_date", { ascending: false });
    } else {
      query = query.order("start_date", { ascending: true });
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.warn("[Supabase Paginated Query Notice]:", error);
      return null;
    }

    const normalized = normalizeFromTable("conferences", data || []);
    return {
      data: normalized,
      total: count !== null && count !== undefined ? count : (normalized.length || 0)
    };
  } catch (err) {
    console.warn("[Supabase Paginated Query Error]:", err);
    return null;
  }
}

// Map for debouncing real-time change events per table
const realtimeTimers = new Map<string, any>();

/**
 * Subscribe to realtime updates from Supabase with debouncing
 */
export function subscribeToSupabase(key: string, callback: (newData: any) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const snakeTable = getSnakeTableName(key);
  const channelName = `rt:${snakeTable}:${Math.random().toString(36).substring(7)}`;

  const handleRealtimeChange = () => {
    const existing = realtimeTimers.get(key);
    if (existing) clearTimeout(existing);

    realtimeTimers.set(
      key,
      setTimeout(async () => {
        // Clear cache so we fetch updated data from DB
        queryCache.delete(key);
        inflightRequests.delete(key);
        const fresh = await fetchFromSupabase(key);
        if (fresh !== null) callback(fresh);
      }, 1500)
    );
  };

  const channel = client
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: snakeTable }, handleRealtimeChange)
    .subscribe();

  return () => {
    const timer = realtimeTimers.get(key);
    if (timer) clearTimeout(timer);
    client.removeChannel(channel);
  };
}

/**
 * Supabase Authentication API Helpers
 */
export async function signUpWithSupabase(email: string, password: string, metadata?: Record<string, any>) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  
  // Public signup can ONLY create Organizer accounts
  const sanitizedMetadata = {
    ...(metadata || {}),
    role: "ORGANIZER"
  };

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: sanitizedMetadata
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithSupabase(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

export async function signOutWithSupabase() {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) console.warn("Supabase SignOut error:", error);
}

export async function getCurrentSupabaseUser(): Promise<SupabaseAuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}

export function onSupabaseAuthStateChange(callback: (user: SupabaseAuthUser | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return () => subscription.unsubscribe();
}

/**
 * Upload banner image to Supabase Storage ('banner-images' bucket)
 */
export async function uploadBannerImageToSupabase(
  imageData: string,
  bannerId?: string
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    if (!imageData || !imageData.startsWith("data:")) {
      return { publicUrl: imageData, storagePath: "" };
    }

    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const storagePath = `banner-${bannerId || Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

    const { error: uploadError } = await client.storage
      .from("banner-images")
      .upload(storagePath, blob, {
        contentType: mimeType.includes("jpg") ? "image/jpeg" : mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn("[Supabase Storage Banner Upload Notice]:", uploadError);
      return null;
    }

    const { data: urlData } = client.storage.from("banner-images").getPublicUrl(storagePath);
    return { publicUrl: urlData.publicUrl, storagePath };
  } catch (err) {
    console.error("[Supabase Storage Banner Upload Error]:", err);
    return null;
  }
}

/**
 * Extract bucket and path from Supabase storage URL
 */
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

/**
 * Delete a banner image from Supabase Storage
 */
export async function deleteBannerImageFromSupabase(storagePathOrUrl: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !storagePathOrUrl) return false;

  try {
    let pathToDelete = storagePathOrUrl;
    if (storagePathOrUrl.startsWith("http")) {
      const info = extractStoragePathFromUrl(storagePathOrUrl);
      if (info && info.bucket === "banner-images") {
        pathToDelete = info.path;
      } else {
        return false;
      }
    }

    const { error } = await client.storage.from("banner-images").remove([pathToDelete]);
    if (error) {
      console.warn("[Supabase Storage Banner Delete Warning]:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Supabase Storage Banner Delete Error]:", err);
    return false;
  }
}
