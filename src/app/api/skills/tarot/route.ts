import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatAccess } from "@/lib/chat-quota";
import { generateTarotReading, buildTarotUserMessage } from "@/lib/ai/tarot-reading";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";

const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  numeral: z.string(),
  emoji: z.string(),
  upright: z.string(),
  reversed: z.string(),
  position: z.string(),
  isReversed: z.boolean(),
});

const schema = z.object({
  characterId: z.string(),
  cards: z.array(cardSchema).length(3),
  question: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { characterId, cards, question } = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        personality: true,
        speechStyle: true,
        bio: true,
        identity: true,
        worldRules: true,
        brandVoice: true,
        boundaries: true,
        contentRating: true,
        tagline: true,
        loraAdapterId: true,
        loraStatus: true,
        voiceEmbeddingId: true,
        creatorId: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }
    const blocked = await enforceContentPolicy(question, "chat", {
      contentRating: character.contentRating,
    });
    if (blocked) return blocked;

    const access = await getChatAccess(session.user.id, character);
    if (!access.canSend) {
      return NextResponse.json(
        {
          error: "本日の無料メッセージ上限に達しました",
          code: "DAILY_LIMIT",
          used: access.used,
          limit: access.limit,
        },
        { status: 403 },
      );
    }

    const userContent = buildTarotUserMessage(cards, question);
    const reading = await generateTarotReading(character, cards, question, access.isSubscribed);

    const userMessage = await prisma.message.create({
      data: {
        userId: session.user.id,
        characterId,
        role: "user",
        content: userContent,
      },
    });

    const assistantMessage = await prisma.message.create({
      data: {
        userId: session.user.id,
        characterId,
        role: "assistant",
        content: reading,
        isAiGenerated: true,
      },
    });

    return NextResponse.json({ userMessage, assistantMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストを確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "占いに失敗しました" }, { status: 500 });
  }
}
