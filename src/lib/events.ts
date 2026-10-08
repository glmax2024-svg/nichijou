import type { PlatformEvent } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { EVENT_THEME_IDS, type PublicEvent } from "@/lib/event-themes";

export function liveEventWhere(now = new Date()) {
  return { published: true, startsAt: { lte: now }, endsAt: { gt: now } };
}

export function toPublicEvent(row: PlatformEvent): PublicEvent {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    badge: row.badge,
    theme: row.theme,
    imageUrl: row.imageUrl,
    linkHref: row.linkHref,
    ctaLabel: row.ctaLabel,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  };
}

/** 正在进行的活动，按 sortOrder、开始时间排 */
export async function listLiveEvents(limit = 3): Promise<PublicEvent[]> {
  const rows = await prisma.platformEvent.findMany({
    where: liveEventWhere(),
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
    take: limit,
  });
  return rows.map(toPublicEvent);
}

/** 详情页：未发布或已结束的活动只有管理员能看 */
export async function getEventForViewer(id: string, isAdmin: boolean): Promise<PublicEvent | null> {
  const row = await prisma.platformEvent.findUnique({ where: { id } });
  if (!row) return null;
  if (!isAdmin && (!row.published || row.startsAt > new Date())) return null;
  return toPublicEvent(row);
}

/** 站内路径或 https 链接；禁止 javascript: 等协议 */
const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/") ? !v.startsWith("//") : /^https:\/\/[^\s]+$/.test(v), "URL は / で始まるパスか https:// にしてください");

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(60),
    subtitle: z.string().trim().max(120).default(""),
    description: z.string().trim().max(4000).default(""),
    badge: z.string().trim().min(1).max(20).default("期間限定イベント"),
    theme: z.enum(EVENT_THEME_IDS as [string, ...string[]]).default("sakura"),
    imageUrl: safeUrl.nullable().optional(),
    linkHref: safeUrl.nullable().optional(),
    ctaLabel: z.string().trim().min(1).max(20).default("詳しく見る"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    published: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(10_000).default(100),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "終了日時は開始日時より後にしてください", path: ["endsAt"] });

export type EventInput = z.infer<typeof eventInputSchema>;

/** 渲染时取当前时间（放在组件外，避免 React 纯度检查报错） */
export function nowMs(): number {
  return Date.now();
}
