"use client";

import { useEffect, useState } from "react";
import type { GiftAnimationKind } from "@/lib/gifts/types";

export type PublicGift = {
  id: string;
  slug: string;
  label: string;
  name: string;
  emoji: string;
  iconUrl: string | null;
  animationUrl: string | null;
  animationKind: GiftAnimationKind;
  amount: number;
  accentColor: string;
  intimacyDelta: number;
  description: string;
};

export function useGiftCatalog() {
  const [gifts, setGifts] = useState<PublicGift[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/gifts");
        if (!res.ok) return;
        const data = (await res.json()) as { gifts?: PublicGift[] };
        if (!cancelled && data.gifts) setGifts(data.gifts);
      } catch {
        /* 读取失败就不显示礼物，不拿写死的列表顶替 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return gifts;
}
