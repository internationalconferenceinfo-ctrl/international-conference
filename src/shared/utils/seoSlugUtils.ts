export const seoSlugify = (value = ""): string =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const COUNTRY_SLUG_ALIASES: Record<string, string> = {
  USA: "usa",
  UK: "uk",
  "UNITED ARAB EMIRATES": "uae",
};

export const getSeoCountrySlug = (country = ""): string => {
  const normalized = String(country || "").trim().toUpperCase();
  return COUNTRY_SLUG_ALIASES[normalized] || seoSlugify(country);
};

export const getSeoCategorySlug = (category = ""): string => {
  const normalized = String(category || "").trim().toUpperCase();

  if (
    normalized === "ARTIFICIAL INTELLIGENCE & ML" ||
    normalized === "ARTIFICIAL INTELLIGENCE"
  ) {
    return "artificial-intelligence";
  }

  return seoSlugify(category);
};
