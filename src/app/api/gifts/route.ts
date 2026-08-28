import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GIFT_OPTIONS } from "@/lib/stripe";
import { z } from "zod";
import { FailClosedError, isDemoMode } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";

const schema = z.object({
  characterId: z.string(),
  giftType: z.string(),
  message: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "gifts",
    { limit: 20, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    if (!isDemoMode()) {
      throw new FailClosedError("ギフト決済はまだ有効になっていません", "PAYMENTS_DISABLED");
    }

    const body = await request.json();
    const { characterId, giftType, message } = schema.parse(body);

    const gift = GIFT_OPTIONS.find((g) => g.id === giftType);
    if (!gift) {
      return NextResponse.json({ error: "ギフトが見つかりません" }, { status: 400 });
    }

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const record = await prisma.gift.create({
      data: {
        userId: session.user.id,
        characterId,
        giftType,
        amount: gift.amount,
        message,
      },
    });

    return NextResponse.json({ gift: record, label: gift.label, emoji: gift.emoji, demo: true });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "ギフト送信に失敗しました" }, { status: 500 });
  }
}
