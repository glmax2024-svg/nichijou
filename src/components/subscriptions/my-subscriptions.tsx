import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { formatCoins } from "@/lib/pricing";
import type { loadMySubscriptions } from "@/lib/my-subscriptions";

type Data = Awaited<ReturnType<typeof loadMySubscriptions>>;

/** 「マイ推し」列表 + 本月送礼统计，web / h5 / app 共用 */
export function MySubscriptions({
  data,
  basePath,
  variant = "web",
}: {
  data: Data;
  basePath: "" | "/h5" | "/app";
  variant?: "web" | "h5";
}) {
  const { subscriptions, giftsThisMonth } = data;

  return (
    <>
      {subscriptions.length === 0 ? (
        <div className="mt-10 rounded-[20px] border border-dashed border-[rgba(239,116,136,0.3)] p-10 text-center">
          <MIcon name="favorite" className="mx-auto text-[40px] text-[#ef7488]/40" />
          <p className="mt-3 text-sm text-[#8a7a72]">まだ推しがいません</p>
          <Link href={`${basePath}/discover`} className="mt-2 inline-block text-sm font-bold text-[#ef7488]">
            キャラクターを探す →
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {subscriptions.map((sub, i) => (
            <SubscriptionCard
              key={sub.id}
              characterId={sub.characterId}
              slug={sub.character.slug}
              name={sub.character.name}
              avatarUrl={sub.character.avatarUrl}
              price={sub.character.subscriptionPrice}
              periodEnd={sub.currentPeriodEnd}
              daysLeft={sub.daysLeft}
              expiring={sub.expiring}
              chatHref={`${basePath}/characters/${sub.character.slug}/chat`}
              profileHref={`${basePath}/characters/${sub.character.slug}`}
              featured={i === 0}
              variant={variant}
            />
          ))}
        </div>
      )}

      <Link
        href={`${basePath}/gifts`}
        className="mt-3 flex items-center gap-2.5 rounded-[18px] border border-[rgba(143,184,232,0.2)] p-3.5"
        style={{ background: "linear-gradient(150deg,#eef1ff,#f6f0ff)" }}
      >
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white shadow-[0_6px_14px_-8px_rgba(143,184,232,0.7)]">
          <MIcon name="redeem" className="text-[22px] text-[#7d97e0]" />
        </div>
        <div className="flex-1 leading-snug">
          <div className="font-display text-[13.5px] font-bold">今月のギフト · {giftsThisMonth.count} 回</div>
          <div className="text-[11.5px] text-[#8a7a72]">
            {giftsThisMonth.count > 0 ? `合計 ${formatCoins(giftsThisMonth.coins)}` : "まだ贈っていません"}
          </div>
        </div>
        <MIcon name="chevron_right" className="text-[20px] text-[#b0a099]" />
      </Link>
    </>
  );
}
