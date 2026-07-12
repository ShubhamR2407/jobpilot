"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchJobs,
  type Country,
  type JobFilters,
  type Status,
} from "./lib/jobs";
import { JobList } from "./components/JobList";

const SOURCES = ["greenhouse", "lever", "ashby"];

export default function Dashboard() {
  const [minScore, setMinScore] = useState(0);
  const [sources, setSources] = useState<string[]>([]);
  const [remote, setRemote] = useState(false);
  const [sort, setSort] = useState<"score" | "date">("score");
  const [country, setCountry] = useState<Country>("india");
  const [status, setStatus] = useState<Status>("unapplied");
  const [maxAgeDays, setMaxAgeDays] = useState(2);

  const filters: Partial<JobFilters> = {
    minScore,
    sources,
    remote,
    sort,
    country,
    status,
    maxAgeDays,
  };
  const {
    data: jobs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => fetchJobs(filters),
    refetchInterval: 60_000, // newly-scored jobs surface without a manual reload
  });

  const toggleSource = (s: string) =>
    setSources((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );

  const scored = jobs?.filter((j) => j.fitScore).length ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="sr-only">Job dashboard</h1>
      <section
        aria-label="Job filters"
        className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-neutral-800 p-4"
      >
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
          Country
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as Country)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
          >
            <option value="india">India</option>
            <option value="global">Global</option>
            <option value="all">All</option>
          </select>
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

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Show
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
          >
            <option value="unapplied">Unapplied</option>
            <option value="tracked">Applied / saved</option>
            <option value="all">All</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Posted
          <select
            value={maxAgeDays}
            onChange={(e) => setMaxAgeDays(Number(e.target.value))}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-200"
          >
            <option value={2}>Last 2 days</option>
            <option value={7}>Last 7 days</option>
            <option value={0}>Any time</option>
          </select>
        </label>
      </section>

      {isLoading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : isError ? (
        <p className="text-rose-400">Failed to load jobs.</p>
      ) : !jobs || jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-500">
          No jobs match these filters. Try widening{" "}
          <span className="text-neutral-300">Posted</span> or{" "}
          <span className="text-neutral-300">Show</span>.
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500">
            {jobs.length} jobs · {scored} AI-scored
          </p>
          <JobList jobs={jobs} />
        </>
      )}
    </main>
  );
}
