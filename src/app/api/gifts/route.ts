import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createYenCheckout } from "@/lib/stripe";
import { z } from "zod";
import { FailClosedError, isDemoMode, isStripeConfigured } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { recordBondInteraction } from "@/lib/agent/relationship";
import { recordRevenueShare } from "@/lib/revenue/ledger";
import { getGiftBySlug, listGiftCatalog, toPublicGift } from "@/lib/gifts/catalog";

const schema = z.object({
  characterId: z.string(),
  giftType: z.string(),
  message: z.string().max(200).optional(),
});

export async function GET() {
  const catalog = await listGiftCatalog();
  return NextResponse.json({ gifts: catalog.map(toPublicGift) });
}

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

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    if (!isStripeConfigured()) {
      if (!isDemoMode()) {
        throw new FailClosedError("決済が未設定のためギフトを送れません", "PAYMENTS_DISABLED");
      }

      const record = await prisma.gift.create({
        data: {
          userId: session.user.id,
          characterId,
          giftType: gift.slug,
          amount: gift.amount,
          message,
        },
      });
      await recordBondInteraction({
        userId: session.user.id,
        characterId,
        type: "gift",
        summary: `ギフト: ${gift.name}`,
        delta: gift.intimacyDelta,
      });
      await recordRevenueShare({
        characterId,
        kind: "GIFT",
        sourceId: `gift:${record.id}`,
        grossAmount: gift.amount,
      });

      return NextResponse.json({
        gift: record,
        label: gift.name,
        emoji: gift.emoji,
        iconUrl: gift.iconUrl,
        animationUrl: gift.animationUrl,
        animationKind: gift.animationKind,
        demo: true,
      });
    }

    const checkout = await createYenCheckout({
      userId: session.user.id,
      amount: gift.amount,
      name: `${character.name} へ ${gift.name}`,
      successPath: "/gifts",
      cancelPath: "/gifts",
      metadata: {
        kind: "gift",
        userId: session.user.id,
        characterId,
        giftType: gift.slug,
        amount: String(gift.amount),
        message: message ?? "",
      },
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      label: gift.name,
      emoji: gift.emoji,
      iconUrl: gift.iconUrl,
      animationUrl: gift.animationUrl,
      animationKind: gift.animationKind,
    });
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
