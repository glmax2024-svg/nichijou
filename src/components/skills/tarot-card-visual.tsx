"use client";

import type { DrawnTarotCard, TarotCard } from "@/lib/skills/tarot";

type TarotCardVisualProps = {
  card?: TarotCard | DrawnTarotCard;
  faceDown?: boolean;
  isReversed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "w-[72px] h-[112px]",
  md: "w-[92px] h-[144px]",
  lg: "w-[108px] h-[168px]",
};

export function TarotCardVisual({
  card,
  faceDown = false,
  isReversed = false,
  size = "md",
  className = "",
}: TarotCardVisualProps) {
  const reversed = isReversed || (card && "isReversed" in card && card.isReversed);

  if (faceDown || !card) {
    return (
      <div
        className={`tarot-card ${sizes[size]} ${className} relative overflow-hidden rounded-[10px] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)]`}
      >
        <div className="absolute inset-[3px] rounded-[8px] border border-[#c9a227]/70 bg-[#1a0f33]" />
        <div className="absolute inset-[8px] rounded-[6px] border border-[#c9a227]/35 bg-[#241447]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="h-[52%] w-[52%] rounded-full border border-[#c9a227]/45 bg-[radial-gradient(circle_at_30%_30%,#3d2566,#120822)]" />
          <div className="absolute h-px w-[70%] bg-[#c9a227]/30" />
          <div className="absolute h-[70%] w-px bg-[#c9a227]/30" />
          <span className="absolute bottom-[14%] text-[8px] font-bold tracking-[0.35em] text-[#c9a227]/80">
            TAROT
          </span>
          <span className="absolute top-[12%] text-[10px] text-[#c9a227]/60">✦</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tarot-card ${sizes[size]} ${className} relative overflow-hidden rounded-[10px] shadow-[0_10px_28px_-8px_rgba(0,0,0,0.45)] ${
        reversed ? "rotate-180" : ""
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(165deg,#faf3e4_0%,#efe0c8_48%,#e8d4b8_100%)]" />
      <div className="absolute inset-[3px] rounded-[8px] border border-[#b8922e]/55" />
      <div className="absolute inset-[7px] rounded-[6px] border border-[#b8922e]/25" />
      <div className="relative flex h-full flex-col items-center justify-between px-2 py-2.5 text-[#3d2f1f]">
        <span className="text-[10px] font-bold tracking-wider text-[#8b6914]">{card.numeral}</span>
        <div className="flex flex-1 flex-col items-center justify-center gap-1">
          <span className="text-[28px] leading-none drop-shadow-sm">{card.emoji}</span>
          <div className="h-px w-8 bg-[#b8922e]/35" />
        </div>
        <span className="text-center text-[11px] font-bold leading-tight">{card.name}</span>
      </div>
    </div>
  );
}

export function TarotSlot({
  index,
  label,
  card,
  active,
  revealed,
  slotRef,
}: {
  index: number;
  label: string;
  card?: DrawnTarotCard;
  active?: boolean;
  revealed?: boolean;
  slotRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
          active
            ? "bg-[#c9a227] text-[#1a0f33] shadow-[0_0_12px_rgba(201,162,39,0.5)]"
            : card
              ? "bg-[#c9a227]/25 text-[#e8d5a3]"
              : "bg-white/8 text-[#9a8ab8]"
        }`}
      >
        {index + 1}
      </div>
      <div
        ref={slotRef}
        className={`relative rounded-xl p-1 transition ${
          active ? "ring-2 ring-[#c9a227]/60 ring-offset-2 ring-offset-[#120822]" : ""
        }`}
      >
        {card ? (
          <TarotCardVisual
            card={card}
            faceDown={!revealed}
            isReversed={card.isReversed}
            size="md"
          />
        ) : (
          <div className="flex h-[144px] w-[92px] items-center justify-center rounded-[10px] border border-dashed border-[#c9a227]/25 bg-[#1a1030]/60">
            <span className="text-[10px] text-[#7a6a98]">待抽取</span>
          </div>
        )}
      </div>
      <span className="text-[11px] font-bold text-[#c9a227]/90">{label}</span>
      {card && revealed && card.isReversed && (
        <span className="text-[10px] text-[#f79aa8]">逆位</span>
      )}
    </div>
  );
}
