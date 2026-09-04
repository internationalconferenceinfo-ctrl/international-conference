const timezoneCache = new Map<string, string>();

const normalizeLocationName = (value?: string): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ");

const COUNTRY_ALIASES: Record<string, string> = {
  US: "UNITED STATES OF AMERICA",
  USA: "UNITED STATES OF AMERICA",
  "UNITED STATES": "UNITED STATES OF AMERICA",

  UK: "UNITED KINGDOM",
  GB: "UNITED KINGDOM",
  GBR: "UNITED KINGDOM",
  "GREAT BRITAIN": "UNITED KINGDOM",

  UAE: "UNITED ARAB EMIRATES",
  AE: "UNITED ARAB EMIRATES",
  ARE: "UNITED ARAB EMIRATES",
};

const normalizeCountry = (value?: string): string => {
  const normalized = normalizeLocationName(value);

  return COUNTRY_ALIASES[normalized] || normalized;
};

const isValidIanaTimeZone = (value?: string): boolean => {
  const zone = String(value || "").trim();

  if (!zone) return false;

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
    }).format();

    return zone.includes("/");
  } catch {
    return false;
  }
};

const detectSingleCountryTimeZone = async (
  country?: string
): Promise<string> => {
  const normalizedCountry =
    normalizeCountry(country);

  if (!normalizedCountry) {
    return "";
  }

  try {
    const countryTimezones =
      await import("countries-and-timezones");

    const countries =
      countryTimezones.getAllCountries();

    const matchingCountry = Object.values(
      countries
    ).find((item) => {
      const itemName =
        normalizeCountry(item.name);

      const itemId =
        normalizeLocationName(item.id);

      const requestedCountry =
        normalizeLocationName(country);

      return (
        itemName === normalizedCountry ||
        itemId === requestedCountry
      );
    });

    if (!matchingCountry) {
      return "";
    }

    const countryId = String(
      matchingCountry.id || ""
    )
      .trim()
      .toUpperCase();

    const currentZones =
      countryTimezones.getTimezonesForCountry(
        countryId
      ) || [];

    const validCurrentZones =
      currentZones.filter((zone) =>
        isValidIanaTimeZone(zone.name)
      );

    /*
     * Never guess for a country that has
     * multiple current timezones.
     */
    if (validCurrentZones.length !== 1) {
      return "";
    }

    const currentZone =
      validCurrentZones[0];

    const currentZoneCountries =
      Array.isArray(currentZone.countries)
        ? currentZone.countries.map((value) =>
            String(value || "")
              .trim()
              .toUpperCase()
          )
        : [];

    /*
     * Normal case:
     * the current timezone belongs directly
     * to this country.
     */
    if (
      currentZoneCountries.length === 1 &&
      currentZoneCountries[0] === countryId
    ) {
      return currentZone.name;
    }

    /*
     * Some modern IANA zones are shared
     * between several countries.
     *
     * Look for a country-specific geographic
     * alias such as Atlantic/Reykjavik.
     */
    const allCountryZones =
      countryTimezones.getTimezonesForCountry(
        countryId,
        {
          deprecated: true
        }
      ) || [];

    const geographicAlias =
      allCountryZones.find((zone) => {
        const zoneName =
          String(zone.name || "").trim();

        const zoneCountries =
          Array.isArray(zone.countries)
            ? zone.countries.map((value) =>
                String(value || "")
                  .trim()
                  .toUpperCase()
              )
            : [];

        return (
          zone.aliasOf === currentZone.name &&
          zoneName.includes("/") &&
          isValidIanaTimeZone(zoneName) &&
          zoneCountries.length === 1 &&
          zoneCountries[0] === countryId
        );
      });

    if (geographicAlias) {
      return geographicAlias.name;
    }

    return currentZone.name;
  } catch (error) {
    console.error(
      `Country timezone detection failed for ${normalizedCountry}:`,
      error
    );

    return "";
  }
};


export async function detectCityTimeZone(
  city?: string,
  country?: string
): Promise<string> {
  const cityName =
    normalizeLocationName(city);

  const countryName =
    normalizeCountry(country);

  if (!cityName) {
    return "";
  }

  const cacheKey =
    `${countryName}:::${cityName}`;

  if (timezoneCache.has(cacheKey)) {
    return (
      timezoneCache.get(cacheKey) || ""
    );
  }

  try {
    const cityTimezones =
      await import("city-timezones");

    const matches =
      cityTimezones.lookupViaCity(cityName) || [];

    if (matches.length > 0) {
      const countryMatch =
        matches.find((match) => {
          const matchCountry =
            normalizeCountry(match.country);

          const iso2 =
            normalizeLocationName(
              match.iso2
            );

          const iso3 =
            normalizeLocationName(
              match.iso3
            );

          const requestedCountry =
            normalizeLocationName(
              country
            );

          return (
            !countryName ||
            matchCountry === countryName ||
            iso2 === requestedCountry ||
            iso3 === requestedCountry
          );
        });

      if (
        countryMatch &&
        isValidIanaTimeZone(
          countryMatch.timezone
        )
      ) {
        timezoneCache.set(
          cacheKey,
          countryMatch.timezone
        );

        return countryMatch.timezone;
      }

      /*
       * If every matching city record has
       * exactly the same timezone, it is
       * also safe to use.
       */
      const validCityTimeZones =
        Array.from(
          new Set(
            matches
              .map((match) =>
                String(
                  match.timezone || ""
                ).trim()
              )
              .filter(
                isValidIanaTimeZone
              )
          )
        );

      if (
      !countryName &&
      validCityTimeZones.length === 1
    ) {
        const detected =
          validCityTimeZones[0];

        timezoneCache.set(
          cacheKey,
          detected
        );

        return detected;
      }
    }

    /*
     * City was not safely resolved.
     * Fall back only when the country
     * itself has exactly one timezone.
     */
    const countryTimeZone =
      await detectSingleCountryTimeZone(
        country
      );

    timezoneCache.set(
      cacheKey,
      countryTimeZone
    );

    return countryTimeZone;
  } catch (error) {
    console.error(
      `Timezone detection failed for ${cityName}, ${countryName}:`,
      error
    );

    return "";
  }
}