import { type ScrapedJob, titleMatches, locationMatches } from "@jobpilot/core";
import { KEYWORDS, LOCATIONS, WORKDAY } from "../config.js";
import { htmlToText, USER_AGENT } from "./http.js";

// Workday's public careers JSON is a two-call flow, unlike the single-request
// Greenhouse/Lever/Ashby boards:
//   1) POST {base}/jobs      → a page of {title, locationsText, externalPath}
//   2) GET  {base}{path}     → jobPostingInfo with the full JD + apply URL.
// So we page the list, keep only title+location matches, then fetch the JD for
// just those — never for the whole (often thousands-strong) board.

const LIST_PAGE = 20; // Workday's max page size
const MAX_SCAN = 120; // list items scanned per company (pages of 20)
const MAX_JD_PER_COMPANY = 20; // cap the per-job detail fetches (they're serial)

interface WdConfig {
  tenant: string;
  dc: string;
  site: string;
}

/** Pull tenant / datacenter / site out of a Workday careers URL, e.g.
 * `https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite`. */
function parseWorkdayUrl(url: string): WdConfig | null {
  const m = url.match(
    /https:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/?#]+)/i,
  );
  return m ? { tenant: m[1]!, dc: m[2]!, site: m[3]! } : null;
}

interface WdPost {
  title?: string;
  locationsText?: string;
  externalPath?: string;
}

interface WdListResponse {
  total?: number;
  jobPostings?: WdPost[];
}

interface WdDetailResponse {
  jobPostingInfo?: {
    jobDescription?: string;
    externalUrl?: string;
    startDate?: string;
  };
}

export async function scrapeWorkday(): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];

  for (const careersUrl of WORKDAY) {
    const cfg = parseWorkdayUrl(careersUrl);
    if (!cfg) {
      console.warn(`[workday] unparseable URL skipped: ${careersUrl}`);
      continue;
    }
    const base = `https://${cfg.tenant}.${cfg.dc}.myworkdayjobs.com/wday/cxs/${cfg.tenant}/${cfg.site}`;

    // Phase 1 — page the listing, collecting title+location matches.
    const matches: WdPost[] = [];
    try {
      for (let offset = 0; offset < MAX_SCAN; offset += LIST_PAGE) {
        const res = await fetch(`${base}/jobs`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "User-Agent": USER_AGENT,
          },
          // searchText narrows the (often huge) board to engineering roles so a
          // shallow scan still surfaces relevant postings.
          body: JSON.stringify({
            appliedFacets: {},
            limit: LIST_PAGE,
            offset,
            searchText: "engineer",
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) break;
        const data = (await res.json()) as WdListResponse;
        const posts = data.jobPostings ?? [];
        if (posts.length === 0) break;

        for (const p of posts) {
          if (!titleMatches(p.title ?? "", KEYWORDS)) continue;
          if (!locationMatches(p.locationsText ?? "", LOCATIONS)) continue;
          matches.push(p);
        }
        if (matches.length >= MAX_JD_PER_COMPANY) break;
        if (offset + LIST_PAGE >= (data.total ?? 0)) break;
      }
    } catch (err) {
      console.warn(
        `[workday] '${cfg.tenant}' list failed: ${(err as Error).message}`,
      );
      continue;
    }

    // Phase 2 — fetch the full JD for just the matched postings.
    for (const p of matches.slice(0, MAX_JD_PER_COMPANY)) {
      if (!p.externalPath) continue;
      try {
        const res = await fetch(`${base}${p.externalPath}`, {
          headers: { accept: "application/json", "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) continue;
        const info = ((await res.json()) as WdDetailResponse).jobPostingInfo;
        jobs.push({
          source: "workday",
          sourceJobId: p.externalPath, // stable + unique per posting
          title: p.title ?? "",
          company: cfg.tenant,
          location: p.locationsText ?? "",
          url:
            info?.externalUrl ??
            `https://${cfg.tenant}.${cfg.dc}.myworkdayjobs.com/${cfg.site}${p.externalPath}`,
          rawJd: htmlToText(info?.jobDescription ?? ""),
          postedAt: info?.startDate ? new Date(info.startDate) : null,
        });
      } catch {
        // one bad detail fetch shouldn't sink the company
      }
    }
  }

  return jobs;
}
