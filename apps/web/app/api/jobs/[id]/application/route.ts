import { NextRequest, NextResponse } from "next/server";
import { prisma, type ApplicationStatus } from "@jobpilot/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as { status: ApplicationStatus };

  const app = await prisma.application.upsert({
    where: { jobId: id },
    create: { jobId: id, status: body.status },
    update: { status: body.status },
  });
  return NextResponse.json(app);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.application.deleteMany({ where: { jobId: id } });
  return NextResponse.json({ ok: true });
}
