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

  const [recentPosts, recentMessages, recentGifts, subscriptions] = await Promise.all([
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
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      include: { character: { select: { slug: true, name: true } } },
      take: 3,
    }),
  ]);

  const items: AppNotification[] = [];

  for (const post of recentPosts) {
    items.push({
      id: `post-${post.id}`,
      icon: "auto_awesome",
      iconColor: "#ef7488",
      title: `${post.character.name} が新しい日常を投稿`,
      body: post.content.slice(0, 60) + (post.content.length > 60 ? "…" : ""),
      href: charPath(post.character.slug),
      time: formatTimeAgo(post.publishedAt),
      unread: Date.now() - post.publishedAt.getTime() < 86400000,
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
      unread: Date.now() - msg.createdAt.getTime() < 43200000,
    });
  }

  for (const gift of recentGifts) {
    items.push({
      id: `gift-${gift.id}`,
      icon: "redeem",
      iconColor: "#e0a93a",
      title: `${gift.character.name} にギフトを贈りました`,
      body: `¥${gift.amount.toLocaleString()} のギフトが届きました`,
      href: basePath ? `${basePath}/gifts` : "/gifts",
      time: formatTimeAgo(gift.createdAt),
      unread: false,
    });
  }

  if (subscriptions[0]) {
    items.push({
      id: "sub-renewal",
      icon: "favorite",
      iconColor: "#3fae76",
      title: `${subscriptions[0].character.name} の更新リマインド`,
      body: "次回更新日が近づいています",
      href: basePath ? `${basePath}/subscriptions` : "/subscriptions",
      time: "今日",
      unread: true,
    });
  }

  items.push({
    id: "welcome",
    icon: "celebration",
    iconColor: "#8b76d4",
    title: "日常へようこそ",
    body: "推しキャラの日常を毎日チェックしよう",
    href: basePath ? `${basePath}/discover` : "/discover",
    time: "",
    unread: false,
  });

  return items
    .sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1))
    .slice(0, 20);
}
