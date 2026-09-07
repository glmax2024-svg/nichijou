export type GiftAnimationKind = "none" | "gif" | "mp4";

export type GiftCatalogItem = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  iconUrl: string | null;
  animationUrl: string | null;
  animationKind: GiftAnimationKind;
  amount: number;
  sortOrder: number;
  active: boolean;
  intimacyDelta: number;
  description: string;
  accentColor: string;
};

export const DEFAULT_GIFT_CATALOG: GiftCatalogItem[] = [
  {
    id: "flower",
    slug: "flower",
    name: "花束",
    emoji: "💐",
    iconUrl: null,
    animationUrl: null,
    animationKind: "none",
    amount: 300,
    sortOrder: 10,
    active: true,
    intimacyDelta: 3,
    description: "",
    accentColor: "#ffe1e6",
  },
  {
    id: "coffee",
    slug: "coffee",
    name: "コーヒー",
    emoji: "☕",
    iconUrl: null,
    animationUrl: null,
    animationKind: "none",
    amount: 500,
    sortOrder: 20,
    active: true,
    intimacyDelta: 3,
    description: "",
    accentColor: "#eaf1fb",
  },
  {
    id: "cake",
    slug: "cake",
    name: "ケーキ",
    emoji: "🎂",
    iconUrl: null,
    animationUrl: null,
    animationKind: "none",
    amount: 980,
    sortOrder: 30,
    active: true,
    intimacyDelta: 4,
    description: "",
    accentColor: "#fff2e0",
  },
  {
    id: "star",
    slug: "star",
    name: "星",
    emoji: "⭐",
    iconUrl: null,
    animationUrl: null,
    animationKind: "none",
    amount: 1500,
    sortOrder: 40,
    active: true,
    intimacyDelta: 5,
    description: "",
    accentColor: "#eafaf1",
  },
];

/** 兼容旧代码：id / label / emoji / amount */
export const GIFT_OPTIONS = DEFAULT_GIFT_CATALOG.map((item) => ({
  id: item.slug,
  label: item.name,
  emoji: item.emoji,
  amount: item.amount,
}));

export function animationKindFromUrl(url: string | null | undefined): GiftAnimationKind {
  if (!url) return "none";
  const lower = url.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".gif") || lower.endsWith(".webp")) return "gif";
  return "none";
}

export function toPublicGift(item: GiftCatalogItem) {
  return {
    id: item.slug,
    slug: item.slug,
    label: item.name,
    name: item.name,
    emoji: item.emoji,
    iconUrl: item.iconUrl,
    animationUrl: item.animationUrl,
    animationKind: item.animationKind,
    amount: item.amount,
    accentColor: item.accentColor,
    intimacyDelta: item.intimacyDelta,
    description: item.description,
  };
}
