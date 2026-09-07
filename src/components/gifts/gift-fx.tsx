"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { GiftIcon } from "@/components/gifts/gift-icon";
import type { GiftAnimationKind } from "@/lib/gifts/types";

export type GiftFxPayload = {
  name: string;
  emoji: string;
  iconUrl?: string | null;
  animationUrl?: string | null;
  animationKind?: GiftAnimationKind;
  accentColor?: string;
};

export function GiftFx({
  gift,
  onDone,
}: {
  gift: GiftFxPayload | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!gift) return;
    const ms = gift.animationKind === "mp4" || gift.animationKind === "gif" ? 3200 : 1800;
    const timer = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(timer);
  }, [gift, onDone]);

  if (!gift || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-black/35">
      <div className="flex flex-col items-center gap-3">
        {gift.animationKind === "mp4" && gift.animationUrl ? (
          <video
            src={gift.animationUrl}
            autoPlay
            muted
            playsInline
            className="max-h-[56vh] max-w-[86vw] rounded-[24px] object-contain shadow-2xl"
          />
        ) : gift.animationKind === "gif" && gift.animationUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gift.animationUrl}
            alt=""
            className="max-h-[56vh] max-w-[86vw] rounded-[24px] object-contain shadow-2xl"
          />
        ) : (
          <div className="gift-fx-pop">
            <GiftIcon gift={gift} size={120} className="rounded-[28px] shadow-2xl" />
          </div>
        )}
        <div className="rounded-full bg-white/95 px-4 py-1.5 font-display text-sm font-bold text-[#3a3330] shadow-lg">
          {gift.emoji} {gift.name}
        </div>
      </div>
      <style>{`
        .gift-fx-pop { animation: gift-pop 1.6s ease; }
        @keyframes gift-pop {
          0% { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          18% { transform: scale(1.12) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
