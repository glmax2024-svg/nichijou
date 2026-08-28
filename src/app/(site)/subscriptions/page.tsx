import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIcon } from "@/components/ui/m-icon";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: { character: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="relative min-h-[calc(100vh-60px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[480px] px-4 py-10">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[22px] font-black text-[#3a3330]">マイ推し</h1>
            <span className="rounded-full bg-[#ffeef1] px-3 py-1.5 text-xs font-bold text-[#e0607a]">
              {subscriptions.length} 件 · アクティブ
            </span>
          </div>

          {subscriptions.length === 0 ? (
            <div className="mt-10 rounded-[20px] border border-dashed border-[rgba(239,116,136,0.3)] p-12 text-center">
              <MIcon name="favorite" className="mx-auto text-[40px] text-[#ef7488]/40" />
              <p className="mt-4 text-[#8a7a72]">まだ推しキャラがいません</p>
              <Link
                href="/discover"
                className="mt-4 inline-block font-display text-sm font-bold text-[#ef7488] hover:underline"
              >
                キャラクターを探す →
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {subscriptions.map((sub, i) => (
                <SubscriptionCard
                  key={sub.id}
                  slug={sub.character.slug}
                  name={sub.character.name}
                  avatarUrl={sub.character.avatarUrl}
                  price={sub.character.subscriptionPrice}
                  chatHref={`/characters/${sub.character.slug}/chat`}
                  profileHref={`/characters/${sub.character.slug}`}
                  featured={i === 0}
                  status={i === 1 ? "expiring" : "active"}
                />
              ))}
            </div>
          )}

          <div
            className="mt-4 flex items-center gap-3 rounded-[18px] border border-[rgba(143,184,232,0.2)] p-4"
            style={{ background: "linear-gradient(150deg,#eef1ff,#f6f0ff)" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-white shadow-[0_6px_14px_-8px_rgba(143,184,232,0.7)]">
              <MIcon name="redeem" className="text-[24px] text-[#7d97e0]" />
            </div>
            <div className="flex-1 leading-snug">
              <div className="font-display text-sm font-bold">今月のギフト · 14 回</div>
              <div className="text-xs text-[#8a7a72]">澪の誕生日まであと 8 日 🎂</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
