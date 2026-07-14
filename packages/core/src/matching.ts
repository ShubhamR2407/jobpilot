// Job-matching helpers, ported from the Python JobAlert `sources/base.py`.
// Pure functions — no I/O — so they are easy to unit-test (Step 5).

/**
 * Regions the user does NOT want, even in "multi" mode. Tuned for a target of
 * India + US + Japan + Europe + global-remote — so US/UK/EU/Japan are absent here;
 * the unwanted rest (Canada, LatAm, Australia, other-Asia, Middle East, Africa)
 * are listed so they get filtered out.
 */
export const DEFAULT_EXCLUDE_LOCATIONS: readonly string[] = [
  "canada",
  "toronto",
  "vancouver",
  "montreal",
  "ottawa",
  "calgary",
  "edmonton",
  "ontario",
  "british columbia",
  "quebec",
  "alberta",
  "can-remote",
  "mexico",
  "guadalajara",
  "brazil",
  "sao paulo",
  "argentina",
  "buenos aires",
  "colombia",
  "bogota",
  "chile",
  "peru",
  "costa rica",
  "latam",
  "australia",
  "sydney",
  "melbourne",
  "new zealand",
  "singapore",
  "philippines",
  "manila",
  "vietnam",
  "indonesia",
  "jakarta",
  "thailand",
  "bangkok",
  "malaysia",
  "kuala lumpur",
  "china",
  "shanghai",
  "beijing",
  "shenzhen",
  "hong kong",
  "taiwan",
  "taipei",
  "korea",
  "seoul",
  "uae",
  "dubai",
  "abu dhabi",
  "saudi",
  "riyadh",
  "qatar",
  "doha",
  "egypt",
  "cairo",
  "nigeria",
  "lagos",
  "kenya",
  "nairobi",
  "south africa",
  "turkey",
  "istanbul",
  "pakistan",
  "bangladesh",
  "sri lanka",
];

/** India location tokens, used to split India vs out-of-India. */
export const INDIA_TOKENS: readonly string[] = [
  "india",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "pune",
  "gurgaon",
  "gurugram",
  "noida",
  "delhi",
  "mumbai",
  "chennai",
  "kolkata",
  "ahmedabad",
  "jaipur",
  "indore",
  "kochi",
  "coimbatore",
  "chandigarh",
];

// Generic remote words: they must NOT override an explicit unwanted region
// (e.g. "Remote in Canada" is still rejected). Named target places do.
const GENERIC_REMOTE = ["remote", "global", "worldwide", "anywhere"];

// US/USA/UK written as short codes, so "Remote (US/Canada)" counts as US-eligible.
const STRONG_ALLOW_RE = /\b(u\.?s\.?a?|u\.?k\.?)\b/i;

/** A job matches if its title contains any keyword (case-insensitive). */
export function titleMatches(
  title: string,
  keywords: readonly string[],
): boolean {
  const t = (title || "").toLowerCase();
  return keywords.some((k) => t.includes(k.toLowerCase()));
}

/** True if the title contains any exclude keyword (seniority / off-stack noise). */
export function titleExcluded(
  title: string,
  excludeKeywords: readonly string[],
): boolean {
  const t = (title || "").toLowerCase();
  return excludeKeywords.some((k) => t.includes(k.toLowerCase()));
}

export type LocationMode = "multi" | "strict";

/**
 * Decide whether a location is acceptable.
 *   "multi"  = accept anywhere except explicitly-unwanted regions (broad net)
 *   "strict" = accept only places in the allow-list
 */
export function locationMatches(
  location: string,
  allowed: readonly string[],
  excluded: readonly string[] = DEFAULT_EXCLUDE_LOCATIONS,
  mode: LocationMode = "multi",
): boolean {
  // Empty/unknown location passes (many "Remote" roles omit it).
  if (!location) return true;
  const loc = location.toLowerCase();

  // 1. Named target place (India city, US, Japan, a European country) → accept,
  //    overriding any block. Generic "remote" is excluded here so it can't
  //    rescue an otherwise-unwanted region.
  const strong = allowed
    .map((a) => a.toLowerCase())
    .filter((a) => !GENERIC_REMOTE.includes(a));
  if (strong.some((a) => loc.includes(a)) || STRONG_ALLOW_RE.test(loc))
    return true;

  // 2. Explicitly unwanted region → reject.
  if (excluded.some((x) => loc.includes(x))) return false;

  // 3. Generic remote with no country → accept.
  if (GENERIC_REMOTE.some((g) => loc.includes(g))) return true;

  // 4. Unknown place: "multi" casts a wide net; "strict" rejects.
  return mode === "multi";
}

// Matches "5+ years", "4 to 7 years", "4-7 yrs", "5 years experience", etc.
const EXP_RE =
  /(\d+)\s*(?:\+|to\s*\d+\+?|[-–]\s*\d+\+?)?\s*\+?\s*(?:years?|yrs?)/i;

/**
 * Best-effort: if a min experience is stated and exceeds maxYears, skip.
 * When no experience is mentioned we let the job through.
 */
export function experienceOk(text: string, maxYears: number): boolean {
  if (!text || !maxYears) return true;
  const m = EXP_RE.exec(text);
  if (!m || m[1] === undefined) return true;
  return parseInt(m[1], 10) <= maxYears;
}

// Workday collapses multi-city postings to a place-less marker — "2 Locations",
// "Multiple Locations" — with no country to key on. Treated as location-unknown
// so, per the India-first preference, they land in the India view rather than
// being hidden in Global. (Other ATS sources emit real location strings, so in
// practice this only catches Workday's collapsed listings.)
const AMBIGUOUS_MULTI_RE = /^\s*(?:\d+|multiple)\s+locations?\s*$/i;

/** India-eligible? True for India cities, country-less remote roles, and
 * place-less multi-location markers (India-first preference). */
export function isIndiaLocation(location: string): boolean {
  if (!location) return true; // unknown → treat as India-eligible (often remote)
  const loc = location.toLowerCase();
  if (INDIA_TOKENS.some((t) => loc.includes(t))) return true;
  if (AMBIGUOUS_MULTI_RE.test(location)) return true; // "2 Locations" → unknown
  // Generic remote with no country named (e.g. "Remote", "Worldwide") → eligible.
  let stripped = loc;
  for (const g of GENERIC_REMOTE) stripped = stripped.replaceAll(g, "");
  return stripped.replace(/[^a-z]/g, "") === "";
}
