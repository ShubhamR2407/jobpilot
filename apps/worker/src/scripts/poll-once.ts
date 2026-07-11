import "../loadenv.js";
import { prisma } from "@jobpilot/db";
import { ingestAll } from "../ingest.js";
import { scoreJobById } from "../ai/pipeline.js";

// One poll: ingest, then score ONLY the newly-created jobs. Cron-friendly (exits).
// Usage: pnpm --filter @jobpilot/worker poll
async function main(): Promise<void> {
  const res = await ingestAll();
  console.log(
    `ingest: scraped ${res.scraped} · new ${res.created} · updated ${res.updated}`,
  );

  let cost = 0;
  let scored = 0;
  let failed = 0;
  // One bad job (e.g. a transient API error) must not kill the whole run.
  for (const jobId of res.newJobIds) {
    try {
      const r = await scoreJobById(jobId);
      if (r) {
        cost += r.cost;
        scored++;
        console.log(`  scored [${r.score}] ${r.title} @ ${r.company}`);
      }
    } catch (err) {
      failed++;
      console.warn(`  score failed for ${jobId}: ${(err as Error).message}`);
    }
  }

  console.log(
    res.newJobIds.length
      ? `scored ${scored}/${res.newJobIds.length} new job(s)` +
          (failed ? ` (${failed} failed)` : "") +
          ` · $${cost.toFixed(4)}`
      : "no new jobs to score.",
  );

  await prisma.$disconnect();
  process.exit(0);
}

main();
