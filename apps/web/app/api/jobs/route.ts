import { NextRequest, NextResponse } from "next/server";
import { prisma, type Prisma } from "@jobpilot/db";
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
    application: j.application ? { status: j.application.status } : null,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const minScore = sp.get("minScore");
  const sources = sp.get("source")?.split(",").filter(Boolean);
  const remote = sp.get("remote") === "true";
  const saved = sp.get("saved") === "true";
  const sort = sp.get("sort") ?? "score";

  const where: Prisma.JobWhereInput = {};
  if (sources?.length) where.source = { in: sources };
  if (minScore) where.fitScore = { score: { gte: Number(minScore) } };
  if (remote) where.enrichment = { remotePolicy: "remote" };
  if (saved) where.application = { isNot: null };

  try {
    const jobs = await prisma.job.findMany({
      where,
      include: { fitScore: true, enrichment: true, application: true },
      take: 300,
    });

    jobs.sort((a, b) => {
      if (sort === "date")
        return b.ingestedAt.getTime() - a.ingestedAt.getTime();
      return (b.fitScore?.score ?? -1) - (a.fitScore?.score ?? -1);
    });

    return NextResponse.json(jobs.map(toDTO));
  } catch (e) {
    if (sp.get("debug") === "1") {
      return NextResponse.json(
        { error: String(e), stack: (e as Error)?.stack?.slice(0, 1200) },
        { status: 500 },
      );
    }
    // DB unreachable (e.g. Vercel before a cloud DB exists) — return empty.
    return NextResponse.json([]);
  }
}
