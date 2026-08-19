import { Conference, OrganizerProfile } from "../types";

export const slugify = (text: string): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const generateUniqueConferenceSlug = (
  title: string,
  existingConferences: Conference[],
  currentConfId?: string,
  existingSlug?: string
): string => {
  if (existingSlug && existingSlug.trim() !== "") {
    const isConflict = existingConferences.some(
      (c) => c.id !== currentConfId && c.slug && c.slug.toLowerCase() === existingSlug.toLowerCase()
    );
    if (!isConflict) {
      return existingSlug;
    }
  }

  const baseSlug = slugify(title) || "conference";
  let candidateSlug = baseSlug;

  if (
    existingConferences.some(
      (c) =>
        c.id !== currentConfId &&
        ((c.slug && c.slug.toLowerCase() === candidateSlug.toLowerCase()) ||
          (!c.slug && slugify(c.title || "").toLowerCase() === candidateSlug.toLowerCase()))
    )
  ) {
    let counter = 1;
    while (
      existingConferences.some(
        (c) =>
          c.id !== currentConfId &&
          ((c.slug && c.slug.toLowerCase() === `${baseSlug}-${counter}`.toLowerCase()) ||
            (!c.slug && slugify(c.title || "").toLowerCase() === `${baseSlug}-${counter}`.toLowerCase()))
      )
    ) {
      counter++;
    }
    candidateSlug = `${baseSlug}-${counter}`;
  }

  return candidateSlug;
};

export const ensureConferenceSlugs = (conferencesList: Conference[]): Conference[] => {
  if (!Array.isArray(conferencesList)) return [];

  const assignedSlugs = new Set<string>();

  return conferencesList.map((conf) => {
    let currentSlug = conf.slug;

    if (!currentSlug || assignedSlugs.has(currentSlug.toLowerCase())) {
      const baseSlug = slugify(conf.title || conf.shortTitle) || "conference";
      let candidate = baseSlug;
      if (assignedSlugs.has(candidate.toLowerCase())) {
        let counter = 1;
        while (assignedSlugs.has(`${baseSlug}-${counter}`.toLowerCase())) {
          counter++;
        }
        candidate = `${baseSlug}-${counter}`;
      }
      currentSlug = candidate;
    }

    assignedSlugs.add(currentSlug.toLowerCase());

    if (conf.slug !== currentSlug) {
      return { ...conf, slug: currentSlug };
    }
    return conf;
  });
};

export const getConferenceSlug = (conf: Conference, allConferences?: Conference[]): string => {
  if (allConferences && allConferences.length > 0) {
    // Public URLs are allocated only among approved conferences. A pending,
    // rejected or draft duplicate must not add a numeric suffix to a live URL.
    if (String(conf.status).toLowerCase() === "approved") {
      const publicConferences = allConferences.filter(
        (item) => String(item.status).toLowerCase() === "approved"
      );
      const sameTitle = publicConferences
        .filter((item) => slugify(item.title || item.shortTitle) === slugify(conf.title || conf.shortTitle))
        .sort((a, b) => {
          const dateOrder = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
          return dateOrder || String(a.id).localeCompare(String(b.id));
        });
      const publicIndex = sameTitle.findIndex((item) => item.id === conf.id);
      if (publicIndex >= 0) {
        const baseSlug = slugify(conf.title || conf.shortTitle) || "conference";
        return publicIndex === 0 ? baseSlug : `${baseSlug}-${publicIndex}`;
      }
    }
    const listWithSlugs = ensureConferenceSlugs(allConferences);
    const found = listWithSlugs.find((c) => c.id === conf.id);
    if (found?.slug) return found.slug;
  }
  if (conf.slug) return conf.slug;
  return slugify(conf.title || conf.shortTitle || "") || conf.id;
};

export const generateUniqueOrganizerSlug = (
  name: string,
  existingOrganizers: OrganizerProfile[],
  currentOrgId?: string
): string => {
  const baseSlug = slugify(name) || "organizer";
  let candidateSlug = baseSlug;
  let counter = 1;

  while (
    existingOrganizers.some(
      (o) => o.id !== currentOrgId && o.slug && o.slug.toLowerCase() === candidateSlug.toLowerCase()
    )
  ) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return candidateSlug;
};

export const ensureOrganizerSlugs = (organizersList: OrganizerProfile[]): OrganizerProfile[] => {
  if (!Array.isArray(organizersList)) return [];

  const assignedSlugs = new Set<string>();

  return organizersList.map((org) => {
    let currentSlug = org.slug;

    if (!currentSlug || assignedSlugs.has(currentSlug.toLowerCase())) {
      const baseSlug = slugify(org.organizationName) || "organizer";
      let candidate = baseSlug;
      let counter = 1;
      while (assignedSlugs.has(candidate.toLowerCase())) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      currentSlug = candidate;
    }

    assignedSlugs.add(currentSlug.toLowerCase());

    if (org.slug !== currentSlug) {
      return { ...org, slug: currentSlug };
    }
    return org;
  });
};

export const getOrganizerSlug = (org: OrganizerProfile, allOrganizers?: OrganizerProfile[]): string => {
  if (org.slug) return org.slug;
  if (allOrganizers && allOrganizers.length > 0) {
    const listWithSlugs = ensureOrganizerSlugs(allOrganizers);
    const found = listWithSlugs.find((o) => o.id === org.id);
    if (found?.slug) return found.slug;
  }
  return slugify(org.organizationName) || org.id;
};
