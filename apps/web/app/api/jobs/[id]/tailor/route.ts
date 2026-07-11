import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@jobpilot/db";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Opus needs more than the 10s default

const anthropic = new Anthropic();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const resume = await prisma.resume.findFirst({ where: { active: true } });
  if (!resume)
    return NextResponse.json({ error: "No active résumé" }, { status: 400 });

  const res = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text:
          "You help a candidate apply to a specific job. Using their résumé and the " +
          "job description, write application material that is specific and honest — " +
          "never invent experience the résumé doesn't support.\n\n" +
          `=== CANDIDATE RÉSUMÉ ===\n${resume.content}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content:
          `Job: ${job.title} @ ${job.company} (${job.location})\n\n` +
          `Job description:\n${job.rawJd.slice(0, 12000)}\n\n` +
          "Produce, in markdown:\n" +
          "## Tailored résumé bullets\n" +
          "3–4 bullets tuned to THIS job, drawing only on the résumé.\n" +
          "## Outreach message\n" +
          "A ~120-word message to the recruiter/hiring manager, specific to this role.",
      },
    ],
  });

  const text = res.content.find((b) => b.type === "text")?.text ?? "";

  await prisma.application.upsert({
    where: { jobId: id },
    create: { jobId: id, status: "SAVED", tailoredDraft: text },
    update: { tailoredDraft: text },
  });

  return NextResponse.json({ tailoredDraft: text });
}
