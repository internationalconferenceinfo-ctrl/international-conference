import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ quiet: true });

const BASE_URL = "https://www.internationalconference.info";
const OUTPUT_DIR = path.resolve("public", "sitemaps");
const INDEX_FILE = path.resolve("public", "sitemaps.xml");

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or anon key.");
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const xmlEscape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function fetchAll(table, columns) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(
        `${table}: ${error.message}`
      );
    }

    rows.push(...(data || []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return rows;
}

const [
  conferences,
  organizers
] = await Promise.all([
  fetchAll(
    "conferences_public",
    "slug,country,city,category"
  ),
  fetchAll(
    "organizers_public",
    "slug"
  ),
]);

const urls = new Set();

const add = (...segments) => {
  const clean = segments
    .filter(Boolean)
    .map((segment) =>
      String(segment)
        .replace(/^\/+|\/+$/g, "")
    )
    .filter(Boolean);

  urls.add(
    clean.length
      ? `${BASE_URL}/${clean.join("/")}`
      : `${BASE_URL}/`
  );
};

/* Canonical public/static pages */
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
].forEach((parts) => add(...parts));

/* Real conference pages */
for (const conference of conferences) {
  const conferenceSlug =
    String(conference.slug || "").trim();

  if (conferenceSlug) {
    add("conference", conferenceSlug);
  }
}

/* Real organizer pages */
for (const organizer of organizers) {
  const organizerSlug =
    String(organizer.slug || "").trim();

  if (organizerSlug) {
    add("organizers", organizerSlug);
  }
}

/*
 * Discovery URLs are created only from combinations
 * that actually occur in public conferences.
 */
for (const conference of conferences) {
  const country = slugify(conference.country);
  const city = slugify(conference.city);
  const topic = slugify(conference.category);

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
    add(city, topic);
  }

  if (country && city && topic) {
    add(country, city, topic);
  }
}

const sortedUrls = [...urls].sort();

await fs.rm(OUTPUT_DIR, {
  recursive: true,
  force: true,
});

await fs.mkdir(OUTPUT_DIR, {
  recursive: true,
});

const MAX_URLS_PER_FILE = 10000;
const sitemapFiles = [];

for (
  let offset = 0;
  offset < sortedUrls.length;
  offset += MAX_URLS_PER_FILE
) {
  const chunk = sortedUrls.slice(
    offset,
    offset + MAX_URLS_PER_FILE
  );

  const number =
    sitemapFiles.length + 1;

  const filename =
    `sitemap-${number}.xml`;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...chunk.map(
      (url) =>
        `  <url><loc>${xmlEscape(url)}</loc></url>`
    ),
    "</urlset>",
    "",
  ].join("\n");

  await fs.writeFile(
    path.join(OUTPUT_DIR, filename),
    xml,
    "utf8"
  );

  sitemapFiles.push(filename);
}

const sitemapIndex = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapFiles.map(
    (filename) =>
      `  <sitemap><loc>${BASE_URL}/sitemaps/${filename}</loc></sitemap>`
  ),
  "</sitemapindex>",
  "",
].join("\n");

await fs.writeFile(
  INDEX_FILE,
  sitemapIndex,
  "utf8"
);

console.log(
  `Generated ${sortedUrls.length} unique URLs`
);

console.log(
  `Generated ${sitemapFiles.length} sitemap file(s)`
);

console.log(
  `Conferences: ${conferences.length}`
);

console.log(
  `Organizers: ${organizers.length}`
);