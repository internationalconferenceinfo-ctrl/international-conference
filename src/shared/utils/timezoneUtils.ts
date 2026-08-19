const LOCATION_TIMEZONES: Record<string, string> = {
  INDIA: "Asia/Kolkata", "NEW DELHI": "Asia/Kolkata", DELHI: "Asia/Kolkata", MUMBAI: "Asia/Kolkata", BANGALORE: "Asia/Kolkata", BENGALURU: "Asia/Kolkata", CHENNAI: "Asia/Kolkata", HYDERABAD: "Asia/Kolkata", KOLKATA: "Asia/Kolkata",
  JAPAN: "Asia/Tokyo", TOKYO: "Asia/Tokyo", OSAKA: "Asia/Tokyo", KYOTO: "Asia/Tokyo",
  SINGAPORE: "Asia/Singapore",
  CHINA: "Asia/Shanghai", BEIJING: "Asia/Shanghai", SHANGHAI: "Asia/Shanghai", SHENZHEN: "Asia/Shanghai",
  "HONG KONG": "Asia/Hong_Kong", TAIWAN: "Asia/Taipei", TAIPEI: "Asia/Taipei",
  "SOUTH KOREA": "Asia/Seoul", KOREA: "Asia/Seoul", SEOUL: "Asia/Seoul",
  MALAYSIA: "Asia/Kuala_Lumpur", "KUALA LUMPUR": "Asia/Kuala_Lumpur",
  INDONESIA: "Asia/Jakarta", JAKARTA: "Asia/Jakarta", BALI: "Asia/Makassar",
  THAILAND: "Asia/Bangkok", BANGKOK: "Asia/Bangkok", VIETNAM: "Asia/Ho_Chi_Minh", HANOI: "Asia/Ho_Chi_Minh", "HO CHI MINH": "Asia/Ho_Chi_Minh",
  PHILIPPINES: "Asia/Manila", MANILA: "Asia/Manila", PAKISTAN: "Asia/Karachi", KARACHI: "Asia/Karachi", BANGLADESH: "Asia/Dhaka", DHAKA: "Asia/Dhaka", NEPAL: "Asia/Kathmandu", KATHMANDU: "Asia/Kathmandu", "SRI LANKA": "Asia/Colombo", COLOMBO: "Asia/Colombo",
  UAE: "Asia/Dubai", "UNITED ARAB EMIRATES": "Asia/Dubai", DUBAI: "Asia/Dubai", "ABU DHABI": "Asia/Dubai", "SAUDI ARABIA": "Asia/Riyadh", RIYADH: "Asia/Riyadh", JEDDAH: "Asia/Riyadh", QATAR: "Asia/Qatar", DOHA: "Asia/Qatar",
  TURKEY: "Europe/Istanbul", ISTANBUL: "Europe/Istanbul", ISRAEL: "Asia/Jerusalem", "TEL AVIV": "Asia/Jerusalem",
  UK: "Europe/London", "UNITED KINGDOM": "Europe/London", ENGLAND: "Europe/London", LONDON: "Europe/London",
  GERMANY: "Europe/Berlin", BERLIN: "Europe/Berlin", FRANKFURT: "Europe/Berlin", MUNICH: "Europe/Berlin",
  FRANCE: "Europe/Paris", PARIS: "Europe/Paris", ITALY: "Europe/Rome", ROME: "Europe/Rome", MILAN: "Europe/Rome", SPAIN: "Europe/Madrid", MADRID: "Europe/Madrid", BARCELONA: "Europe/Madrid",
  NETHERLANDS: "Europe/Amsterdam", AMSTERDAM: "Europe/Amsterdam", SWITZERLAND: "Europe/Zurich", ZURICH: "Europe/Zurich", GENEVA: "Europe/Zurich", AUSTRIA: "Europe/Vienna", VIENNA: "Europe/Vienna", BELGIUM: "Europe/Brussels", BRUSSELS: "Europe/Brussels",
  SWEDEN: "Europe/Stockholm", STOCKHOLM: "Europe/Stockholm", NORWAY: "Europe/Oslo", OSLO: "Europe/Oslo", POLAND: "Europe/Warsaw", WARSAW: "Europe/Warsaw", GREECE: "Europe/Athens", ATHENS: "Europe/Athens", RUSSIA: "Europe/Moscow", MOSCOW: "Europe/Moscow",
  USA: "America/New_York", US: "America/New_York", "UNITED STATES": "America/New_York", "NEW YORK": "America/New_York", WASHINGTON: "America/New_York", CHICAGO: "America/Chicago", "LOS ANGELES": "America/Los_Angeles", "SAN FRANCISCO": "America/Los_Angeles",
  CANADA: "America/Toronto", TORONTO: "America/Toronto", VANCOUVER: "America/Vancouver", MEXICO: "America/Mexico_City",
  AUSTRALIA: "Australia/Sydney", SYDNEY: "Australia/Sydney", MELBOURNE: "Australia/Melbourne", BRISBANE: "Australia/Brisbane", PERTH: "Australia/Perth", ADELAIDE: "Australia/Adelaide",
  "NEW ZEALAND": "Pacific/Auckland", AUCKLAND: "Pacific/Auckland", WELLINGTON: "Pacific/Auckland",
  EGYPT: "Africa/Cairo", CAIRO: "Africa/Cairo", "SOUTH AFRICA": "Africa/Johannesburg", JOHANNESBURG: "Africa/Johannesburg", "CAPE TOWN": "Africa/Johannesburg", NIGERIA: "Africa/Lagos", LAGOS: "Africa/Lagos", KENYA: "Africa/Nairobi", NAIROBI: "Africa/Nairobi", MOROCCO: "Africa/Casablanca", CASABLANCA: "Africa/Casablanca",
  BRAZIL: "America/Sao_Paulo", "SAO PAULO": "America/Sao_Paulo", "RIO DE JANEIRO": "America/Sao_Paulo", ARGENTINA: "America/Argentina/Buenos_Aires", "BUENOS AIRES": "America/Argentina/Buenos_Aires", CHILE: "America/Santiago", SANTIAGO: "America/Santiago", COLOMBIA: "America/Bogota", BOGOTA: "America/Bogota", PERU: "America/Lima", LIMA: "America/Lima",
};

const isValidIanaZone = (zone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format();
    return zone.includes("/");
  } catch {
    return false;
  }
};

export function resolveConferenceTimeZone(timeZone?: string, country?: string, city?: string): string {
  const explicit = String(timeZone || "").trim();
  if (explicit && isValidIanaZone(explicit)) return explicit;
  const cityKey = String(city || "").trim().toUpperCase();
  if (LOCATION_TIMEZONES[cityKey]) return LOCATION_TIMEZONES[cityKey];
  const countryKey = String(country || "").trim().toUpperCase();
  if (LOCATION_TIMEZONES[countryKey]) return LOCATION_TIMEZONES[countryKey];
  const explicitKey = explicit.toUpperCase();
  const hintedLocation = Object.keys(LOCATION_TIMEZONES).find((key) => explicitKey.includes(key));
  return hintedLocation ? LOCATION_TIMEZONES[hintedLocation] : "Asia/Kolkata";
}

function getOffsetMilliseconds(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values: Record<string, number> = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = Number(part.value);
  const representedUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return representedUtc - Math.floor(timestamp / 1000) * 1000;
}

export function getIanaDateBoundaryTimestamp(
  dateValue: string | undefined,
  timeZone: string,
  boundary: "start" | "end"
): number | null {
  if (!dateValue) return null;
  const match = String(dateValue).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!match) return null;
  const wallClockUtc = Date.UTC(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]),
    boundary === "start" ? 0 : 23,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 999
  );
  let result = wallClockUtc - getOffsetMilliseconds(wallClockUtc, timeZone);
  result = wallClockUtc - getOffsetMilliseconds(result, timeZone);
  return result;
}
