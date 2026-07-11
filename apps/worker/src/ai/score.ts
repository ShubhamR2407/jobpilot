import { prisma } from "@jobpilot/db";
import { anthropic, MODELS, type Usage } from "./anthropic.js";

export interface FitResult {
  score: number;
  matchedSkills: string[];
  gaps: string[];
  rationale: string;
}

const RUBRIC = `You are an expert technical recruiter scoring how well a single job posting fits a
specific candidate, based on their résumé.

Return a fit score from 0 to 100:
- 85–100: strong fit — stack, seniority, and location all align well.
- 60–84: good fit — core stack matches; minor gaps in seniority, a sub-skill, or location.
- 40–59: partial fit — some overlap but notable mismatches (wrong sub-domain, seniority, or stack).
- 0–39: weak fit — largely off-stack, wrong seniority band, or unsuitable location.

Weigh: (1) technology-stack overlap with the résumé, (2) seniority fit for the candidate's
experience level, (3) role type vs the candidate's background, (4) location/remote suitability.
- matchedSkills: skills/technologies present in BOTH the résumé and the job (max 8).
- gaps: things the job wants that the résumé does not clearly show (max 5).
- rationale: 2–3 sentences explaining the score, concrete and specific to this job.`;

const SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" }, // 0–100 (enforced by the rubric, not schema constraints)
    matchedSkills: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
  },
  required: ["score", "matchedSkills", "gaps", "rationale"],
  additionalProperties: false,
} as const;

/**
 * Score a job against the résumé using Sonnet (LLM-judge). The rubric + résumé
 * are a cached system prefix, so scoring many jobs reuses that cache (~90%
 * cheaper on those tokens).
 */
export async function scoreJob(
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    rawJd: string;
  },
  resumeContent: string,
): Promise<{ data: FitResult; usage: Usage }> {
  const jd = job.rawJd.slice(0, 12_000);

  const res = await anthropic.messages.create({
    model: MODELS.score,
    max_tokens: 2048, // headroom so a verbose rationale can't truncate the JSON
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: `${RUBRIC}\n\n=== CANDIDATE RÉSUMÉ ===\n${resumeContent}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Score this job for the candidate.\n\n` +
          `Title: ${job.title} @ ${job.company}\nLocation: ${job.location}\n\n` +
          `Job description:\n${jd}`,
      },
    ],
  });

  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  const data = JSON.parse(text) as FitResult;

  await prisma.fitScore.upsert({
    where: { jobId: job.id },
    create: { jobId: job.id, ...data, model: MODELS.score },
    update: { ...data, model: MODELS.score },
  });

  return { data, usage: res.usage as Usage };
}
