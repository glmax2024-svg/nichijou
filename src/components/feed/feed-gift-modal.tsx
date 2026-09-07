"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";
import { redirectIfCheckout } from "@/lib/checkout-client";
import { GiftGrid } from "@/components/gifts/gift-grid";
import { GiftFx, type GiftFxPayload } from "@/components/gifts/gift-fx";
import { useGiftCatalog, type PublicGift } from "@/components/gifts/use-gift-catalog";

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
  const gifts = useGiftCatalog();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fx, setFx] = useState<GiftFxPayload | null>(null);
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

  async function sendGift(gift: PublicGift) {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    setLoading(gift.slug);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, giftType: gift.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.feed.giftFailed);
      if (redirectIfCheckout(data)) return;
      setFx({
        name: data.label ?? gift.name,
        emoji: data.emoji ?? gift.emoji,
        iconUrl: data.iconUrl ?? gift.iconUrl,
        animationUrl: data.animationUrl ?? gift.animationUrl,
        animationKind: data.animationKind ?? gift.animationKind,
        accentColor: gift.accentColor,
      });
      setSuccess(
        t(dict.feed.giftSent, {
          emoji: data.emoji ?? gift.emoji,
          label: data.label ?? gift.name,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.feed.giftFailed);
    } finally {
      setLoading(null);
    }
  }

  if (!open || !mounted) return null;

  return (
    <>
      {createPortal(
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
              <GiftGrid gifts={gifts} loadingId={loading} onPick={sendGift} />
              {error && <p className="text-[12px] font-bold text-[#e0607a]">{error}</p>}
              {success && <p className="text-[12px] font-bold text-[#3fae76]">{success}</p>}
            </div>
          </div>
        </div>,
        document.body,
      )}
      <GiftFx gift={fx} onDone={() => setFx(null)} />
    </>
  );
}
