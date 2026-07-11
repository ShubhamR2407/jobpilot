import "../loadenv.js";
import { prisma } from "@jobpilot/db";
import { normalizeJob } from "../ai/normalize.js";
import { scoreJob } from "../ai/score.js";
import { estimateCost, MODELS } from "../ai/anthropic.js";

// Enrich + fit-score N not-yet-scored jobs, printing per-job results and the
// real running cost. Usage: pnpm --filter @jobpilot/worker enrich [N]
const N = Number(process.argv[2] ?? 10);

async function main(): Promise<void> {
  const resume = await prisma.resume.findFirst({ where: { active: true } });
  if (!resume) {
    console.error(
      "No active résumé. Run `pnpm --filter @jobpilot/worker seed:resume` first.",
    );
    process.exit(1);
  }

  const jobs = await prisma.job.findMany({
    where: { fitScore: { is: null } },
    take: N,
    orderBy: { ingestedAt: "desc" },
  });
  console.log(`Enriching + scoring ${jobs.length} job(s)…\n`);

  let totalCost = 0;
  for (const job of jobs) {
    const n = await normalizeJob(job);
    const s = await scoreJob(job, resume.content);
    const cost =
      estimateCost(MODELS.normalize, n.usage) +
      estimateCost(MODELS.score, s.usage);
    totalCost += cost;

    console.log(
      `[${String(s.data.score).padStart(3)}] ${job.title} @ ${job.company}  ($${cost.toFixed(4)})`,
    );
    console.log(
      `      matched: ${s.data.matchedSkills.slice(0, 5).join(", ") || "—"}`,
    );
    console.log(`      gaps:    ${s.data.gaps.slice(0, 3).join(", ") || "—"}`);
  }

  const n = Math.max(jobs.length, 1);
  console.log(
    `\nTotal: $${totalCost.toFixed(4)} for ${jobs.length} jobs (avg $${(totalCost / n).toFixed(4)}/job)`,
  );
  console.log(
    `Projected to score all 468: ~$${((totalCost / n) * 468).toFixed(2)}`,
  );

  await prisma.$disconnect();
  process.exit(0);
}

main();
