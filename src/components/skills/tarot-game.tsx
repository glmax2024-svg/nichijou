"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  TAROT_SPREAD,
  TAROT_SPREAD_POSITIONS,
  buildDrawnCard,
  buildShuffledDeck,
  type DrawnTarotCard,
  type TarotCard,
} from "@/lib/skills/tarot";
import { TarotCardVisual, TarotSlot } from "@/components/skills/tarot-card-visual";
import { useLocale } from "@/components/i18n/locale-provider";

type TarotGameProps = {
  characterName: string;
  onReading: (cards: DrawnTarotCard[], question: string) => Promise<void>;
  loading?: boolean;
};

type Phase = "intro" | "draw" | "reveal";

type DeckItem = { key: string; card: TarotCard };

type FlyingCard = {
  deckKey: string;
  card: TarotCard;
  left: number;
  top: number;
  width: number;
  height: number;
  targetLeft: number;
  targetTop: number;
  phase: "start" | "fly";
};

const FLY_MS = 480;

export function TarotGame({ characterName, onReading, loading }: TarotGameProps) {
  const { dict, t } = useLocale();
  const deck = useMemo(() => buildShuffledDeck(), []);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [question, setQuestion] = useState("");
  const [drawIndex, setDrawIndex] = useState(0);
  const [drawn, setDrawn] = useState<DrawnTarotCard[]>([]);
  const [remainingDeck, setRemainingDeck] = useState<DeckItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [flying, setFlying] = useState<FlyingCard | null>(null);
  const [hiddenDeckKey, setHiddenDeckKey] = useState<string | null>(null);

  const setSlotRef = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      slotRefs.current[index] = el;
    };
  }, []);

  function startDraw() {
    setPhase("draw");
    setDrawIndex(0);
    setDrawn([]);
    setRemainingDeck(deck.map((card, i) => ({ key: `deck-${i}`, card })));
    setRevealed(false);
    setFlying(null);
    setHiddenDeckKey(null);
  }

  function pickCard(item: DeckItem, e: React.MouseEvent<HTMLButtonElement>) {
    if (phase !== "draw" || drawIndex >= 3 || flying) return;

    const slotIndex = drawIndex;
    const slotEl = slotRefs.current[slotIndex];
    if (!slotEl) return;

    const from = e.currentTarget.getBoundingClientRect();
    const to = slotEl.getBoundingClientRect();
    const targetLeft = to.left + (to.width - from.width) / 2;
    const targetTop = to.top + (to.height - from.height) / 2;

    setHiddenDeckKey(item.key);
    setFlying({
      deckKey: item.key,
      card: item.card,
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      targetLeft,
      targetTop,
      phase: "start",
    });

    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlying((prev) => (prev ? { ...prev, phase: "fly" } : null));
      });
    });

    flyTimerRef.current = setTimeout(() => {
      const position = TAROT_SPREAD_POSITIONS[slotIndex] ?? `第${slotIndex + 1}张`;
      const nextCard = buildDrawnCard(item.card, position);
      const nextIndex = slotIndex + 1;

      setRemainingDeck((prev) => prev.filter((d) => d.key !== item.key));
      setDrawn((prev) => [...prev, nextCard]);
      setDrawIndex(nextIndex);
      setFlying(null);
      setHiddenDeckKey(null);

      if (nextIndex >= 3) {
        setTimeout(() => {
          setRevealed(true);
          setPhase("reveal");
        }, 280);
      }
    }, FLY_MS);
  }

  return (
    <div className="w-full min-w-[300px] max-w-[440px] overflow-hidden rounded-[20px] border border-[#c9a227]/20 shadow-[0_20px_50px_-20px_rgba(18,8,34,0.75)]">
      <div className="relative bg-[#120822] px-5 pb-5 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(201,162,39,0.14),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent" />

        <div className="relative text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-[#c9a227]/80">
            {TAROT_SPREAD.subtitle}
          </p>
          <h3 className="mt-1 font-display text-[22px] font-black tracking-wide text-[#f5ecd8]">
            {TAROT_SPREAD.title}
          </h3>
          <p className="mt-1 text-[12px] text-[#9a8ab8]">{TAROT_SPREAD.tagline}</p>
        </div>

        {phase === "intro" && (
          <div className="relative mt-5 space-y-4">
            <p className="text-center text-[13px] leading-[1.75] text-[#b8a8d8]">
              {TAROT_SPREAD.description}
            </p>
            <p className="text-center text-[12px] text-[#7a6a98]">
              {t(dict.tarot.willRead, { name: characterName })}
            </p>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={dict.tarot.questionPlaceholder}
              maxLength={120}
              className="w-full rounded-xl border border-[#c9a227]/20 bg-[#1a1030]/80 px-4 py-3 text-center text-[13px] text-[#f0e6d0] outline-none placeholder:text-[#6a5a88] focus:border-[#c9a227]/45"
            />
            <button
              type="button"
              onClick={startDraw}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl py-3.5 text-[15px] font-bold text-[#1a0f33] transition hover:brightness-105"
            >
              <span className="absolute inset-0 bg-gradient-to-b from-[#e8c96a] via-[#c9a227] to-[#a88418]" />
              <span className="absolute inset-x-4 top-0 h-px bg-white/35" />
              <span className="relative tracking-[0.15em]">开 始 抽 牌</span>
            </button>
          </div>
        )}

        {(phase === "draw" || phase === "reveal") && (
          <div className="relative mt-5 space-y-4">
            <p className="min-h-[36px] text-center text-[13px] leading-relaxed text-[#d4c4f0]">
              {phase === "reveal"
                ? "牌面已开，请聆听解读"
                : TAROT_SPREAD.drawHints[drawIndex] ?? "抽牌完成"}
            </p>

            <div className="flex justify-center gap-3 sm:gap-4">
              {TAROT_SPREAD_POSITIONS.map((label, i) => (
                <TarotSlot
                  key={label}
                  index={i}
                  label={label}
                  card={drawn[i]}
                  active={phase === "draw" && drawIndex === i && !flying}
                  revealed={revealed}
                  slotRef={setSlotRef(i)}
                />
              ))}
            </div>

            {phase === "draw" && drawIndex < 3 && (
              <div className="space-y-2 pt-1">
                <p className="text-center text-[11px] text-[#9a8ab8]">
                  悬停择牌 · 点击飞入「{TAROT_SPREAD_POSITIONS[drawIndex]}」· 剩余{" "}
                  {remainingDeck.length} 张
                </p>
                <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-0.5 pb-1 pt-1">
                  {remainingDeck.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!!flying}
                      onClick={(e) => pickCard(item, e)}
                      className={`tarot-deck-card shrink-0 rounded-[10px] transition-opacity duration-150 disabled:cursor-default ${
                        hiddenDeckKey === item.key ? "pointer-events-none opacity-0" : ""
                      }`}
                    >
                      <TarotCardVisual faceDown size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === "reveal" && drawn.length === 3 && (
              <div className="space-y-3 border-t border-[#c9a227]/15 pt-4">
                <div className="grid gap-2">
                  {drawn.map((card) => (
                    <div
                      key={card.id + card.position}
                      className="rounded-xl bg-[#1a1030]/70 px-3 py-2 text-[12px] leading-relaxed text-[#c4b8dc]"
                    >
                      <span className="font-bold text-[#e8d5a3]">
                        {card.position} · {card.name}
                        {card.isReversed ? "（逆位）" : ""}
                      </span>
                      <span className="text-[#9a8ab8]">
                        {" "}
                        — {card.isReversed ? card.reversed : card.upright}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onReading(drawn, question)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#c9a227]/40 bg-[#c9a227]/15 py-3 text-[14px] font-bold text-[#f5ecd8] transition hover:bg-[#c9a227]/25 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#c9a227] border-t-transparent" />
                      {characterName} 正在解读…
                    </>
                  ) : (
                    <>请 {characterName} 解读牌阵</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="relative mt-5 text-center text-[10px] text-[#5a4a78]">
          占卜前请清除杂念 · 保持静心
        </p>
      </div>

      {flying && (
        <div
          className="tarot-card-flying pointer-events-none fixed z-[9999]"
          style={{
            left: flying.phase === "fly" ? flying.targetLeft : flying.left,
            top: flying.phase === "fly" ? flying.targetTop : flying.top,
            width: flying.width,
            height: flying.height,
            transition:
              flying.phase === "fly"
                ? `left ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${FLY_MS}ms ease`
                : "none",
            transform: flying.phase === "fly" ? "scale(1.05)" : "scale(1)",
            filter:
              flying.phase === "fly"
                ? "drop-shadow(0 12px 28px rgba(201,162,39,0.55))"
                : "drop-shadow(0 6px 16px rgba(0,0,0,0.45))",
          }}
        >
          <div className="h-full w-full [&_.tarot-card]:!h-full [&_.tarot-card]:!w-full">
            <TarotCardVisual faceDown size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}
