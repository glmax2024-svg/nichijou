import { prisma } from "@/lib/prisma";
import { generateVoiceText, synthesizeWithVoiceClone } from "@/lib/ai/pipeline";
import type { OrderType } from "@prisma/client";
import { recordBondInteraction } from "@/lib/agent/relationship";
import { recordRevenueShare } from "@/lib/revenue/ledger";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export async function fulfillCheckoutSession(session: {
  id: string;
  metadata: Record<string, string> | null;
}) {
  const meta = session.metadata ?? {};
  const kind = meta.kind;
  const userId = meta.userId;
  const characterId = meta.characterId;
  if (!kind || !userId || !characterId) {
    throw new Error("checkout metadata missing");
  }

  if (kind === "subscription") {
    const periodEnd = new Date(Date.now() + PERIOD_MS);
    await prisma.subscription.upsert({
      where: { userId_characterId: { userId, characterId } },
      create: {
        userId,
        characterId,
        status: "ACTIVE",
        stripeSubscriptionId: session.id,
        currentPeriodEnd: periodEnd,
      },
      update: {
        status: "ACTIVE",
        stripeSubscriptionId: session.id,
        currentPeriodEnd: periodEnd,
      },
    });
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { subscriptionPrice: true },
    });
    await recordRevenueShare({
      characterId,
      kind: "SUBSCRIPTION",
      sourceId: `checkout:${session.id}`,
      grossAmount: character?.subscriptionPrice ?? 0,
    });
    return;
  }

  if (kind === "gift") {
    const existing = await prisma.gift.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) return;
    await prisma.gift.create({
      data: {
        userId,
        characterId,
        giftType: meta.giftType || "flower",
        amount: Number(meta.amount || 0),
        message: meta.message || null,
        stripeSessionId: session.id,
      },
    });
    await recordRevenueShare({
      characterId,
      kind: "GIFT",
      sourceId: `checkout:${session.id}`,
      grossAmount: Number(meta.amount || 0),
    });
    await recordBondInteraction({
      userId,
      characterId,
      type: "gift",
      summary: `ギフト: ${meta.giftType || "flower"}`,
      delta: 3,
    });
    return;
  }

  if (kind === "order") {
    const orderId = meta.orderId;
    if (!orderId) throw new Error("orderId missing");
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { character: true },
    });
    if (!order || order.userId !== userId) throw new Error("order not found");
    if (order.status === "PAID" || order.status === "FULFILLED") return;

    const voiceText =
      order.content ||
      (await generateVoiceText(order.character, order.type as OrderType, meta.customText));
    await synthesizeWithVoiceClone(
      voiceText,
      order.character.voiceEmbeddingId,
      order.character.id,
    );

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        content: voiceText,
        stripeSessionId: session.id,
      },
    });
    await recordRevenueShare({
      characterId,
      kind: "ORDER",
      sourceId: `checkout:${session.id}`,
      grossAmount: order.amount,
    });
    await recordBondInteraction({
      userId,
      characterId,
      type: "order",
      summary: `オーダー: ${order.type}`,
      delta: 5,
    });
  }
}
