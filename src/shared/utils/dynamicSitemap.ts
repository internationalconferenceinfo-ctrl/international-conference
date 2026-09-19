import type { SupabaseClient } from "@supabase/supabase-js";

const BASE_URL =
  "https://www.internationalconference.info";

export const MAX_URLS_PER_SITEMAP = 10000;

const CACHE_TTL_MS = 5 * 60 * 1000;

let sitemapCache:
  | {
      urls: string[];
      expiresAt: number;
    }
  | null = null;

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const xmlEscape = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function fetchAll(
  supabase: SupabaseClient,
  table: string,
  columns: string
): Promise<any[]> {
  const pageSize = 1000;
  const rows: any[] = [];

  for (
    let from = 0;
    ;
    from += pageSize
  ) {
    const { data, error } =
      await supabase
        .from(table)
        .select(columns)
        .range(
          from,
          from + pageSize - 1
        );

    if (error) {
      throw new Error(
        `${table}: ${error.message}`
      );
    }

    const pageRows =
      Array.isArray(data) ? data : [];

    rows.push(...pageRows);

    if (pageRows.length < pageSize) {
      break;
    }
  }

  return rows;
}

async function buildUrls(
  supabase: SupabaseClient
): Promise<string[]> {
  const [conferences, organizers] =
    await Promise.all([
      fetchAll(
        supabase,
        "conferences_public",
        "slug,country,city,category"
      ),
      fetchAll(
        supabase,
        "organizers_public",
        "slug"
      ),
    ]);

  const urls = new Set<string>();

  const add = (...segments: string[]) => {
    const clean = segments
      .filter(Boolean)
      .map((segment) =>
        String(segment).replace(
          /^\/+|\/+$/g,
          ""
        )
      )
      .filter(Boolean);

    urls.add(
      clean.length
        ? `${BASE_URL}/${clean.join("/")}`
        : `${BASE_URL}/`
    );
  };

  [
    [],
    ["conferences"],
    ["organizers"],
    ["about-us"],
    ["media-partner"],
    ["associates"],
    ["contact-us"],
    ["testimonials"],
    ["privacy-policy"],
    ["terms-of-service"],
  ].forEach((parts) =>
    add(...parts)
  );

  for (const conference of conferences) {
    const conferenceSlug =
      String(
        conference.slug || ""
      ).trim();

    if (conferenceSlug) {
      add(
        "conference",
        conferenceSlug
      );
    }
  }

  for (const organizer of organizers) {
    const organizerSlug =
      String(
        organizer.slug || ""
      ).trim();

    if (organizerSlug) {
      add(
        "organizers",
        organizerSlug
      );
    }
  }

  for (const conference of conferences) {
    const country =
      slugify(conference.country);

    const city =
      slugify(conference.city);

    const topic =
      slugify(conference.category);

    if (country) add(country);
    if (city) add(city);
    if (topic) add(topic);

    if (country && city) {
      add(country, city);
    }

    if (country && topic) {
      add(country, topic);
    }

if (city && topic) {
  add(topic, city);
}

    if (
      country &&
      city &&
      topic
    ) {
      add(
        country,
        city,
        topic
      );
    }
  }

  return [...urls].sort();
}

export async function getDynamicSitemapUrls(
  supabase: SupabaseClient
): Promise<string[]> {
  const now = Date.now();

  if (
    sitemapCache &&
    sitemapCache.expiresAt > now
  ) {
    return sitemapCache.urls;
  }

  const urls =
    await buildUrls(supabase);

  sitemapCache = {
    urls,
    expiresAt:
      now + CACHE_TTL_MS,
  };

  return urls;
}

export function renderSitemapIndex(
  urlCount: number
): string {
  const sitemapCount =
    Math.max(
      1,
      Math.ceil(
        urlCount /
          MAX_URLS_PER_SITEMAP
      )
    );

  const lines = Array.from(
    { length: sitemapCount },
    (_, index) =>
      `  <sitemap><loc>${BASE_URL}/sitemaps/sitemap-${index + 1}.xml</loc></sitemap>`
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...lines,
    "</sitemapindex>",
    "",
  ].join("\n");
}

export function renderSitemapPage(
  urls: string[],
  sitemapNumber: number
): string | null {
  if (
    !Number.isInteger(sitemapNumber) ||
    sitemapNumber < 1
  ) {
    return null;
  }

  const start =
    (sitemapNumber - 1) *
    MAX_URLS_PER_SITEMAP;

  if (start >= urls.length) {
    return null;
  }

  const chunk = urls.slice(
    start,
    start +
      MAX_URLS_PER_SITEMAP
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...chunk.map(
      (url) =>
        `  <url><loc>${xmlEscape(url)}</loc></url>`
    ),
    "</urlset>",
    "",
  ].join("\n");
}
