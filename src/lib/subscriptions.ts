import type { Prisma } from "@prisma/client";

/**
 * 推し登録是按期购买（没有自动续费），所以「有效」= ACTIVE 且未到期。
 * 所有判断是否加入中的查询都要用这里，不能只看 status。
 */
export function activeSubscriptionWhere(now = new Date()): Prisma.SubscriptionWhereInput {
  return { status: "ACTIVE", currentPeriodEnd: { gt: now } };
}

export function isSubscriptionActive(
  sub: { status: string; currentPeriodEnd: Date | null } | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(sub && sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd > now);
}
