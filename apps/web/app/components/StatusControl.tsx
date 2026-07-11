"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  STATUSES,
  setStatus,
  unsave,
  type ApplicationStatus,
} from "../lib/jobs";

const label = (s: ApplicationStatus) => s[0] + s.slice(1).toLowerCase();

export function StatusControl({
  jobId,
  current,
}: {
  jobId: string;
  current: ApplicationStatus | null;
}) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (value: string) => {
      if (value === "") await unsave(jobId);
      else await setStatus(jobId, value as ApplicationStatus);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <select
      value={current ?? ""}
      onChange={(e) => mutation.mutate(e.target.value)}
      disabled={mutation.isPending}
      className="shrink-0 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200 disabled:opacity-50"
      aria-label="Application status"
    >
      <option value="">{current ? "✕ Remove" : "+ Save"}</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {label(s)}
        </option>
      ))}
    </select>
  );
}
