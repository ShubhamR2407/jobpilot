import { prisma } from "@jobpilot/db";
import { normalizeJob } from "./normalize.js";
import { scoreJob } from "./score.js";
import { estimateCost, MODELS } from "./anthropic.js";

export interface ScoreOutcome {
  score: number;
  title: string;
  company: string;
  cost: number;
}

/** Normalize + fit-score a single job by id against the active résumé. */
export async function scoreJobById(
  jobId: string,
): Promise<ScoreOutcome | null> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;

  const resume = await prisma.resume.findFirst({ where: { active: true } });
  if (!resume) {
    throw new Error(
      "No active résumé — run `pnpm --filter @jobpilot/worker seed:resume`.",
    );
  }

  const n = await normalizeJob(job);
  const s = await scoreJob(job, resume.content);
  const cost =
    estimateCost(MODELS.normalize, n.usage) +
    estimateCost(MODELS.score, s.usage);

  return { score: s.data.score, title: job.title, company: job.company, cost };
}
