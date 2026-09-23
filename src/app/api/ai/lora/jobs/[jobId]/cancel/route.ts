import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCharacterOwner } from "@/lib/ai/lora-access";
import { cancelTraining, TrainingError } from "@/lib/ai/lora-training";

/** 取消进行中的训练（训练开始前取消会退还额度） */
export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await prisma.loraTrainingJob.findUnique({ where: { id: jobId }, select: { characterId: true, provider: true } });
  if (!job || job.provider !== "anima") return NextResponse.json({ error: "训练记录不存在" }, { status: 404 });

  const { error } = await requireCharacterOwner(job.characterId);
  if (error) return error;

  try {
    const updated = await cancelTraining(jobId);
    return NextResponse.json({ ok: true, job: updated });
  } catch (err) {
    if (err instanceof TrainingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[lora/cancel]", err);
    return NextResponse.json({ error: "操作失败，请稍后再试" }, { status: 500 });
  }
}
