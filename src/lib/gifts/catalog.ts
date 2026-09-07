import { prisma } from "@/lib/prisma";
import {
  animationKindFromUrl,
  DEFAULT_GIFT_CATALOG,
  type GiftAnimationKind,
  type GiftCatalogItem,
} from "./types";

export { DEFAULT_GIFT_CATALOG, GIFT_OPTIONS, animationKindFromUrl, toPublicGift } from "./types";
export type { GiftCatalogItem, GiftAnimationKind } from "./types";

function fromRow(row: {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  iconUrl: string | null;
  animationUrl: string | null;
  animationKind: string;
  amount: number;
  sortOrder: number;
  active: boolean;
  intimacyDelta: number;
  description: string;
  accentColor: string;
}): GiftCatalogItem {
  const kind = (["none", "gif", "mp4"].includes(row.animationKind)
    ? row.animationKind
    : animationKindFromUrl(row.animationUrl)) as GiftAnimationKind;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    emoji: row.emoji,
    iconUrl: row.iconUrl,
    animationUrl: row.animationUrl,
    animationKind: kind,
    amount: row.amount,
    sortOrder: row.sortOrder,
    active: row.active,
    intimacyDelta: row.intimacyDelta,
    description: row.description,
    accentColor: row.accentColor,
  };
}

export async function listGiftCatalog(opts?: { includeInactive?: boolean }): Promise<GiftCatalogItem[]> {
  try {
    const rows = await prisma.giftItem.findMany({
      where: opts?.includeInactive ? undefined : { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length > 0) return rows.map(fromRow);
  } catch (err) {
    console.error("[gifts] catalog fallback:", err);
  }
  const defaults = DEFAULT_GIFT_CATALOG;
  return opts?.includeInactive ? defaults : defaults.filter((item) => item.active);
}

export async function getGiftBySlug(slug: string): Promise<GiftCatalogItem | null> {
  const catalog = await listGiftCatalog({ includeInactive: true });
  return catalog.find((item) => item.slug === slug && item.active) ?? null;
}

export async function mapGiftsBySlug() {
  const catalog = await listGiftCatalog({ includeInactive: true });
  return new Map(catalog.map((item) => [item.slug, item]));
}
