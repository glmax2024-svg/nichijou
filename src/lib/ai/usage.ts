/**
 * AI 用量记账 — 成本控制的度量层
 *
 * 每次 gateway 调用写一条 AiUsageLog（fire-and-forget，失败不影响主链路）。
 * model-router 用当日输出 token 总量做预算降档；运营侧可按 scene / model 出账。
 */

import { prisma } from "@/lib/prisma";
import type { GatewayProtocol, GatewayUsage } from "./gateway";

export type UsageRecord = {
  scene: string;
  tier: string;
  model: string;
  protocol: GatewayProtocol;
  usage: GatewayUsage;
  latencyMs: number;
  ok: boolean;
  userId?: string | null;
  characterId?: string | null;
  errorMsg?: string | null;
};

/** 与 chat-quota 保持一致：按日本时间切日。 */
export function startOfTodayJst(): Date {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${dateKey}T00:00:00+09:00`);
}

/** 记一笔用量。永不 throw —— 记账失败不能拖垮对话。 */
export function recordUsage(record: UsageRecord): void {
  const line = [
    `[ai-usage] scene=${record.scene}`,
    `tier=${record.tier}`,
    `model=${record.model}`,
    `proto=${record.protocol}`,
    `in=${record.usage.inputTokens}`,
    `cached=${record.usage.cachedInputTokens}`,
    `out=${record.usage.outputTokens}`,
    `ms=${record.latencyMs}`,
    `ok=${record.ok}`,
  ].join(" ");
  if (record.ok) console.log(line);
  else console.warn(`${line} err=${record.errorMsg ?? ""}`);

  void prisma.aiUsageLog
    .create({
      data: {
        scene: record.scene,
        tier: record.tier,
        model: record.model,
        protocol: record.protocol,
        userId: record.userId ?? null,
        characterId: record.characterId ?? null,
        inputTokens: record.usage.inputTokens,
        outputTokens: record.usage.outputTokens,
        cachedTokens: record.usage.cachedInputTokens,
        latencyMs: record.latencyMs,
        ok: record.ok,
        errorMsg: record.errorMsg?.slice(0, 500) ?? null,
      },
    })
    .catch((err: unknown) => {
      console.warn("[ai-usage] persist failed (run `npm run db:push`?):", err);
    });
}

let cachedTotal: { value: number; at: number } | null = null;
const TOTAL_CACHE_MS = 60_000;

/** 当日输出 token 总量（60s 缓存），预算守卫用。 */
export async function getTodayOutputTokens(): Promise<number> {
  if (cachedTotal && Date.now() - cachedTotal.at < TOTAL_CACHE_MS) {
    return cachedTotal.value;
  }
  try {
    const agg = await prisma.aiUsageLog.aggregate({
      _sum: { outputTokens: true },
      where: { createdAt: { gte: startOfTodayJst() }, ok: true },
    });
    const value = agg._sum.outputTokens ?? 0;
    cachedTotal = { value, at: Date.now() };
    return value;
  } catch {
    // 表还没建 / DB 不可用时不阻塞主链路
    cachedTotal = { value: 0, at: Date.now() };
    return 0;
  }
}

export function invalidateUsageCache(): void {
  cachedTotal = null;
}

/** 运营视图：按 scene / model 聚合最近 N 天用量。 */
export async function getUsageSummary(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [byScene, byModel] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ["scene", "tier"],
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, cachedTokens: true },
        _count: { _all: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["model", "protocol"],
        where: { createdAt: { gte: since } },
        _sum: { inputTokens: true, outputTokens: true, cachedTokens: true },
        _count: { _all: true },
      }),
    ]);
    return { days, byScene, byModel };
  } catch {
    return { days, byScene: [], byModel: [] };
  }
}
