import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueLoraTraining, tickLoraJobProgress } from "@/lib/ai/pipeline";
import { z } from "zod";
import { FailClosedError } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";

const datasetImageSchema = z.object({
  url: z.string().min(1),
  caption: z.string().default(""),
});

const recipeSchema = z
  .object({
    epochs: z.number().int().min(1).max(40).optional(),
    repeats: z.number().int().min(1).max(40).optional(),
    resolution: z.number().int().optional(),
    networkDim: z.number().int().optional(),
    alpha: z.number().int().optional(),
    optimizer: z.string().optional(),
  })
  .optional();

const schema = z.object({
  characterId: z.string(),
  referenceImageUrls: z.array(z.string()).optional(),
  datasetImages: z.array(datasetImageSchema).optional(),
  triggerWord: z.string().max(64).optional(),
  baseModel: z.string().max(32).optional(),
  recipe: recipeSchema,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "lora-train",
    { limit: 6, windowMs: 10 * 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const character = await prisma.character.findUnique({
      where: { id: parsed.characterId },
    });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const result = await enqueueLoraTraining({
      characterId: parsed.characterId,
      personality: character.personality,
      speechStyle: character.speechStyle,
      bio: character.bio,
      referenceImageUrls: parsed.referenceImageUrls,
      datasetImages: parsed.datasetImages,
      triggerWord: parsed.triggerWord,
      baseModel: parsed.baseModel,
      recipe: parsed.recipe,
    });

    return NextResponse.json({
      jobId: result.jobId,
      status: result.status,
      progress: result.progress ?? 0,
      adapterId: result.adapterId,
      message: "LoRA 训练已启动。完成后可用 adapter 生成角色内容。",
    });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "LoRA 训练启动失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const characterId = new URL(request.url).searchParams.get("characterId");
  if (!characterId) {
    return NextResponse.json({ error: "characterId required" }, { status: 400 });
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { creatorId: true },
  });
  if (!character || character.creatorId !== session.user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const status = await tickLoraJobProgress(characterId);
  if (!status) {
    return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
  }

  const generations = await prisma.loraGeneration.findMany({
    where: { characterId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json({ ...status, generations });
}
