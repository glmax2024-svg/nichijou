"use client";

import { useCallback, useEffect, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";
import type { DailyMediaItem, DayPeriod, LiveStatus } from "@/lib/character-live-status";
import { getAmbientGradient } from "@/lib/character-live-status";

type CharacterLiveStatusPanelProps = {
  liveStatus: LiveStatus;
  dailyMedia: DailyMediaItem[];
  dayPeriod: DayPeriod;
  variant?: "web" | "mobile" | "sidebar";
};

const timeIconMap = {
  dark_mode: "dark_mode",
  light_mode: "light_mode",
  wb_twilight: "wb_twilight",
  school: "school",
} as const;

export function CharacterLiveStatusPanel({
  liveStatus,
  dailyMedia,
  dayPeriod,
  variant = "sidebar",
}: CharacterLiveStatusPanelProps) {
  const [index, setIndex] = useState(0);
  const count = dailyMedia.length;
  const currentMedia = dailyMedia[index];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    setIndex(0);
  }, [dailyMedia]);

  const containerClass =
    variant === "sidebar"
      ? "relative aspect-[3/4] w-full shrink-0 overflow-hidden"
      : variant === "mobile"
        ? "relative h-[280px] overflow-hidden"
        : "relative h-[300px] overflow-hidden";

  const isNight = dayPeriod === "night";

  if (!currentMedia || count === 0) return null;

  return (
    <div className={containerClass}>
      {/* Ambient gradient that breathes with time-of-day */}
      <div
        className="live-ambient absolute inset-0 transition-[background] duration-[3000ms] ease-in-out"
        style={{ background: getAmbientGradient(dayPeriod) }}
      />

      {/* Daily image / video carousel */}
      {dailyMedia.map((item, i) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.type === "video" ? (item.posterUrl ?? item.url) : item.url}
            alt={item.label}
            className={`h-full w-full object-cover object-top ${
              item.type === "video" && i === index ? "live-video-frame" : ""
            }`}
          />
          {item.type === "video" && i === index && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
                <MIcon name="play_arrow" className="text-[32px] text-white" filled />
              </div>
            </div>
          )}
        </div>
      ))}

      <div
        className={`pointer-events-none absolute inset-0 ${
          isNight
            ? "bg-gradient-to-t from-[#1a1520]/85 via-transparent to-[#1a1520]/20"
            : "bg-gradient-to-t from-white/95 via-transparent to-black/10"
        }`}
      />

      <div className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm">
        <MIcon
          name={timeIconMap[liveStatus.timeIcon]}
          className={`text-[20px] ${
            liveStatus.timeIcon === "dark_mode" ? "text-[#6b7fd0]" : "text-[#e0a93a]"
          }`}
        />
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2.5 top-[38%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-[#3a3330] shadow-[0_4px_14px_-4px_rgba(120,72,54,0.35)] transition hover:bg-white"
            aria-label="前の日常"
          >
            <MIcon name="chevron_left" className="text-[24px]" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2.5 top-[38%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-[#3a3330] shadow-[0_4px_14px_-4px_rgba(120,72,54,0.35)] transition hover:bg-white"
            aria-label="次の日常"
          >
            <MIcon name="chevron_right" className="text-[24px]" />
          </button>
        </>
      )}

      <div className="absolute inset-x-3 bottom-3 z-20">
        <div className="rounded-[18px] border border-white/80 bg-white/93 px-3.5 py-2.5 shadow-[0_8px_24px_-12px_rgba(120,72,54,0.25)] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3fae76] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3fae76]" />
            </span>
            <span className="text-[10px] font-bold tracking-wide text-[#3fae76]">LIVE</span>
            <span className="text-[10px] text-[#b0a099]">· {liveStatus.title}</span>
          </div>
          <p className="mt-1 font-display text-[14px] font-bold leading-snug text-[#3a3330]">
            {liveStatus.caption}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#8a7a72]">
            {liveStatus.detail}
          </p>
          <p className="mt-1 text-[10px] text-[#b0a099]">
            日常 · {currentMedia.label}
            {currentMedia.type === "video" ? " · 動画" : ""}
          </p>
        </div>

        {count > 1 && (
          <div className="mt-2.5 flex justify-center gap-1.5">
            {dailyMedia.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(dotIndex)}
                className={`rounded-full transition-all ${
                  dotIndex === index
                    ? "h-2 w-5 bg-[#ef7488]"
                    : "h-2 w-2 bg-white/85 shadow-sm hover:bg-white"
                }`}
                aria-label={`${item.label} (${dotIndex + 1}/${count})`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
