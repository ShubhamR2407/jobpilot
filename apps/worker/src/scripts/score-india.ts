import "../loadenv.js";
import { prisma } from "@jobpilot/db";
import { isIndiaLocation } from "@jobpilot/core";
import { scoreJobById } from "../ai/pipeline.js";

// One-time: score all currently-unscored India-eligible jobs (India-first focus).
// Usage: pnpm --filter @jobpilot/worker score:india [limit]
async function main(): Promise<void> {
  const limit = Number(process.argv[2] ?? 400);

  const unscored = await prisma.job.findMany({
    where: { fitScore: { is: null } },
    select: { id: true, location: true },
  });
  const india = unscored.filter((j) => isIndiaLocation(j.location));
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
