export const STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

export interface JobDTO {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  postedAt: string | null;
  fitScore: {
    score: number;
    rationale: string;
    matchedSkills: string[];
    gaps: string[];
  } | null;
  enrichment: {
    seniority: string | null;
    minYears: number | null;
    stack: string[];
    remotePolicy: string | null;
  } | null;
  application: {
    status: ApplicationStatus;
    tailoredDraft: string | null;
  } | null;
}

export type Country = "india" | "global" | "all";

export interface JobFilters {
  minScore: number;
  sources: string[];
  remote: boolean;
  sort: "score" | "date";
  saved: boolean;
  country: Country;
}

export async function fetchJobs(f: Partial<JobFilters>): Promise<JobDTO[]> {
  const p = new URLSearchParams();
  if (f.minScore) p.set("minScore", String(f.minScore));
  if (f.sources?.length) p.set("source", f.sources.join(","));
  if (f.remote) p.set("remote", "true");
  if (f.saved) p.set("saved", "true");
  if (f.sort) p.set("sort", f.sort);
  if (f.country) p.set("country", f.country);
  const res = await fetch(`/api/jobs?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function setStatus(
  jobId: string,
  status: ApplicationStatus,
): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}/application`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

export async function unsave(jobId: string): Promise<void> {
  await fetch(`/api/jobs/${jobId}/application`, { method: "DELETE" });
}

export async function tailor(jobId: string): Promise<string> {
  const res = await fetch(`/api/jobs/${jobId}/tailor`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate draft");
  const data = (await res.json()) as { tailoredDraft: string };
  return data.tailoredDraft;
}
