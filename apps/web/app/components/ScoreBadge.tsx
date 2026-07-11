export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number | null;
  size?: "sm" | "md";
}) {
  const cls =
    score === null
      ? "bg-neutral-900 text-neutral-600 ring-neutral-800"
      : score >= 85
        ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
        : score >= 60
          ? "bg-lime-500/15 text-lime-400 ring-lime-500/30"
          : score >= 40
            ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
            : "bg-rose-500/15 text-rose-400 ring-rose-500/30";
  const dims = size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-md font-bold ring-1 ${cls}`}
      title="AI fit score"
    >
      {score ?? "—"}
    </div>
  );
}
