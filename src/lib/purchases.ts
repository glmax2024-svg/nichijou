/**
 * 金币消费：推し登録、ギフト、オーダー。
 *
 * 扣金币与创建业务记录在同一个事务里，同成同败；
 * 画师分成、亲密度在事务外记（都是幂等的，失败只打日志，不影响用户已付款的结果）。
 */

import { NextResponse } from "next/server";
import type { Character, Gift, Order, Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { changeCoinsInTx, InsufficientCoinsError } from "@/lib/coins";
import { recordRevenueShare } from "@/lib/revenue/ledger";
import { recordBondInteraction } from "@/lib/agent/relationship";
import { generateVoiceText, synthesizeWithVoiceClone } from "@/lib/ai/pipeline";
import { discardOrderVoice, storeOrderVoice } from "@/lib/order-voice";
import { resolveMediaUrl } from "@/lib/media";
import { ORDER_OPTIONS, SUBSCRIPTION_EXPIRING_DAYS, SUBSCRIPTION_PERIOD_MS, type OrderOptionType } from "@/lib/pricing";
import { isSubscriptionActive } from "@/lib/subscriptions";
import type { GiftCatalogItem } from "@/lib/gifts/types";

export class PurchaseError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "PurchaseError";
  }
}

/** 路由里统一把购买相关的错误转成响应；不是购买错误返回 null，交给调用方处理 */
export function purchaseErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InsufficientCoinsError) {
    return NextResponse.json(
      {
        error: "コインが足りません",
        code: "INSUFFICIENT_COINS",
        balance: error.balance,
        required: error.required,
      },
      { status: 402 },
    );
  }
  if (error instanceof PurchaseError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return null;
}

async function afterPayment(task: Promise<unknown>, label: string) {
  try {
    await task;
  } catch (err) {
    console.error(`[purchase] ${label} failed:`, err);
  }
}

// ---------------------------------------------------------------- 推し登録

/**
 * 购买一期（30 天）。未加入或已过期从现在开始算；
 * 加入中且临近到期（SUBSCRIPTION_EXPIRING_DAYS 天内）则从当前到期日顺延；
 * 还早的时候拒绝，避免误点重复扣费。
 */
export async function purchaseSubscription(params: {
  userId: string;
  character: Pick<Character, "id" | "subscriptionPrice">;
}): Promise<{ subscription: Subscription; renewed: boolean }> {
  const { userId, character } = params;
  const price = character.subscriptionPrice;

  const result = await prisma.$transaction(async (tx) => {
    // 先确保有一行，再加行锁，避免并发请求各扣一次
    const row = await tx.subscription.upsert({
      where: { userId_characterId: { userId, characterId: character.id } },
      create: { userId, characterId: character.id, status: "CANCELED" },
      update: {},
    });
    await tx.$queryRaw`SELECT id FROM "Subscription" WHERE id = ${row.id} FOR UPDATE`;
    const current = await tx.subscription.findUniqueOrThrow({ where: { id: row.id } });

    const now = new Date();
    const active = isSubscriptionActive(current, now);
    if (active) {
      const renewFrom = current.currentPeriodEnd!.getTime() - SUBSCRIPTION_EXPIRING_DAYS * 24 * 60 * 60 * 1000;
      if (now.getTime() < renewFrom) {
        throw new PurchaseError(
          `まだ有効です。期限の${SUBSCRIPTION_EXPIRING_DAYS}日前から延長できます`,
          "ALREADY_ACTIVE",
          409,
        );
      }
    }

    const start = active ? current.currentPeriodEnd! : now;
    const periodEnd = new Date(start.getTime() + SUBSCRIPTION_PERIOD_MS);
    const periodKey = `${current.id}:${periodEnd.toISOString()}`;

    await changeCoinsInTx(tx, {
      userId,
      delta: -price,
      reason: "subscription",
      refType: "subscription_period",
      refId: periodKey,
    });
    const subscription = await tx.subscription.update({
      where: { id: current.id },
      data: { status: "ACTIVE", currentPeriodEnd: periodEnd },
    });
    return { subscription, renewed: active, periodKey };
  });

  await afterPayment(
    recordRevenueShare({
      characterId: character.id,
      kind: "SUBSCRIPTION",
      sourceId: `sub:${result.periodKey}`,
      grossAmount: price,
    }),
    "subscription revenue share",
  );
  return { subscription: result.subscription, renewed: result.renewed };
}

// ---------------------------------------------------------------- ギフト

export async function purchaseGift(params: {
  userId: string;
  characterId: string;
  gift: GiftCatalogItem;
  message?: string;
}): Promise<Gift> {
  const { userId, characterId, gift, message } = params;

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.gift.create({
      data: { userId, characterId, giftType: gift.slug, amount: gift.amount, message },
    });
    await changeCoinsInTx(tx, {
      userId,
      delta: -gift.amount,
      reason: "gift",
      refType: "gift",
      refId: created.id,
    });
    return created;
  });

  await afterPayment(
    recordBondInteraction({
      userId,
      characterId,
      type: "gift",
      summary: `ギフト: ${gift.name}`,
      delta: gift.intimacyDelta,
    }),
    "gift bond",
  );
  await afterPayment(
    recordRevenueShare({ characterId, kind: "GIFT", sourceId: `gift:${record.id}`, grossAmount: gift.amount }),
    "gift revenue share",
  );
  return record;
}

// ---------------------------------------------------------------- オーダー

/**
 * 先确认余额 → 生成台词与语音 → 事务里扣金币并建单。
 * 台词或语音任何一步失败都不扣钱（オーダー卖的就是语音，没有语音不能算交付）；
 * 生成成功但扣款时余额被别处花掉，则这次生成作废。
 */
export async function purchaseOrder(params: {
  userId: string;
  character: Character;
  type: OrderOptionType;
  scheduledAt?: Date | null;
  customText?: string;
}): Promise<{ order: Order; voiceText: string }> {
  const { userId, character, type } = params;
  const option = ORDER_OPTIONS.find((o) => o.type === type);
  if (!option) throw new PurchaseError("サービスが見つかりません", "UNKNOWN_ORDER_TYPE");
  if (type === "CUSTOM" && !params.customText?.trim()) {
    throw new PurchaseError("セリフを入力してください", "CUSTOM_TEXT_REQUIRED");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true } });
  if (!user) throw new PurchaseError("ユーザーが見つかりません", "USER_NOT_FOUND", 404);
  if (user.coinBalance < option.amount) throw new InsufficientCoinsError(user.coinBalance, option.amount);

  const voiceText = await generateVoiceText(character, type, params.customText?.trim());
  const audio = await synthesizeWithVoiceClone(voiceText, character.voiceEmbeddingId, character.id);
  if (!audio?.length) {
    throw new PurchaseError("音声を生成できませんでした。コインは消費されていません。時間をおいてお試しください", "VOICE_UNAVAILABLE", 503);
  }

  const asset = await storeOrderVoice({ userId, characterId: character.id, audio });
  const voiceUrl = resolveMediaUrl(asset);

  let order: Order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          characterId: character.id,
          type,
          status: "FULFILLED",
          amount: option.amount,
          scheduledAt: params.scheduledAt ?? null,
          content: voiceText,
          voiceAssetId: asset.id,
          voiceUrl,
        },
      });
      await changeCoinsInTx(tx, {
        userId,
        delta: -option.amount,
        reason: "order",
        refType: "order",
        refId: created.id,
      });
      return created;
    });
  } catch (err) {
    await discardOrderVoice(asset.id);
    throw err;
  }

  await afterPayment(
    recordBondInteraction({ userId, characterId: character.id, type: "order", summary: `オーダー: ${option.label}`, delta: 5 }),
    "order bond",
  );
  await afterPayment(
    recordRevenueShare({
      characterId: character.id,
      kind: "ORDER",
      sourceId: `order:${order.id}`,
      grossAmount: option.amount,
    }),
    "order revenue share",
  );
  return { order, voiceText };
}
