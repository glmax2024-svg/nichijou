"use client";

import { formatYen } from "@/lib/stripe";
import { GiftIcon } from "@/components/gifts/gift-icon";
import type { PublicGift } from "@/components/gifts/use-gift-catalog";

export function GiftGrid({
  gifts,
  loadingId,
  disabled,
  onPick,
}: {
  gifts: PublicGift[];
  loadingId?: string | null;
  disabled?: boolean;
  onPick: (gift: PublicGift) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {gifts.map((gift) => (
        <button
          key={gift.slug}
          type="button"
          disabled={disabled || !!loadingId}
          onClick={() => onPick(gift)}
          className="rounded-[16px] border border-[rgba(120,72,54,0.08)] bg-[#fbf4f1] p-3.5 text-left transition hover:border-[rgba(239,116,136,0.25)] hover:bg-[#fff4f6] disabled:opacity-50"
        >
          <GiftIcon gift={gift} size={44} />
          <p className="mt-1.5 text-sm font-bold text-[#3a3330]">{gift.name}</p>
          <p className="text-[11px] text-[#b0a099]">
            {loadingId === gift.slug ? "送信中…" : formatYen(gift.amount)}
          </p>
        </button>
      ))}
    </div>
  );
}
