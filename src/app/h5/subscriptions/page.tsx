import Link from "next/link";
import { redirect } from "next/navigation";
import { loginPath } from "@/lib/login-path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIcon } from "@/components/ui/m-icon";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";

export default async function H5SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect(loginPath("/h5", "/h5/subscriptions"));

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: { character: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <div className="flex items-center justify-between px-[18px] pb-1.5 pt-2.5">
        <h2 className="font-display text-[22px] font-black text-[#3a3330]">マイ推し</h2>
        <span className="rounded-full bg-[#ffeef1] px-3 py-1.5 text-[11.5px] font-bold text-[#e0607a]">
          {subscriptions.length} 件 · アクティブ
        </span>
      </div>

      <div className="flex flex-col gap-3 px-[18px] py-2 pb-4">
        {subscriptions.length === 0 ? (
          <div className="py-12 text-center">
            <MIcon name="favorite" className="mx-auto text-[40px] text-[#ef7488]/40" />
            <p className="mt-3 text-sm text-[#8a7a72]">まだ推しがいません</p>
            <Link href="/h5/discover" className="mt-2 inline-block text-sm font-bold text-[#ef7488]">
              発見する →
            </Link>
          </div>
        ) : (
          subscriptions.map((sub, i) => (
            <SubscriptionCard
              key={sub.id}
              slug={sub.character.slug}
              name={sub.character.name}
              avatarUrl={sub.character.avatarUrl}
              price={sub.character.subscriptionPrice}
              priceDetail={
                i === 0
                  ? `¥${sub.character.subscriptionPrice.toLocaleString()} / 月 · 次回 8月2日`
                  : i === 1
                    ? `¥${sub.character.subscriptionPrice.toLocaleString()} / 月 · 残り 8 日`
                    : undefined
              }
              chatHref={`/h5/characters/${sub.character.slug}/chat`}
              profileHref={`/h5/characters/${sub.character.slug}`}
              featured={i === 0}
              status={i === 1 ? "expiring" : "active"}
              variant="h5"
            />
          ))
        )}

        <div
          className="flex items-center gap-2.5 rounded-[18px] border border-[rgba(143,184,232,0.2)] p-3.5"
          style={{ background: "linear-gradient(150deg,#eef1ff,#f6f0ff)" }}
        >
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white shadow-[0_6px_14px_-8px_rgba(143,184,232,0.7)]">
            <MIcon name="redeem" className="text-[22px] text-[#7d97e0]" />
          </div>
          <div className="flex-1 leading-snug">
            <div className="font-display text-[13.5px] font-bold">今月のギフト</div>
            <div className="text-[11.5px] text-[#8a7a72]">14 回贈った · 誕生日祝福も</div>
          </div>
        </div>
      </div>
    </div>
  );
}
