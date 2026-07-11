import { Queue, type ConnectionOptions } from "bullmq";

export const INGEST_QUEUE = "ingest";
export const SCORE_QUEUE = "score";

// Pass connection *options* (not an ioredis instance) so BullMQ owns the client
// and there's a single ioredis version in the tree. maxRetriesPerRequest: null
// is required by BullMQ.
function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null,
  };
}

export const connection = redisConnection();
export const ingestQueue = new Queue(INGEST_QUEUE, { connection });
export const scoreQueue = new Queue(SCORE_QUEUE, { connection });
