import { prisma } from "@/lib/prisma";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import { daysLeft, SUBSCRIPTION_EXPIRING_DAYS } from "@/lib/pricing";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本时间本月 1 日 0 点 */
export function startOfMonthJst(now = new Date()): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET_MS);
}

/** 「マイ推し」页：加入中的推し（含剩余天数）+ 本月送礼统计 */
export async function loadMySubscriptions(userId: string) {
  const now = new Date();
  const [subs, gifts] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId, ...activeSubscriptionWhere(now) },
      include: { character: { select: { slug: true, name: true, avatarUrl: true, subscriptionPrice: true } } },
      orderBy: { currentPeriodEnd: "asc" },
    }),
    prisma.gift.aggregate({
      where: { userId, createdAt: { gte: startOfMonthJst(now) } },
      _count: true,
      _sum: { amount: true },
    }),
  ]);

  return {
    subscriptions: subs.map((sub) => {
      const left = daysLeft(sub.currentPeriodEnd, now);
      return { ...sub, daysLeft: left, expiring: left <= SUBSCRIPTION_EXPIRING_DAYS };
    }),
    giftsThisMonth: { count: gifts._count, coins: gifts._sum.amount ?? 0 },
  };
}

export type MySubscription = Awaited<ReturnType<typeof loadMySubscriptions>>["subscriptions"][number];
