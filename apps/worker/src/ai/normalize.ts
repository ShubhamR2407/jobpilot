import { prisma } from "@jobpilot/db";
import { anthropic, MODELS, type Usage } from "./anthropic.js";

export interface NormalizedJd {
  seniority: string;
  minYears: number;
  stack: string[];
  remotePolicy: string;
  responsibilities: string[];
}

const SCHEMA = {
  type: "object",
  properties: {
    seniority: {
      type: "string",
      enum: ["intern", "junior", "mid", "senior", "staff", "unknown"],
    },
    minYears: { type: "integer" }, // 0 if unspecified
    stack: { type: "array", items: { type: "string" } },
    remotePolicy: {
      type: "string",
      enum: ["remote", "hybrid", "onsite", "unknown"],
    },
    responsibilities: { type: "array", items: { type: "string" } },
  },
  required: [
    "seniority",
    "minYears",
    "stack",
    "remotePolicy",
    "responsibilities",
  ],
  additionalProperties: false,
} as const;

/** Extract structured fields from a job's raw JD using Haiku (structured output). */
export async function normalizeJob(job: {
  id: string;
  title: string;
  company: string;
  rawJd: string;
}): Promise<{ data: NormalizedJd; usage: Usage }> {
  const jd = job.rawJd.slice(0, 12_000);

  const res = await anthropic.messages.create({
    model: MODELS.normalize,
    max_tokens: 1024,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          "Extract structured fields from this job posting. Use the enums exactly; " +
          'use "unknown" when unclear and 0 for minYears if no minimum is stated. ' +
          "`stack` = concrete technologies named. `responsibilities` = up to 6 short bullets.\n\n" +
          `Title: ${job.title}\nCompany: ${job.company}\n\nJob description:\n${jd}`,
      },
    ],
  });

  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  const data = JSON.parse(text) as NormalizedJd;

  await prisma.jobEnrichment.upsert({
    where: { jobId: job.id },
    create: { jobId: job.id, ...data, model: MODELS.normalize },
    update: { ...data, model: MODELS.normalize },
  });

  return { data, usage: res.usage as Usage };
}
