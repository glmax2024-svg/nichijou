import Link from "next/link";
import Image from "next/image";
import type { Session } from "next-auth";
import { characterChatHref } from "@/lib/chat-inbox";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";

type Subscription = {
  id: string;
  character: {
    slug: string;
    name: string;
    avatarUrl: string;
  };
};

export function H5MeLoggedIn({
  session,
  subscriptions,
  basePath,
  giftCount = 0,
}: {
  session: Session;
  subscriptions: Subscription[];
  basePath: "" | "/h5" | "/app";
  giftCount?: number;
}) {
  return (
    <div className="min-h-full bg-[#fbf4f1] px-[18px] py-2 pb-4">
      <div
        className="rounded-3xl border border-[rgba(239,116,136,0.14)] p-5"
        style={{ background: "linear-gradient(135deg,#fff2f0,#ffe6ea 60%,#eef1ff)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-[20px] border-[3px] border-white bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff] text-xl font-black text-[#ef7488]">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={60}
                height={60}
                className="h-full w-full object-cover"
              />
            ) : (
              (session.user.name ?? session.user.email ?? "?")[0]
            )}
          </div>
          <div className="flex-1 leading-snug">
            <div className="font-display text-[19px] font-black">
              {session.user.name ?? "ユーザー"}
            </div>
            <div className="text-xs text-[#8a7a72]">
              @{session.user.email?.split("@")[0]} · ファン
            </div>
          </div>
          <Link href={`${basePath}/settings`} aria-label="設定">
            <MIcon name="settings" className="text-[22px] text-[#8a7a72]" />
          </Link>
        </div>
        <div className="mt-4 flex gap-2">
          {[
            { n: subscriptions.length, label: "推し中", color: "#ef7488" },
            { n: giftCount || "—", label: "ギフト", color: "#7d97e0" },
            { n: 86, label: "日連続", color: "#3a3330" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-[14px] bg-white/70 py-2.5 text-center">
              <div className="font-display text-lg font-black" style={{ color: s.color }}>
                {s.n}
              </div>
              <div className="text-[11px] text-[#8a7a72]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-2.5 mt-5 flex items-center justify-between px-0.5">
        <span className="font-display text-[15px] font-bold">マイ推し</span>
        <Link href={`${basePath}/subscriptions`} className="text-xs font-bold text-[#ef7488]">
          すべて見る
        </Link>
      </div>
      <div className="flex flex-col gap-2.5">
        {subscriptions.map((sub, i) => (
          <div
            key={sub.id}
            className="flex items-center gap-2 rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white p-3"
          >
            <Link
              href={`${basePath}/characters/${sub.character.slug}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <CharacterAvatar
                slug={sub.character.slug}
                src={sub.character.avatarUrl}
                alt={sub.character.name}
                size={48}
                rounded="2xl"
              />
              <div className="min-w-0 flex-1 leading-snug">
                <div className="font-display text-[14.5px] font-bold">{sub.character.name}</div>
                <div
                  className={`text-[11.5px] font-bold ${
                    i === 0 ? "text-[#3fae76]" : "text-[#8a7a72]"
                  }`}
                >
                  {i === 0 ? "残り 23 日 · 更新予定" : "残り 8 日"}
                </div>
              </div>
            </Link>
            <Link
              href={characterChatHref(basePath, sub.character.slug)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff2f0] text-[#ef7488]"
              aria-label={`${sub.character.name}にメッセージ`}
            >
              <MIcon name="chat_bubble" className="text-[22px]" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white">
        <MeRow icon="redeem" iconColor="#ef7488" label="ギフト履歴" href={`${basePath}/gifts`} />
        <MeRow icon="alarm" iconColor="#7d97e0" label="モーニングコール" href={`${basePath}/orders`} />
        {(session.user.role === "CREATOR" || session.user.role === "ADMIN") && (
          <MeRow icon="palette" iconColor="#8b76d4" label="クリエイタースタジオ" href="/studio" />
        )}
        {session.user.role === "ADMIN" && (
          <>
            <MeRow icon="payments" iconColor="#ef7488" label="分成管理" href="/admin/revenue" />
            <MeRow icon="redeem" iconColor="#ef7488" label="ギフト図録" href="/admin/gifts" />
          </>
        )}
        <MeRow icon="help" iconColor="#8a7a72" label="ヘルプ" href={`${basePath}/help`} />
      </div>
    </div>
  );
}

function MeRow({
  icon,
  iconColor,
  label,
  href,
}: {
  icon: string;
  iconColor: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[rgba(120,72,54,0.05)] px-4 py-3.5 last:border-0"
    >
      <MIcon name={icon} className="text-[22px]" style={{ color: iconColor }} />
      <span className="flex-1 text-[13.5px]">{label}</span>
      <MIcon name="chevron_right" className="text-[20px] text-[#c9bdb5]" />
    </Link>
  );
}
