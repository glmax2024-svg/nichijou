import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWithLora } from "@/lib/ai/pipeline";
import { z } from "zod";
import { FailClosedError, isDemoMode } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";

const schema = z.object({
  characterId: z.string(),
  prompt: z.string().min(1).max(800),
  negativePrompt: z.string().max(400).optional(),
  weight: z.number().min(0.1).max(1.5).optional(),
  steps: z.number().int().min(10).max(50).optional(),
  batch: z.number().int().min(1).max(4).optional(),
  allowDemo: z.boolean().optional(),
  coverUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "lora-generate",
    { limit: 12, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const character = await prisma.character.findUnique({
      where: { id: parsed.characterId },
      select: { creatorId: true, loraStatus: true },
    });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    const allowDemo = isDemoMode() && Boolean(parsed.allowDemo);
    if (character.loraStatus !== "READY" && !allowDemo) {
      return NextResponse.json(
        { error: "LoRA 尚未就绪，请先完成训练" },
        { status: 400 },
      );
    }

    const result = await generateWithLora({ ...parsed, allowDemo });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
