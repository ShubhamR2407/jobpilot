import { prisma } from "@jobpilot/db";
import { runAllScrapers } from "./scrapers/index.js";

export interface IngestResult {
  scraped: number;
  upserted: number;
}

/** Scrape all sources and upsert results into Postgres (dedup on source+id). */
export async function ingestAll(): Promise<IngestResult> {
  const jobs = await runAllScrapers();

  let upserted = 0;
  for (const j of jobs) {
    await prisma.job.upsert({
      where: {
        source_sourceJobId: { source: j.source, sourceJobId: j.sourceJobId },
      },
      create: {
        source: j.source,
        sourceJobId: j.sourceJobId,
        title: j.title,
        company: j.company,
        location: j.location,
        url: j.url,
        rawJd: j.rawJd,
        postedAt: j.postedAt,
      },
      update: {
        title: j.title,
        location: j.location,
        url: j.url,
        rawJd: j.rawJd,
        postedAt: j.postedAt,
      },
    });
    upserted++;
  }

  return { scraped: jobs.length, upserted };
}
