"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MIcon } from "@/components/ui/m-icon";
import { GIFT_OPTIONS, formatYen } from "@/lib/stripe";
import { useLocale } from "@/components/i18n/locale-provider";

type FeedGiftModalProps = {
  open: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  isLoggedIn: boolean;
  loginHref: string;
};

export function FeedGiftModal({
  open,
  onClose,
  characterId,
  characterName,
  isLoggedIn,
  loginHref,
}: FeedGiftModalProps) {
  const { dict, t } = useLocale();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(null);
      setLoading(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function sendGift(giftType: string) {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    setLoading(giftType);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, giftType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.feed.giftFailed);
      setSuccess(
        t(dict.feed.giftSent, {
          emoji: data.emoji ?? "",
          label: data.label ?? dict.feed.gift,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.feed.giftFailed);
    } finally {
      setLoading(null);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label={dict.common.close}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[rgba(120,72,54,0.07)] px-5 py-4">
          <div>
            <div className="font-display text-lg font-black text-[#3a3330]">{dict.feed.sendGift}</div>
            <div className="text-[12px] text-[#8a7a72]">{characterName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fbf4f1]"
          >
            <MIcon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {!isLoggedIn && (
            <a
              href={loginHref}
              className="block rounded-[14px] bg-[#fff4f6] px-3 py-2.5 text-center text-[12.5px] font-bold text-[#ef7488]"
            >
              {dict.feed.loginToGift}
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            {GIFT_OPTIONS.map((gift) => (
              <button
                key={gift.id}
                type="button"
                disabled={!!loading}
                onClick={() => sendGift(gift.id)}
                className="rounded-[16px] border border-[rgba(120,72,54,0.08)] bg-[#fbf4f1] p-3.5 text-left transition hover:border-[rgba(239,116,136,0.25)] hover:bg-[#fff4f6] disabled:opacity-50"
              >
                <span className="text-2xl">{gift.emoji}</span>
                <p className="mt-1.5 text-sm font-bold text-[#3a3330]">{gift.label}</p>
                <p className="text-[11px] text-[#b0a099]">
                  {loading === gift.id ? "送信中…" : formatYen(gift.amount)}
                </p>
              </button>
            ))}
          </div>
          {error && <p className="text-[12px] font-bold text-[#e0607a]">{error}</p>}
          {success && <p className="text-[12px] font-bold text-[#3fae76]">{success}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
