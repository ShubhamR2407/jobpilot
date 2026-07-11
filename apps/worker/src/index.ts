import "./loadenv.js";
import { Worker } from "bullmq";
import { APP_NAME } from "@jobpilot/core";
import { connection, ingestQueue, INGEST_QUEUE } from "./queue.js";
import { ingestAll } from "./ingest.js";

// Process ingest jobs off the Redis-backed queue.
const worker = new Worker(
  INGEST_QUEUE,
  async () => {
    console.log(`[${APP_NAME}] running ingest…`);
    const result = await ingestAll();
    console.log(`[${APP_NAME}] ingest complete:`, result);
    return result;
  },
  { connection },
);

worker.on("failed", (_job, err) => console.error("[ingest] failed:", err));

// Kick off one scrape on boot so `pnpm worker` produces data immediately.
await ingestQueue.add("scrape", {});
console.log(
  `[${APP_NAME}] worker up; enqueued initial scrape. Ctrl-C to stop.`,
);
