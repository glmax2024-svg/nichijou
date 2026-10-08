import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FailClosedError } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { getGiftBySlug, listGiftCatalog, toPublicGift } from "@/lib/gifts/catalog";
import { purchaseErrorResponse, purchaseGift } from "@/lib/purchases";
import { getCoinBalance } from "@/lib/coins";

const schema = z.object({
  characterId: z.string(),
  giftType: z.string(),
  message: z.string().max(200).optional(),
});

export async function GET() {
  const catalog = await listGiftCatalog();
  return NextResponse.json({ gifts: catalog.map(toPublicGift) });
}

/** 用金币送礼物 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "gifts", { limit: 20, windowMs: 60_000 }, session.user.id);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { characterId, giftType, message } = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;
    const blocked = await enforceContentPolicy(message, "gift");
    if (blocked) return blocked;

    const gift = await getGiftBySlug(giftType);
    if (!gift) {
      return NextResponse.json({ error: "ギフトが見つかりません" }, { status: 400 });
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, published: true, creatorId: true },
    });
    if (!character || (!character.published && character.creatorId !== session.user.id)) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const record = await purchaseGift({ userId: session.user.id, characterId, gift, message });

    return NextResponse.json({
      gift: record,
      label: gift.name,
      emoji: gift.emoji,
      iconUrl: gift.iconUrl,
      animationUrl: gift.animationUrl,
      animationKind: gift.animationKind,
      balance: await getCoinBalance(session.user.id),
    });
  } catch (error) {
    const purchase = purchaseErrorResponse(error);
    if (purchase) return purchase;
    if (error instanceof FailClosedError) return failClosedResponse(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    console.error("[gifts] failed:", error);
    return NextResponse.json({ error: "ギフト送信に失敗しました" }, { status: 500 });
  }
}
