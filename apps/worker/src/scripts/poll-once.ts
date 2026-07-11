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

  // Cap scoring per run so a big new batch (e.g. after adding companies) can't
  // run up a surprise bill — the rest is picked up on subsequent runs.
  const limit = Number(process.env.SCORE_LIMIT ?? 60);
  const toScore = res.newJobIds.slice(0, limit);
  if (res.newJobIds.length > toScore.length) {
    console.log(
      `scoring ${toScore.length}/${res.newJobIds.length} this run (SCORE_LIMIT=${limit}); rest next run`,
    );
  }

  let cost = 0;
  let scored = 0;
  let failed = 0;
  // One bad job (e.g. a transient API error) must not kill the whole run.
  for (const jobId of toScore) {
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
    toScore.length
      ? `scored ${scored}/${toScore.length} new job(s)` +
          (failed ? ` (${failed} failed)` : "") +
          ` · $${cost.toFixed(4)}`
      : "no new jobs to score.",
  );

  await prisma.$disconnect();
  process.exit(0);
}

main();
