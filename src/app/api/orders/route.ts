import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ORDER_OPTIONS, createYenCheckout } from "@/lib/stripe";
import { generateVoiceText, synthesizeWithVoiceClone } from "@/lib/ai/pipeline";
import { z } from "zod";
import { FailClosedError, isDemoMode, isStripeConfigured } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { recordBondInteraction } from "@/lib/agent/relationship";
import { recordRevenueShare } from "@/lib/revenue/ledger";

const schema = z.object({
  characterId: z.string(),
  type: z.enum(["BIRTHDAY", "WAKE_UP", "CUSTOM"]),
  scheduledAt: z.string().datetime().optional(),
  customText: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "orders",
    { limit: 8, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;
    const blocked = await enforceContentPolicy(data.customText, "order");
    if (blocked) return blocked;

    const character = await prisma.character.findUnique({ where: { id: data.characterId } });
    if (!character) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const option = ORDER_OPTIONS.find((o) => o.type === data.type);
    if (!option) {
      return NextResponse.json({ error: "サービスが見つかりません" }, { status: 400 });
    }

    if (!isStripeConfigured() && !isDemoMode()) {
      throw new FailClosedError("決済が未設定のため注文できません", "PAYMENTS_DISABLED");
    }

    // 真实支付未接通：只建 PENDING，不生成语音。Demo 才预生成。
    const fulfillNow = isDemoMode() && !isStripeConfigured();

    let voiceText: string | null = null;
    let audioBuffer: Buffer | null = null;
    if (fulfillNow) {
      voiceText = await generateVoiceText(character, data.type, data.customText);
      audioBuffer = await synthesizeWithVoiceClone(
        voiceText,
        character.voiceEmbeddingId,
        character.id,
      );
    }

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        characterId: data.characterId,
        type: data.type,
        status: fulfillNow ? "PAID" : "PENDING",
        amount: option.amount,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        content: voiceText,
      },
    });

    if (fulfillNow) {
      await recordBondInteraction({
        userId: session.user.id,
        characterId: data.characterId,
        type: "order",
        summary: `オーダー: ${data.type}`,
        delta: 5,
      });
      await recordRevenueShare({
        characterId: data.characterId,
        kind: "ORDER",
        sourceId: `order:${order.id}`,
        grossAmount: option.amount,
      });
      return NextResponse.json({
        order,
        voiceText,
        voiceCloned: !!character.voiceEmbeddingId,
        hasAudio: !!audioBuffer,
        demo: true,
      });
    }

    const checkout = await createYenCheckout({
      userId: session.user.id,
      amount: option.amount,
      name: `${character.name} ${option.label}`,
      successPath: "/orders",
      cancelPath: "/orders",
      metadata: {
        kind: "order",
        userId: session.user.id,
        characterId: data.characterId,
        orderId: order.id,
        customText: data.customText ?? "",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkout.id },
    });

    return NextResponse.json({ order, checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "注文に失敗しました" }, { status: 500 });
  }
}
