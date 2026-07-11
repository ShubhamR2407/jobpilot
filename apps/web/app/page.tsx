import { prisma, type Prisma } from "@jobpilot/db";
import { APP_NAME, APP_TAGLINE } from "@jobpilot/core";

// Query the DB at request time, not build time (no DB during Vercel builds).
export const dynamic = "force-dynamic";

type JobWithScore = Prisma.JobGetPayload<{
  include: { fitScore: true; enrichment: true };
}>;

async function getJobs(): Promise<JobWithScore[] | null> {
  try {
    const jobs = await prisma.job.findMany({
      include: { fitScore: true, enrichment: true },
      orderBy: { ingestedAt: "desc" },
      take: 200,
    });
    // Scored jobs first (highest fit first); unscored fall to the bottom.
    return jobs.sort(
      (a, b) => (b.fitScore?.score ?? -1) - (a.fitScore?.score ?? -1),
    );
  } catch {
    return null; // DB unreachable (e.g. Vercel before a cloud DB exists).
  }
}

function scoreClasses(score: number): string {
  if (score >= 85)
    return "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30";
  if (score >= 60) return "bg-lime-500/15 text-lime-400 ring-lime-500/30";
  if (score >= 40) return "bg-amber-500/15 text-amber-400 ring-amber-500/30";
  return "bg-rose-500/15 text-rose-400 ring-rose-500/30";
}

const SOURCE_COLORS: Record<string, string> = {
  greenhouse: "text-emerald-400",
  lever: "text-sky-400",
  ashby: "text-violet-400",
};

export default async function Home() {
  const jobs = await getJobs();
  const scored = jobs?.filter((j) => j.fitScore).length ?? 0;

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-neutral-950 px-6 py-12 text-neutral-100">
      <header className="mb-8 border-b border-neutral-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-neutral-400">{APP_TAGLINE}</p>
        <p className="mt-4 text-sm text-neutral-500">
          {jobs === null
            ? "Database not connected."
            : `${jobs.length} jobs · ${scored} AI-scored`}
        </p>
      </header>

      {jobs && jobs.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="rounded-lg border border-neutral-800 p-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm font-bold ring-1 ${
                    job.fitScore
                      ? scoreClasses(job.fitScore.score)
                      : "bg-neutral-900 text-neutral-600 ring-neutral-800"
                  }`}
                  title="AI fit score"
                >
                  {job.fitScore ? job.fitScore.score : "—"}
                </div>

                <div className="min-w-0 flex-1">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-neutral-100 hover:text-white hover:underline"
                  >
                    {job.title}
                  </a>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-neutral-400">
                    <span className="font-medium capitalize text-neutral-300">
                      {job.company}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{job.location || "Location N/A"}</span>
                    <span aria-hidden>·</span>
                    <span className={SOURCE_COLORS[job.source] ?? ""}>
                      {job.source}
                    </span>
                  </div>

                  {job.fitScore && (
                    <>
                      <p className="mt-2 text-sm text-neutral-400">
                        {job.fitScore.rationale}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.fitScore.matchedSkills.slice(0, 6).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400"
                          >
                            {s}
                          </span>
                        ))}
                        {job.fitScore.gaps.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400"
                          >
                            gap: {s}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
          <p className="text-neutral-400">No jobs yet.</p>
          <p className="mt-2 text-sm">
            Run{" "}
            <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-neutral-300">
              pnpm worker
            </code>{" "}
            to ingest, then{" "}
            <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-neutral-300">
              pnpm --filter @jobpilot/worker enrich
            </code>{" "}
            to score.
          </p>
        </div>
      )}
    </main>
  );
}
