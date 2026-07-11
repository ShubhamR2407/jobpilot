import { type ScrapedJob, titleMatches, locationMatches } from "@jobpilot/core";
import { KEYWORDS, LOCATIONS, COMPANIES } from "../config.js";
import { fetchJson, htmlToText } from "./http.js";

const BOARD_URL = (name: string) =>
  `https://api.ashbyhq.com/posting-api/job-board/${name}`;

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  jobUrl: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  publishedAt?: string;
}

export async function scrapeAshby(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (const name of COMPANIES.ashby) {
    let data: { jobs?: AshbyJob[] };
    try {
      data = await fetchJson(BOARD_URL(name));
    } catch (err) {
      console.warn(`[ashby] '${name}' failed: ${(err as Error).message}`);
      continue;
    }

    for (const j of data.jobs ?? []) {
      const title = j.title ?? "";
      const location = j.location ?? "";
      if (!titleMatches(title, KEYWORDS)) continue;
      if (!locationMatches(location, LOCATIONS)) continue;

      jobs.push({
        source: "ashby",
        sourceJobId: String(j.id),
        title,
        company: name,
        location,
        url: j.jobUrl,
        rawJd: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ""),
        postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
      });
    }
  }
  return jobs;
}
