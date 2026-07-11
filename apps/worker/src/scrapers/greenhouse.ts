import { type ScrapedJob, titleMatches, locationMatches } from "@jobpilot/core";
import { KEYWORDS, LOCATIONS, COMPANIES } from "../config.js";
import { fetchJson, htmlToText } from "./http.js";

// `content=true` returns the full JD (HTML) for every posting in one request.
const BOARD_URL = (token: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;

interface GreenhouseJob {
  id: number;
  title: string;
  location?: { name?: string };
  absolute_url: string;
  content?: string;
  first_published?: string;
}

export async function scrapeGreenhouse(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (const token of COMPANIES.greenhouse) {
    let data: { jobs?: GreenhouseJob[] };
    try {
      data = await fetchJson(BOARD_URL(token));
    } catch (err) {
      console.warn(`[greenhouse] '${token}' failed: ${(err as Error).message}`);
      continue;
    }

    for (const j of data.jobs ?? []) {
      const title = j.title ?? "";
      const location = j.location?.name ?? "";
      if (!titleMatches(title, KEYWORDS)) continue;
      if (!locationMatches(location, LOCATIONS)) continue;

      jobs.push({
        source: "greenhouse",
        sourceJobId: String(j.id),
        title,
        company: token,
        location,
        url: j.absolute_url,
        rawJd: htmlToText(j.content ?? ""),
        postedAt: j.first_published ? new Date(j.first_published) : null,
      });
    }
  }
  return jobs;
}
