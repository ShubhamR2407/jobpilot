"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJobs, type JobFilters } from "./lib/jobs";
import { JobCard } from "./components/JobCard";

const SOURCES = ["greenhouse", "lever", "ashby"];

export default function Dashboard() {
  const [minScore, setMinScore] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [remote, setRemote] = useState(false);
  const [sort, setSort] = useState<"score" | "date">("score");

  const filters: Partial<JobFilters> = { minScore, sources, remote, sort };
  const {
    data: jobs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => fetchJobs(filters),
  });

  const toggleSource = (s: string) =>
    setSources((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );

  const scored = jobs?.filter((j) => j.fitScore).length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-neutral-800 p-4">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Min fit score: <span className="text-neutral-200">{minScore}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-40 accent-emerald-500"
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-neutral-400">
          Source
          <div className="flex gap-3">
            {SOURCES.map((s) => (
              <label
                key={s}
                className="flex items-center gap-1 text-neutral-200"
              >
                <input
                  type="checkbox"
                  checked={sources.includes(s)}
                  onChange={() => toggleSource(s)}
                  className="accent-emerald-500"
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-1 text-xs text-neutral-200">
          <input
            type="checkbox"
            checked={remote}
            onChange={(e) => setRemote(e.target.checked)}
            className="accent-emerald-500"
          />
          Remote only
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "score" | "date")}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
          >
            <option value="score">Fit score</option>
            <option value="date">Newest</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : isError ? (
        <p className="text-rose-400">Failed to load jobs.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500">
            {jobs?.length ?? 0} jobs · {scored} AI-scored
          </p>
          <ul className="flex flex-col gap-3">
            {jobs?.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
