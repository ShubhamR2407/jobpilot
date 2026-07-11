import "../loadenv.js";
import { prisma } from "@jobpilot/db";
import { isIndiaLocation } from "@jobpilot/core";
import { scoreJobById } from "../ai/pipeline.js";

// Score India-eligible jobs. By default only unscored ones; pass --force to
// re-score already-scored India jobs too (e.g. after the résumé changes).
// Usage: pnpm --filter @jobpilot/worker score:india [limit] [--force]
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 400);

  const candidates = await prisma.job.findMany({
    where: force ? {} : { fitScore: { is: null } },
    select: { id: true, location: true },
  });
  const india = candidates.filter((j) => isIndiaLocation(j.location));
  const batch = india.slice(0, limit);
  console.log(
    `India-eligible unscored: ${india.length} · scoring ${batch.length}`,
  );

  let cost = 0;
  let scored = 0;
  let failed = 0;
  for (const j of batch) {
    try {
      const r = await scoreJobById(j.id);
      if (r) {
        cost += r.cost;
        scored++;
        console.log(`  [${r.score}] ${r.title} @ ${r.company}`);
      }
    } catch (err) {
      failed++;
      console.warn(`  failed ${j.id}: ${(err as Error).message}`);
    }
  }

  console.log(
    `scored ${scored} India job(s)${failed ? ` (${failed} failed)` : ""} · $${cost.toFixed(4)}`,
  );
  await prisma.$disconnect();
  process.exit(0);
}

main();
