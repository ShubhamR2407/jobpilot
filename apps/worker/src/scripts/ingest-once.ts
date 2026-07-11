import "../loadenv.js";
import { ingestAll } from "../ingest.js";
import { prisma } from "@jobpilot/db";

// One-shot ingest only, no scoring (see `poll` for ingest+score). For manual
// runs and verification.
const { scraped, created, updated } = await ingestAll();
console.log(
  `ingest-once: scraped ${scraped} · created ${created} · updated ${updated}`,
);
await prisma.$disconnect();
process.exit(0);
