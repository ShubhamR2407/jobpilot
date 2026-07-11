import { prisma, type Job } from "@jobpilot/db";
import { APP_NAME, APP_TAGLINE } from "@jobpilot/core";

// Query the DB at request time, not build time (no DB during Vercel builds).
export const dynamic = "force-dynamic";

async function getJobs(): Promise<Job[] | null> {
  try {
    return await prisma.job.findMany({
      orderBy: { ingestedAt: "desc" },
      take: 100,
    });
  } catch {
    // DB unreachable (e.g. on Vercel before a cloud DB is provisioned in Step 3).
    return null;
  }
}

const SOURCE_COLORS: Record<string, string> = {
  greenhouse: "text-emerald-400",
  lever: "text-sky-400",
  ashby: "text-violet-400",
};

export default async function Home() {
  const jobs = await getJobs();

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-neutral-950 px-6 py-12 text-neutral-100">
      <header className="mb-8 border-b border-neutral-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-neutral-400">{APP_TAGLINE}</p>
        <p className="mt-4 text-sm text-neutral-500">
          {jobs === null
            ? "Database not connected."
            : `${jobs.length} job${jobs.length === 1 ? "" : "s"} ingested`}
        </p>
      </header>

      {jobs && jobs.length > 0 ? (
        <ul className="flex flex-col divide-y divide-neutral-800">
          {jobs.map((job) => (
            <li key={job.id} className="py-4">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-medium text-neutral-100 hover:text-white hover:underline"
              >
                {job.title}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-400">
                <span className="font-medium capitalize text-neutral-300">
                  {job.company}
                </span>
                <span aria-hidden>·</span>
                <span>{job.location || "Location N/A"}</span>
                <span aria-hidden>·</span>
                <span
                  className={SOURCE_COLORS[job.source] ?? "text-neutral-400"}
                >
                  {job.source}
                </span>
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
            to ingest jobs from company ATS feeds.
          </p>
        </div>
      )}
    </main>
  );
}
