import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@jobpilot/db";
import { isIndiaLocation } from "@jobpilot/core";
import type { JobDTO } from "../../lib/jobs";

export const dynamic = "force-dynamic";

type JobRow = Prisma.JobGetPayload<{
  include: { fitScore: true; enrichment: true; application: true };
}>;

function toDTO(j: JobRow): JobDTO {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    source: j.source,
    url: j.url,
    postedAt: j.postedAt ? j.postedAt.toISOString() : null,
    jdPreview: j.rawJd.slice(0, 600),
    fitScore: j.fitScore
      ? {
          score: j.fitScore.score,
          rationale: j.fitScore.rationale,
          matchedSkills: j.fitScore.matchedSkills,
          gaps: j.fitScore.gaps,
        }
      : null,
    enrichment: j.enrichment
      ? {
          seniority: j.enrichment.seniority,
          minYears: j.enrichment.minYears,
          stack: j.enrichment.stack,
          remotePolicy: j.enrichment.remotePolicy,
        }
      : null,
    application: j.application
      ? {
          status: j.application.status,
          tailoredDraft: j.application.tailoredDraft,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minScore = sp.get("minScore");
  const sources = sp.get("source")?.split(",").filter(Boolean);
  const remote = sp.get("remote") === "true";
  const saved = sp.get("saved") === "true";
  const sort = sp.get("sort") ?? "score";
  const country = sp.get("country") ?? "all"; // "india" | "global" | "all"
  const status = sp.get("status") ?? "all"; // "unapplied" | "tracked" | "all"
  const maxAgeDays = Number(sp.get("maxAgeDays") ?? 0); // 0 = no age limit

  const where: Prisma.JobWhereInput = {};
  if (sources?.length) where.source = { in: sources };
  if (minScore) where.fitScore = { score: { gte: Number(minScore) } };
  if (remote) where.enrichment = { remotePolicy: "remote" };
  if (saved) where.application = { isNot: null };
  // Hide jobs you've already acted on (any status) from the default view.
  if (status === "unapplied") where.application = { is: null };
  else if (status === "tracked") where.application = { isNot: null };
  // Freshness: only jobs posted within the last N days (apply-fast).
  if (maxAgeDays > 0)
    where.postedAt = { gte: new Date(Date.now() - maxAgeDays * 86_400_000) };

  try {
    let jobs = await prisma.job.findMany({
      where,
      include: { fitScore: true, enrichment: true, application: true },
      // Fetch all matches so the JS country filter (below) sees the full set;
      // the response is sliced to 300 after filtering/sorting.
      take: 2000,
    });

    // Country is derived from the fuzzy location string, so filter in JS.
    // India = India cities + country-less remote roles; Global = everything else.
    if (country === "india")
      jobs = jobs.filter((j) => isIndiaLocation(j.location));
    else if (country === "global")
      jobs = jobs.filter((j) => !isIndiaLocation(j.location));

    // "Newest" = most recently posted (fall back to ingest time if no postedAt).
    const postedTime = (j: JobRow) => (j.postedAt ?? j.ingestedAt).getTime();
    jobs.sort((a, b) => {
      if (sort === "date") return postedTime(b) - postedTime(a);
      return (b.fitScore?.score ?? -1) - (a.fitScore?.score ?? -1);
    });

    return NextResponse.json(jobs.slice(0, 300).map(toDTO));
  } catch {
    // DB unreachable — return empty rather than erroring the page.
    return NextResponse.json([]);
  }
}
