import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCharacterOwner } from "@/lib/ai/lora-access";
import { activateVersion, TrainingError } from "@/lib/ai/lora-training";

/** 把这个训练版本设为角色当前使用的版本 */
export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.loraTrainingJob.findUnique({ where: { id: jobId }, select: { characterId: true, provider: true } });
  if (!job || job.provider !== "anima") return NextResponse.json({ error: "训练记录不存在" }, { status: 404 });

  const { error } = await requireCharacterOwner(job.characterId);
  if (error) return error;

  try {
    const updated = await activateVersion(jobId);
    return NextResponse.json({ ok: true, job: updated });
  } catch (err) {
    if (err instanceof TrainingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[lora/activate]", err);
    return NextResponse.json({ error: "操作失败，请稍后再试" }, { status: 500 });
  }
}
