"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tailor } from "../lib/jobs";

export function TailorPanel({
  jobId,
  existing,
}: {
  jobId: string;
  existing: string | null;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(existing);
  const [open, setOpen] = useState(false);

  const m = useMutation({
    mutationFn: () => tailor(jobId),
    onSuccess: (text) => {
      setDraft(text);
      setOpen(true);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="rounded bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-500/25 disabled:opacity-50"
        >
          {m.isPending
            ? "Tailoring…"
            : draft
              ? "Re-tailor"
              : "✨ Tailor with AI"}
        </button>
        {draft && !m.isPending && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            {open ? "Hide draft" : "Show draft"}
          </button>
        )}
        {m.isError && (
          <span className="text-xs text-rose-400">failed — try again</span>
        )}
      </div>
      {open && draft && (
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-900/50 p-3 text-xs leading-relaxed text-neutral-300">
          {draft}
        </pre>
      )}
    </div>
  );
}
