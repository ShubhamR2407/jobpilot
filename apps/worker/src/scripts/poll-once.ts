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
  for (const jobId of res.newJobIds) {
    const r = await scoreJobById(jobId);
    if (r) {
      cost += r.cost;
      console.log(`  scored [${r.score}] ${r.title} @ ${r.company}`);
    }
  }

  console.log(
    res.newJobIds.length
      ? `scored ${res.newJobIds.length} new job(s) · $${cost.toFixed(4)}`
      : "no new jobs to score.",
  );

  await prisma.$disconnect();
  process.exit(0);
}

main();
