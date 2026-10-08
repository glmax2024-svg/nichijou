import { prisma } from "@/lib/prisma";
import { activeSubscriptionWhere } from "@/lib/subscriptions";

export async function getFeedPosts(limit = 50) {
  return prisma.post.findMany({
    where: { character: { published: true } },
    include: {
      character: {
        select: {
          id: true,
          slug: true,
          name: true,
          avatarUrl: true,
          tagline: true,
          tags: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getStoryCharacters() {
  return prisma.character.findMany({
    where: { published: true },
    include: { _count: { select: { posts: true, subscriptions: { where: activeSubscriptionWhere() } } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}

export async function getTrendingCharacters(limit = 5) {
  return prisma.character.findMany({
    where: { published: true },
    include: { _count: { select: { posts: true, subscriptions: { where: activeSubscriptionWhere() } } } },
    orderBy: { subscriptions: { _count: "desc" } },
    take: limit,
  });
}

/** 日本时间今天 0 点（UTC 时刻） */
export function startOfTodayJst(now = Date.now()): Date {
  const JST = 9 * 3600_000;
  return new Date(Math.floor((now + JST) / 86_400_000) * 86_400_000 - JST);
}

export function formatTimeAgo(date: Date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "たった今";
  if (sec < 3600) return `${Math.floor(sec / 60)}分前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}時間前`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}日前`;
  return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(date);
}
