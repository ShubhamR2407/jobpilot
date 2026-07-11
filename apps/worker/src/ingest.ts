import { prisma } from "@jobpilot/db";
import { runAllScrapers } from "./scrapers/index.js";

export interface IngestResult {
  scraped: number;
  created: number; // brand-new postings (worth scoring)
  updated: number; // already-seen postings (skip — don't spend tokens)
  newJobIds: string[];
}

/**
 * Scrape all sources and upsert into Postgres. Returns the ids of jobs that were
 * *newly created* — the only ones worth scoring, so tokens are spent only on
 * fresh postings, never on the stale backlog.
 */
export async function ingestAll(): Promise<IngestResult> {
  const jobs = await runAllScrapers();
  if (jobs.length === 0) {
    return { scraped: 0, created: 0, updated: 0, newJobIds: [] };
  }

  // Which of these do we already have? (one query, then a Set membership test)
  const existing = await prisma.job.findMany({
    where: {
      OR: jobs.map((j) => ({ source: j.source, sourceJobId: j.sourceJobId })),
    },
    select: { source: true, sourceJobId: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.source}:${e.sourceJobId}`),
  );

  const newJobIds: string[] = [];
  let created = 0;
  let updated = 0;

  for (const j of jobs) {
    const isNew = !existingKeys.has(`${j.source}:${j.sourceJobId}`);
    const row = await prisma.job.upsert({
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
      select: { id: true },
    });

    if (isNew) {
      created++;
      newJobIds.push(row.id);
    } else {
      updated++;
    }
  }

  return { scraped: jobs.length, created, updated, newJobIds };
}
