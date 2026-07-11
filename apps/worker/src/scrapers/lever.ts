import { type ScrapedJob, titleMatches, locationMatches } from "@jobpilot/core";
import { KEYWORDS, LOCATIONS, COMPANIES } from "../config.js";
import { fetchJson } from "./http.js";

const POSTINGS_URL = (slug: string) =>
  `https://api.lever.co/v0/postings/${slug}?mode=json`;

interface LeverJob {
  id: string;
  text: string; // title
  categories?: { location?: string };
  descriptionPlain?: string;
  hostedUrl: string;
  createdAt?: number; // epoch ms
}

export async function scrapeLever(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (const slug of COMPANIES.lever) {
    let data: LeverJob[];
    try {
      data = await fetchJson(POSTINGS_URL(slug));
    } catch (err) {
      console.warn(`[lever] '${slug}' failed: ${(err as Error).message}`);
      continue;
    }

    for (const j of data ?? []) {
      const title = j.text ?? "";
      const location = j.categories?.location ?? "";
      if (!titleMatches(title, KEYWORDS)) continue;
      if (!locationMatches(location, LOCATIONS)) continue;

      jobs.push({
        source: "lever",
        sourceJobId: String(j.id),
        title,
        company: slug,
        location,
        url: j.hostedUrl,
        rawJd: j.descriptionPlain ?? "",
        postedAt: j.createdAt ? new Date(j.createdAt) : null,
      });
    }
  }
  return jobs;
}
