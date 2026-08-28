"use client";

import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { MobileSideMenu } from "@/components/mobile/mobile-side-menu";
import { useLocale } from "@/components/i18n/locale-provider";

/** Top bar for the H5 / App home feed. */
export function MobileHomeHeader({ basePath = "/h5" }: { basePath?: "/h5" | "/app" }) {
  const { dict } = useLocale();

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[rgba(120,72,54,0.06)] bg-white/95 px-[16px] pb-2.5 pt-2 backdrop-blur-[10px]">
      <span className="font-display text-[22px] font-black text-[#3a3330]">{dict.common.brand}</span>
      <div className="flex items-center gap-1.5 text-[#8a7a72]">
        <Link
          href={`${basePath}/search`}
          aria-label={dict.common.search}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#fbf4f1]"
        >
          <MIcon name="search" className="text-[22px]" />
        </Link>
        <Link
          href={`${basePath}/notifications`}
          aria-label={dict.common.notifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#fbf4f1]"
        >
          <MIcon name="notifications" className="text-[22px]" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ef7488]" />
        </Link>
        <MobileSideMenu basePath={basePath} />
      </div>
    </div>
  );
}
