"use client";

import { useEffect, useState } from "react";
import { GIFT_OPTIONS } from "@/lib/gifts/types";
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

const fallback: PublicGift[] = GIFT_OPTIONS.map((item) => ({
  id: item.id,
  slug: item.id,
  label: item.label,
  name: item.label,
  emoji: item.emoji,
  iconUrl: null,
  animationUrl: null,
  animationKind: "none",
  amount: item.amount,
  accentColor: "#ffe1e6",
  intimacyDelta: 3,
  description: "",
}));

export function useGiftCatalog() {
  const [gifts, setGifts] = useState<PublicGift[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/gifts");
        if (!res.ok) return;
        const data = (await res.json()) as { gifts?: PublicGift[] };
        if (!cancelled && data.gifts?.length) setGifts(data.gifts);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return gifts;
}
