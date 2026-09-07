import { z } from "zod";
import { animationKindFromUrl, type GiftAnimationKind } from "@/lib/gifts/types";

export const giftItemSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "slug は英小文字・数字・ハイフン"),
  name: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8).default("🎁"),
  iconUrl: z.string().max(500).nullable().optional(),
  animationUrl: z.string().max(500).nullable().optional(),
  animationKind: z.enum(["none", "gif", "mp4"]).optional(),
  amount: z.number().int().min(100).max(1_000_000),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
  intimacyDelta: z.number().int().min(0).max(20).optional(),
  description: z.string().max(200).optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});

export function resolveAnimationKind(
  kind: GiftAnimationKind | undefined,
  animationUrl: string | null | undefined,
): GiftAnimationKind {
  if (kind && kind !== "none") return kind;
  return animationKindFromUrl(animationUrl);
}
