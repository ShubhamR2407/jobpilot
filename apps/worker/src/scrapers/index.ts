import { type ScrapedJob, titleExcluded, experienceOk } from "@jobpilot/core";
import { EXCLUDE_TITLE_KEYWORDS, MAX_EXPERIENCE_YEARS } from "../config.js";
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeWorkday } from "./workday.js";

/** Run all ATS scrapers, apply post-filters, and dedup within the run. */
export async function runAllScrapers(): Promise<ScrapedJob[]> {
  const results = await Promise.allSettled([
    scrapeGreenhouse(),
    scrapeLever(),
    scrapeAshby(),
    scrapeWorkday(),
  ]);

  const all: ScrapedJob[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
    else console.warn("[scrapers] source rejected:", r.reason);
  }

  // Seniority/noise + experience-cap filters (mirror the Python job_watcher).
  const filtered = all.filter(
    (j) =>
      !titleExcluded(j.title, EXCLUDE_TITLE_KEYWORDS) &&
      experienceOk(j.title, MAX_EXPERIENCE_YEARS),
  );

  // Dedup within this run by (source, sourceJobId).
  const seen = new Set<string>();
  const unique: ScrapedJob[] = [];
  for (const j of filtered) {
    const key = `${j.source}:${j.sourceJobId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(j);
  }
  return unique;
}
