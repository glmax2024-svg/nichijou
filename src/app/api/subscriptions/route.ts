import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FailClosedError } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { enforceAdultUser } from "@/lib/security/age";
import { purchaseErrorResponse, purchaseSubscription } from "@/lib/purchases";
import { getCoinBalance } from "@/lib/coins";

const schema = z.object({
  characterId: z.string(),
});

/** 用金币购买 / 延长一期推し登録（30 天，不自动续费） */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "subscribe", { limit: 10, windowMs: 60_000 }, session.user.id);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { characterId } = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, published: true, subscriptionPrice: true },
    });
    if (!character?.published) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const { subscription, renewed } = await purchaseSubscription({ userId: session.user.id, character });
    return NextResponse.json({
      subscription,
      renewed,
      balance: await getCoinBalance(session.user.id),
    });
  } catch (error) {
    const purchase = purchaseErrorResponse(error);
    if (purchase) return purchase;
    if (error instanceof FailClosedError) return failClosedResponse(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    console.error("[subscriptions] failed:", error);
    return NextResponse.json({ error: "加入に失敗しました" }, { status: 500 });
  }
}
