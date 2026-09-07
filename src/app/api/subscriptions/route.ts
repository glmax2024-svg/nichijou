import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FailClosedError, isDemoMode, isStripeConfigured } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { createYenCheckout } from "@/lib/stripe";
import { enforceAdultUser } from "@/lib/security/age";
import { recordRevenueShare } from "@/lib/revenue/ledger";

const schema = z.object({
  characterId: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "subscribe",
    { limit: 10, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const { characterId } = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character?.published) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const existing = await prisma.subscription.findUnique({
      where: {
        userId_characterId: { userId: session.user.id, characterId },
      },
    });

    if (existing?.status === "ACTIVE") {
      return NextResponse.json({ subscription: existing, message: "既に加入済みです" });
    }

    if (!isStripeConfigured()) {
      if (!isDemoMode()) {
        throw new FailClosedError("決済が未設定のため加入できません", "PAYMENTS_DISABLED");
      }

      const subscription = await prisma.subscription.upsert({
        where: {
          userId_characterId: { userId: session.user.id, characterId },
        },
        create: {
          userId: session.user.id,
          characterId,
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await recordRevenueShare({
        characterId,
        kind: "SUBSCRIPTION",
        sourceId: `sub:${subscription.id}:${subscription.currentPeriodEnd?.toISOString() ?? subscription.id}`,
        grossAmount: character.subscriptionPrice,
      });
      return NextResponse.json({ subscription, demo: true });
    }

    const checkout = await createYenCheckout({
      userId: session.user.id,
      amount: character.subscriptionPrice,
      name: `${character.name} 推しパッケージ`,
      successPath: "/subscriptions",
      cancelPath: "/subscriptions",
      metadata: {
        kind: "subscription",
        userId: session.user.id,
        characterId,
      },
    });

    return NextResponse.json({ checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "加入に失敗しました" }, { status: 500 });
  }
}
