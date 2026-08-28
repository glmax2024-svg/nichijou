"use client";

import Image from "next/image";
import Link from "next/link";
import type { CharacterMediaItem } from "@/lib/character-media";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type PrivateMediaPanelProps = {
  media: CharacterMediaItem[];
  characterName: string;
  isSubscribed: boolean;
  subscriptionPrice: number;
  loginHref: string;
};

export function PrivateMediaPanel({
  media,
  characterName,
  isSubscribed,
  subscriptionPrice,
  loginHref,
}: PrivateMediaPanelProps) {
  const { dict, t } = useLocale();

  return (
    <div>
      {isSubscribed ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[rgba(63,174,118,0.2)] bg-gradient-to-r from-[#eafaf1] to-[#f5fff8] px-4 py-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <MIcon name="lock_open" className="text-[22px] text-[#3fae76]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14px] font-bold text-[#3a3330]">
              {dict.character.privateUnlockedTitle}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#5a4f48]">
              {t(dict.character.privateUnlocked, { name: characterName })}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[rgba(239,116,136,0.18)] bg-gradient-to-r from-[#fff4f6] to-[#fffaf8] px-4 py-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <MIcon name="lock" className="text-[22px] text-[#ef7488]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[14px] font-bold text-[#3a3330]">
              {dict.character.privateLockedTitle}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#8a7a72]">
              {t(dict.character.privateLockedDesc, { name: characterName })}
            </p>
            <Link
              href={loginHref}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-[#ef7488] hover:underline"
            >
              {t(dict.character.privateUnlockCta, {
                price: subscriptionPrice.toLocaleString(),
              })}
              <MIcon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
        {media.map((item, i) => (
          <MediaTile
            key={`${item.url}-${i}`}
            item={item}
            locked={!isSubscribed}
            peek={!isSubscribed && i === 0}
          />
        ))}
      </div>
    </div>
  );
}

function MediaTile({
  item,
  locked,
  peek = false,
}: {
  item: CharacterMediaItem;
  locked: boolean;
  peek?: boolean;
}) {
  const { dict } = useLocale();

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-[16px] bg-[#f3ebe6]">
      <Image
        src={item.url}
        alt=""
        fill
        sizes="(max-width:640px) 50vw, 200px"
        className={`object-cover object-top transition duration-300 ${
          locked && !peek ? "scale-110 blur-[14px]" : "group-hover:scale-[1.03]"
        }`}
      />

      {locked && !peek && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
            <MIcon name="lock" className="text-[22px] text-[#ef7488]" />
          </div>
          <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold text-white">
            {dict.character.privateBadge}
          </span>
        </div>
      )}

      {peek && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
          <span className="rounded-full bg-[#ef7488] px-2 py-0.5 text-[9px] font-bold text-white">
            {dict.character.privatePeekUnlock}
          </span>
        </div>
      )}

      {item.type === "video" && locked && !peek && (
        <div className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[9px] font-bold text-white">
          VIDEO
        </div>
      )}
    </div>
  );
}
