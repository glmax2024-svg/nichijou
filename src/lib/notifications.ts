import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/feed";
import { characterChatHref } from "@/lib/chat-inbox";

export type AppNotification = {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  href: string;
  time: string;
  unread: boolean;
};

export async function getNotifications(
  userId: string,
  basePath: "" | "/h5" | "/app",
): Promise<AppNotification[]> {
  const charPath = (slug: string) =>
    basePath ? `${basePath}/characters/${slug}` : `/characters/${slug}`;

  const [recentPosts, recentMessages, recentGifts] = await Promise.all([
    prisma.post.findMany({
      where: {
        character: {
          published: true,
          subscriptions: { some: { userId, status: "ACTIVE" } },
        },
      },
      include: { character: { select: { slug: true, name: true, avatarUrl: true } } },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.message.findMany({
      where: { userId, role: "assistant" },
      include: { character: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.gift.findMany({
      where: { userId },
      include: { character: { select: { slug: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const [user, renewal] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { notificationsSeenAt: true, createdAt: true } }),
    dueRenewal(userId),
  ]);
  const seenAt = user?.notificationsSeenAt ?? null;
  const isUnread = (at: Date) => !seenAt || at > seenAt;

  const items: (AppNotification & { at: Date })[] = [];

  for (const post of recentPosts) {
    items.push({
      id: `post-${post.id}`,
      icon: "auto_awesome",
      iconColor: "#ef7488",
      title: `${post.character.name} が新しい日常を投稿`,
      body: post.content.slice(0, 60) + (post.content.length > 60 ? "…" : ""),
      href: charPath(post.character.slug),
      time: formatTimeAgo(post.publishedAt),
      at: post.publishedAt,
      unread: isUnread(post.publishedAt),
    });
  }

  for (const msg of recentMessages) {
    items.push({
      id: `msg-${msg.id}`,
      icon: "chat_bubble",
      iconColor: "#7d97e0",
      title: `${msg.character.name} から返信`,
      body: msg.content.slice(0, 60) + (msg.content.length > 60 ? "…" : ""),
      href: characterChatHref(basePath, msg.character.slug),
      time: formatTimeAgo(msg.createdAt),
      at: msg.createdAt,
      // 聊天回复用户在聊天窗口里已经看到，这里只做记录，不计未读
      unread: false,
    });
  }

  // 自己送出的礼物只做记录，不算未读
  for (const gift of recentGifts) {
    items.push({
      id: `gift-${gift.id}`,
      icon: "redeem",
      iconColor: "#e0a93a",
      title: `${gift.character.name} にギフトを贈りました`,
      body: `${gift.amount.toLocaleString()} のギフト`,
      href: basePath ? `${basePath}/gifts` : "/gifts",
      time: formatTimeAgo(gift.createdAt),
      at: gift.createdAt,
      unread: false,
    });
  }

  // 续费提醒：只在 7 天内真正到期时出现，提醒时刻按到期前 7 天算
  if (renewal) {
    items.push({
      id: `sub-renewal-${renewal.id}`,
      icon: "favorite",
      iconColor: "#3fae76",
      title: `${renewal.character.name} の更新リマインド`,
      body: `${renewal.currentPeriodEnd!.toLocaleDateString("ja-JP")} に更新されます`,
      href: basePath ? `${basePath}/subscriptions` : "/subscriptions",
      time: formatTimeAgo(renewal.remindAt),
      at: renewal.remindAt,
      unread: isUnread(renewal.remindAt),
    });
  }

  if (user) {
    items.push({
      id: "welcome",
      icon: "celebration",
      iconColor: "#8b76d4",
      title: "日常へようこそ",
      body: "推しキャラの日常を毎日チェックしよう",
      href: basePath ? `${basePath}/discover` : "/discover",
      time: formatTimeAgo(user.createdAt),
      at: user.createdAt,
      unread: false,
    });
  }

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 20)
    .map((item): AppNotification => {
      const { at, ...rest } = item;
      void at;
      return rest;
    });
}

const RENEWAL_NOTICE_MS = 7 * 86_400_000;

/** 7 天内到期、最早的一个有效订阅 */
async function dueRenewal(userId: string) {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + RENEWAL_NOTICE_MS) } },
    include: { character: { select: { name: true } } },
    orderBy: { currentPeriodEnd: "asc" },
  });
  return sub ? { ...sub, remindAt: new Date(sub.currentPeriodEnd!.getTime() - RENEWAL_NOTICE_MS) } : null;
}

/** 打开通知页时调用：之前的通知全部视为已读 */
export async function markNotificationsSeen(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { notificationsSeenAt: new Date() } });
}

/** 页头角标用：只做计数查询，比生成完整列表轻 */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { notificationsSeenAt: true } });
  if (!user) return 0;
  const after = user.notificationsSeenAt ?? new Date(0);
  const [posts, renewal] = await Promise.all([
    prisma.post.count({
      where: {
        publishedAt: { gt: after },
        character: { published: true, subscriptions: { some: { userId, status: "ACTIVE" } } },
      },
    }),
    dueRenewal(userId),
  ]);
  return posts + (renewal && renewal.remindAt > after ? 1 : 0);
}
