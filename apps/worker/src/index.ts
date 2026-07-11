import "./loadenv.js";
import { Worker } from "bullmq";
import { APP_NAME } from "@jobpilot/core";
import {
  connection,
  ingestQueue,
  scoreQueue,
  INGEST_QUEUE,
  SCORE_QUEUE,
} from "./queue.js";
import { ingestAll } from "./ingest.js";
import { scoreJobById } from "./ai/pipeline.js";

const POLL_MINUTES = Number(process.env.POLL_MINUTES ?? 5);

// Ingest worker: scrape → upsert → enqueue scoring for NEW postings only.
// (The stale backlog is never re-scored — tokens are spent only on fresh jobs.)
new Worker(
  INGEST_QUEUE,
  async () => {
    const res = await ingestAll();
    for (const jobId of res.newJobIds) await scoreQueue.add("score", { jobId });
    console.log(
      `[ingest] scraped ${res.scraped} · new ${res.created} · updated ${res.updated} · queued ${res.newJobIds.length} to score`,
    );
    return res;
  },
  { connection },
).on("failed", (_job, err) => console.error("[ingest] failed:", err));

// Score worker: each new job = normalize + fit-score.
new Worker(
  SCORE_QUEUE,
  async (job) => {
    const { jobId } = job.data as { jobId: string };
    const r = await scoreJobById(jobId);
    if (r) {
      console.log(
        `[score ${r.score}] ${r.title} @ ${r.company}  ($${r.cost.toFixed(4)})`,
      );
    }
  },
  { connection, concurrency: 3 },
).on("failed", (_job, err) => console.error("[score] failed:", err));

// Poll on a schedule, plus one run right now.
await ingestQueue.add(
  "scrape",
  {},
  { repeat: { every: POLL_MINUTES * 60_000 }, jobId: "recurring-scrape" },
);
await ingestQueue.add("scrape-now", {});
console.log(
  `[${APP_NAME}] worker up. Polling every ${POLL_MINUTES} min; scoring new jobs only. Ctrl-C to stop.`,
);
