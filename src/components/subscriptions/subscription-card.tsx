import Link from "next/link";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { formatCoins } from "@/lib/pricing";
import { SubscriptionRenewButton } from "./subscription-renew-button";

type SubscriptionCardProps = {
  characterId: string;
  slug: string;
  name: string;
  avatarUrl: string;
  price: number;
  periodEnd: Date | null;
  daysLeft: number;
  expiring: boolean;
  chatHref: string;
  profileHref: string;
  featured?: boolean;
  variant?: "web" | "h5";
};

const endFormat = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" });

export function SubscriptionCard({
  characterId,
  slug,
  name,
  avatarUrl,
  price,
  periodEnd,
  daysLeft,
  expiring,
  chatHref,
  profileHref,
  featured,
  variant = "web",
}: SubscriptionCardProps) {
  const until = periodEnd ? ` · ${endFormat.format(periodEnd)}まで（残り ${daysLeft} 日）` : "";

  return (
    <div
      className={`animate-float-up overflow-hidden rounded-[22px] border ${
        featured
          ? "border-[rgba(239,116,136,0.16)] bg-gradient-to-b from-[#fff6f4] to-white"
          : "border-[rgba(120,72,54,0.08)] bg-white"
      }`}
    >
      <div className="flex items-center gap-3 p-3.5 sm:p-4">
        <CharacterAvatar slug={slug} src={avatarUrl} alt={name} size={50} rounded="2xl" />
        <div className="min-w-0 flex-1 leading-snug">
          <p className="font-display text-[15.5px] font-bold">{name}</p>
          <p className="text-[11.5px] text-[#8a7a72]">
            {formatCoins(price)} / 30日{until}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
            expiring ? "bg-[#fff3e6] text-[#d18a3a]" : "bg-[#eafaf1] text-[#3fae76]"
          }`}
        >
          {expiring ? "まもなく期限" : "加入中"}
        </span>
      </div>
      <div className="flex gap-2 border-t border-[rgba(120,72,54,0.06)] px-3.5 py-2.5 sm:px-4">
        <Link
          href={chatHref}
          className="btn-primary flex flex-1 items-center justify-center rounded-[13px] py-2.5 text-[13px]"
        >
          メッセージ
        </Link>
        {expiring ? (
          <SubscriptionRenewButton characterId={characterId} price={price} />
        ) : (
          <Link
            href={profileHref}
            className={`flex flex-1 items-center justify-center rounded-[13px] border border-[rgba(120,72,54,0.1)] py-2.5 text-[13px] font-bold text-[#5a4f48] ${
              variant === "h5" ? "bg-[#fbf4f1]" : "bg-white"
            }`}
          >
            プロフィール
          </Link>
        )}
      </div>
    </div>
  );
}
