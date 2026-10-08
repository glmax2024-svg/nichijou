/**
 * 角色「いまの様子」：画师设置的状态 + 最近动态的配图。
 * 没有设置状态、也没有近期动态时不显示，绝不编造。
 */

import { prisma } from "@/lib/prisma";
import { getDayPeriod, getJstHour, type DailyMediaItem, type DayPeriod, type LiveStatus } from "@/lib/character-live-status";

export const STATUS_MAX_HOURS = 72;
/** 近期动态的范围：这段时间内的带图动态会出现在状态面板里 */
const RECENT_POST_MS = 72 * 60 * 60 * 1000;

type StatusFields = {
  statusEmoji: string | null;
  statusText: string | null;
  statusUpdatedAt: Date | null;
  statusExpiresAt: Date | null;
};

/** 未过期的状态；没有则 null */
export function activeStatus(c: StatusFields, now = new Date()) {
  if (!c.statusText || !c.statusUpdatedAt) return null;
  if (c.statusExpiresAt && c.statusExpiresAt <= now) return null;
  return { emoji: c.statusEmoji ?? "", text: c.statusText, updatedAt: c.statusUpdatedAt, expiresAt: c.statusExpiresAt };
}

const PERIOD_LABEL: Record<DayPeriod, string> = {
  night: "夜",
  morning: "朝",
  school: "昼",
  afternoon: "午後",
  evening: "夕方",
};

const PERIOD_ICON: Record<DayPeriod, LiveStatus["timeIcon"]> = {
  night: "dark_mode",
  morning: "light_mode",
  school: "light_mode",
  afternoon: "light_mode",
  evening: "wb_twilight",
};

export function formatAgo(date: Date, now = new Date()): string {
  const min = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.round(h / 24)}日前`;
}

/** 聊天侧栏用：状态 + 近期带图动态。两者都没有时 liveStatus 为 null */
export async function loadCharacterLiveStatus(
  character: { id: string } & StatusFields,
  /** 有状态但没有近期配图时，面板用这张图（封面或头像） */
  fallbackImageUrl: string,
  now = new Date(),
): Promise<{ liveStatus: LiveStatus | null; dailyMedia: DailyMediaItem[]; dayPeriod: DayPeriod }> {
  const dayPeriod = getDayPeriod(getJstHour(now));
  const status = activeStatus(character, now);

  const posts = await prisma.post.findMany({
    where: {
      characterId: character.id,
      imageUrl: { not: null },
      publishedAt: { gte: new Date(now.getTime() - RECENT_POST_MS), lte: now },
    },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: { id: true, imageUrl: true, content: true, publishedAt: true },
  });

  const dailyMedia: DailyMediaItem[] = posts.map((p) => ({
    id: p.id,
    type: "image",
    url: p.imageUrl!,
    label: formatAgo(p.publishedAt, now),
  }));

  if (!status && posts.length === 0) return { liveStatus: null, dailyMedia: [], dayPeriod };

  const latest = posts[0];
  const liveStatus: LiveStatus = status
    ? {
        id: `status-${status.updatedAt.getTime()}`,
        title: PERIOD_LABEL[dayPeriod],
        caption: `${status.emoji ? `${status.emoji} ` : ""}${status.text}`,
        detail: `${formatAgo(status.updatedAt, now)}に更新`,
        timeIcon: PERIOD_ICON[dayPeriod],
        aiPrompt: status.text,
      }
    : {
        id: `post-${latest!.id}`,
        title: PERIOD_LABEL[dayPeriod],
        caption: latest!.content.split("\n")[0]!.slice(0, 60),
        detail: `${formatAgo(latest!.publishedAt, now)}の投稿`,
        timeIcon: PERIOD_ICON[dayPeriod],
        aiPrompt: latest!.content.slice(0, 200),
      };

  if (dailyMedia.length === 0) {
    dailyMedia.push({ id: "fallback", type: "image", url: fallbackImageUrl, label: "プロフィール" });
  }
  return { liveStatus, dailyMedia, dayPeriod };
}
