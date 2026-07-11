import "../loadenv.js";
import { ingestAll } from "../ingest.js";
import { prisma } from "@jobpilot/db";

// One-shot ingest (no queue) — handy for manual runs, cron, and verification.
const result = await ingestAll();
console.log("ingest-once:", result);
await prisma.$disconnect();
process.exit(0);
