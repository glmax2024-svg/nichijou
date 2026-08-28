"use client";

import { useEffect, useRef, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";
import { formatCallDuration } from "@/lib/skills/call";
import { useLocale } from "@/components/i18n/locale-provider";

type CallPhase = "ringing" | "active" | "ended";

type VoiceCallOverlayProps = {
  open: boolean;
  characterName: string;
  characterAvatar: string;
  userName?: string;
  userAvatar?: string;
  onClose: (durationSec: number) => void;
};

const DEFAULT_USER_AVATAR = "/characters/default-avatar.png";

export function VoiceCallOverlay({
  open,
  characterName,
  characterAvatar,
  userName = "你",
  userAvatar = DEFAULT_USER_AVATAR,
  onClose,
}: VoiceCallOverlayProps) {
  const { dict } = useLocale();
  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [durationSec, setDurationSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    setPhase("ringing");
    setDurationSec(0);
    durationRef.current = 0;

    const connectTimer = setTimeout(() => setPhase("active"), 1400);

    return () => {
      clearTimeout(connectTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "active") return;

    timerRef.current = setInterval(() => {
      durationRef.current += 1;
      setDurationSec(durationRef.current);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, phase]);

  if (!open) return null;

  function hangUp() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ended");
    onClose(durationRef.current);
  }

  const statusText =
    phase === "ringing"
      ? `正在呼叫 ${characterName}…`
      : phase === "active"
        ? "通话中"
        : "通话结束";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1520]/72 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-[28px] border border-[rgba(239,116,136,0.2)] bg-gradient-to-b from-[#2a2438] via-[#1f1a28] to-[#120822] px-6 pb-8 pt-10 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(239,116,136,0.18),transparent_60%)]" />

        <p className="relative text-center text-[11px] font-bold tracking-[0.2em] text-[#ef7488]/80">
          VOICE CALL
        </p>
        <p className="relative mt-1 text-center text-[13px] text-[#b8a8d8]">{statusText}</p>

        <p className="relative mt-4 text-center font-display text-[32px] font-black tabular-nums tracking-wider text-[#f5ecd8]">
          {phase === "ringing" ? "--:--" : formatCallDuration(durationSec)}
        </p>

        <div className="relative mt-8 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userAvatar}
                alt={userName}
                className="h-[72px] w-[72px] rounded-full border-2 border-white/20 object-cover shadow-lg"
              />
              {phase === "active" && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1f1a28] bg-[#3fae76]" />
              )}
            </div>
            <span className="max-w-[88px] truncate text-[12px] font-bold text-[#e8dce8]">{userName}</span>
          </div>

          <div className="flex flex-col items-center gap-1 pt-2">
            {phase === "active" && (
              <div className="flex h-6 items-end gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-[#ef7488]"
                    style={{
                      height: `${10 + (i % 3) * 6}px`,
                      animation: `typing 0.9s infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
            {phase === "ringing" && (
              <MIcon name="sync" className="animate-spin text-[22px] text-[#ef7488]/70" />
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={characterAvatar}
                alt={characterName}
                className={`h-[72px] w-[72px] rounded-full border-2 border-[#ef7488]/40 object-cover shadow-lg ${
                  phase === "ringing" ? "animate-pulse" : ""
                }`}
              />
              {phase === "active" && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1f1a28] bg-[#3fae76]" />
              )}
            </div>
            <span className="max-w-[88px] truncate text-[12px] font-bold text-[#e8dce8]">
              {characterName}
            </span>
          </div>
        </div>

        <div className="relative mt-10 flex items-center justify-center gap-6">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#c8c0bc] transition hover:bg-white/15"
            aria-label="静音"
          >
            <MIcon name="mic_off" className="text-[20px]" />
          </button>
          <button
            type="button"
            onClick={hangUp}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e74c3c] text-white shadow-[0_8px_24px_-6px_rgba(231,76,60,0.55)] transition hover:bg-[#d44334]"
            aria-label="挂断"
          >
            <MIcon name="call_end" className="text-[28px]" filled />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#c8c0bc] transition hover:bg-white/15"
            aria-label="扬声器"
          >
            <MIcon name="volume_up" className="text-[20px]" />
          </button>
        </div>

        <p className="relative mt-6 text-center text-[10px] text-[#6a5a88]">
          {dict.voice.demoPreview}
        </p>
      </div>
    </div>
  );
}
