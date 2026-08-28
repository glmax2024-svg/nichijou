"use client";

import { useCallback, useEffect, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";
import type { CharacterMediaItem } from "@/lib/character-media";

type CharacterMediaCarouselProps = {
  media: CharacterMediaItem[];
  characterName: string;
};

export function CharacterMediaCarousel({ media, characterName }: CharacterMediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = media.length;
  const current = media[index];

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    setIndex(0);
  }, [media]);

  if (!current || count === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff]">
        <MIcon name="image" className="text-[48px] text-[#ef7488]/30" />
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-[#fbf4f1]">
      {media.map((item, i) => (
        <div
          key={`${item.type}-${item.url}-${i}`}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.type === "video" ? (item.posterUrl ?? item.url) : item.url}
            alt={`${characterName} ${i + 1}`}
            className="h-full w-full object-cover object-top"
          />
        </div>
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/90 to-transparent" />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3a3330] shadow-[0_4px_14px_-4px_rgba(120,72,54,0.35)] transition hover:bg-white"
            aria-label="前へ"
          >
            <MIcon name="chevron_left" className="text-[24px]" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#3a3330] shadow-[0_4px_14px_-4px_rgba(120,72,54,0.35)] transition hover:bg-white"
            aria-label="次へ"
          >
            <MIcon name="chevron_right" className="text-[24px]" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {media.map((_, dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                onClick={() => setIndex(dotIndex)}
                className={`rounded-full transition-all ${
                  dotIndex === index
                    ? "h-2 w-5 bg-[#ef7488]"
                    : "h-2 w-2 bg-white/80 shadow-sm hover:bg-white"
                }`}
                aria-label={`${dotIndex + 1} / ${count}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
