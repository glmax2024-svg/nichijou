import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollVoiceProfile, validateSampleDuration } from "@/lib/ai/pipeline";
import { z } from "zod";
import { FailClosedError } from "@/lib/runtime";
import { failClosedResponse } from "@/lib/security/rate-limit";

const schema = z.object({
  characterId: z.string(),
  sampleAudioUrl: z.string().url(),
  durationSec: z.number().min(1).max(30),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const character = await prisma.character.findUnique({ where: { id: data.characterId } });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const durationErr = validateSampleDuration(data.durationSec);
    if (durationErr) {
      return NextResponse.json({ error: durationErr }, { status: 400 });
    }

    const result = await enrollVoiceProfile({
      characterId: data.characterId,
      sampleAudioUrl: data.sampleAudioUrl,
      durationSec: data.durationSec,
    });

    return NextResponse.json({
      embeddingId: result.embeddingId,
      status: result.status,
      message: "5 秒声纹采集完成，后续 TTS 将使用该声线",
    });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "声纹注册失败" }, { status: 500 });
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
  if (!character) {
    return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
  }

  const profile = await prisma.voiceProfile.findUnique({ where: { characterId } });
  if (!profile) {
    return NextResponse.json({ status: "NONE" });
  }

  if (character.creatorId !== session.user.id) {
    return NextResponse.json({
      status: profile.status,
      enrolled: Boolean(profile.embeddingId),
    });
  }

  return NextResponse.json(profile);
}
