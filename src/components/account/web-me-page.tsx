import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";
import { characterChatHref } from "@/lib/chat-inbox";

type Subscription = {
  id: string;
  character: {
    slug: string;
    name: string;
    avatarUrl: string;
  };
};

export function WebMePage({
  session,
  subscriptions,
  giftCount,
}: {
  session: Session;
  subscriptions: Subscription[];
  giftCount: number;
}) {
  return (
    <div className="relative min-h-[calc(100vh-60px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto grid max-w-[960px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-5">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border-[3px] border-white bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff] text-2xl font-black text-[#ef7488] shadow-[0_12px_24px_-12px_rgba(120,72,54,0.4)]">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={80} height={80} className="object-cover" />
              ) : (
                (session.user.name ?? session.user.email ?? "?")[0]
              )}
            </div>
            <h1 className="mt-3 font-display text-xl font-black">{session.user.name ?? "ユーザー"}</h1>
            <p className="text-sm text-[#8a7a72]">@{session.user.email?.split("@")[0]}</p>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { n: subscriptions.length, label: "推し中" },
              { n: giftCount, label: "ギフト" },
              { n: 86, label: "日連続" },
            ].map((s) => (
              <div key={s.label} className="rounded-[14px] bg-[#fbf4f1] py-2.5">
                <div className="font-display text-lg font-black text-[#ef7488]">{s.n}</div>
                <div className="text-[11px] text-[#8a7a72]">{s.label}</div>
              </div>
            ))}
          </div>
          <nav className="mt-5 space-y-1">
            {[
              { href: "/subscriptions", icon: "favorite", label: "マイ推し" },
              { href: "/messages", icon: "mail", label: "メッセージ" },
              { href: "/notifications", icon: "notifications", label: "通知" },
              { href: "/gifts", icon: "redeem", label: "ギフト履歴" },
              { href: "/orders", icon: "alarm", label: "モーニングコール" },
              { href: "/settings", icon: "settings", label: "設定" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm text-[#5a4f48] transition hover:bg-[#fbf4f1]"
              >
                <MIcon name={item.icon} className="text-[20px] text-[#8a7a72]" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] font-black">マイ推し</h2>
            <Link href="/subscriptions" className="text-sm font-bold text-[#ef7488]">
              すべて見る
            </Link>
          </div>
          {subscriptions.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="text-[#8a7a72]">まだ推しがいません</p>
              <Link href="/discover" className="btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm">
                発見する
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="card flex items-center gap-3 p-4"
                >
                  <Link href={`/characters/${sub.character.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CharacterAvatar
                      slug={sub.character.slug}
                      src={sub.character.avatarUrl}
                      alt={sub.character.name}
                      size={52}
                      rounded="2xl"
                    />
                    <div>
                      <div className="font-display font-bold">{sub.character.name}</div>
                      <div className="text-xs font-bold text-[#3fae76]">継続中</div>
                    </div>
                  </Link>
                  <Link
                    href={characterChatHref("", sub.character.slug)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff2f0] text-[#ef7488]"
                  >
                    <MIcon name="chat_bubble" className="text-[22px]" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
