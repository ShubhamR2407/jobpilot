import type { JobDTO } from "../lib/jobs";
import { ScoreBadge } from "./ScoreBadge";
import { StatusControl } from "./StatusControl";
import { TailorPanel } from "./TailorPanel";

const SOURCE_COLORS: Record<string, string> = {
  greenhouse: "text-emerald-400",
  lever: "text-sky-400",
  ashby: "text-violet-400",
};

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  if (d < 86400 * 30) return `${Math.round(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function JobCard({ job }: { job: JobDTO }) {
  const s = job.fitScore;
  return (
    <li className="rounded-lg border border-neutral-800 p-4">
      <div className="flex items-start gap-4">
        <ScoreBadge score={s?.score ?? null} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-100 hover:text-white hover:underline"
            >
              {job.title}
            </a>
            <StatusControl
              jobId={job.id}
              current={job.application?.status ?? null}
            />
          </div>

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
            {job.enrichment?.seniority &&
              job.enrichment.seniority !== "unknown" && (
                <>
                  <span aria-hidden>·</span>
                  <span className="capitalize">{job.enrichment.seniority}</span>
                </>
              )}
            {job.postedAt && (
              <>
                <span aria-hidden>·</span>
                <span>{timeAgo(job.postedAt)}</span>
              </>
            )}
          </div>

          {job.jdPreview && (
            <p className="mt-1.5 line-clamp-2 text-xs text-neutral-500">
              {job.jdPreview}
            </p>
          )}

          {s && (
            <>
              <p className="mt-2 text-sm text-neutral-400">{s.rationale}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.matchedSkills.slice(0, 6).map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400"
                  >
                    {skill}
                  </span>
                ))}
                {s.gaps.slice(0, 4).map((gap) => (
                  <span
                    key={gap}
                    className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400"
                  >
                    gap: {gap}
                  </span>
                ))}
              </div>
            </>
          )}

          <TailorPanel
            jobId={job.id}
            existing={job.application?.tailoredDraft ?? null}
          />
        </div>
      </div>
    </li>
  );
}
