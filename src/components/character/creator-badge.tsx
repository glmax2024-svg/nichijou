import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";

type CreatorOfficialBadgeProps = {
  creatorName: string;
  creatorId?: string;
  characterName?: string;
  studioHref?: string;
  size?: "sm" | "md";
  className?: string;
};

export function CreatorOfficialBadge({
  creatorName,
  creatorId,
  characterName,
  studioHref,
  size = "md",
  className = "",
}: CreatorOfficialBadgeProps) {
  const isSm = size === "sm";
  const href = creatorId ? `/creators/${creatorId}` : (studioHref ?? "/studio");

  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-xl border border-[rgba(120,72,54,0.08)] bg-[#fbf4f1] transition hover:border-[#ef7488]/25 hover:bg-[#fff4f6] ${
        isSm ? "px-2.5 py-1.5" : "px-3.5 py-2.5"
      } ${className}`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${
          isSm ? "h-7 w-7" : "h-9 w-9"
        }`}
      >
        <MIcon
          name="brush"
          className={`text-[#ef7488] ${isSm ? "text-[16px]" : "text-[18px]"}`}
        />
      </div>
      <div className="min-w-0 leading-snug">
        <div className="flex items-center gap-1">
          <MIcon name="verified" className="text-[13px] text-[#6b7fd0]" />
          <span
            className={`font-bold text-[#6b7fd0] ${isSm ? "text-[10px]" : "text-[11px]"}`}
          >
            Official Character
          </span>
        </div>
        <p className={`truncate font-display font-bold text-[#3a3330] ${isSm ? "text-[11px]" : "text-[13px]"}`}>
          by {creatorName}
          {characterName ? (
            <span className="font-normal text-[#8a7a72]"> · {characterName}</span>
          ) : null}
        </p>
      </div>
      <MIcon
        name="arrow_forward"
        className={`shrink-0 text-[#b0a099] transition group-hover:text-[#ef7488] ${
          isSm ? "text-[14px]" : "text-[16px]"
        }`}
      />
    </Link>
  );
}
