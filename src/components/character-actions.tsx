"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";
import { ORDER_OPTIONS, formatYen } from "@/lib/stripe";
import { loginPath } from "@/lib/login-path";
import { redirectIfCheckout } from "@/lib/checkout-client";
import { GiftGrid } from "@/components/gifts/gift-grid";
import { GiftFx, type GiftFxPayload } from "@/components/gifts/gift-fx";
import { useGiftCatalog, type PublicGift } from "@/components/gifts/use-gift-catalog";

export function CharacterActions({
  characterId,
  characterName,
  subscriptionPrice,
  isSubscribed,
  isLoggedIn,
  variant = "sidebar",
}: {
  characterId: string;
  characterName: string;
  subscriptionPrice: number;
  isSubscribed: boolean;
  isLoggedIn: boolean;
  variant?: "sidebar" | "inline";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const mobileBase = pathname.startsWith("/h5") ? "/h5" : pathname.startsWith("/app") ? "/app" : "";
  const [loading, setLoading] = useState<string | null>(null);
  const [fx, setFx] = useState<GiftFxPayload | null>(null);
  const gifts = useGiftCatalog();

  function goLogin() {
    router.push(loginPath(mobileBase, pathname));
  }

  async function subscribe() {
    if (!isLoggedIn) {
      goLogin();
      return;
    }
    setLoading("subscribe");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (redirectIfCheckout(data)) return;
      alert(data.demo ? "デモモード：サブスクが有効になりました！" : "加入しました！");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setLoading(null);
    }
  }

  async function sendGift(gift: PublicGift) {
    if (!isLoggedIn) {
      goLogin();
      return;
    }
    setLoading(gift.slug);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, giftType: gift.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (redirectIfCheckout(data)) return;
      setFx({
        name: data.label ?? gift.name,
        emoji: data.emoji ?? gift.emoji,
        iconUrl: data.iconUrl ?? gift.iconUrl,
        animationUrl: data.animationUrl ?? gift.animationUrl,
        animationKind: data.animationKind ?? gift.animationKind,
        accentColor: gift.accentColor,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setLoading(null);
    }
  }

  async function orderService(type: "BIRTHDAY" | "WAKE_UP" | "CUSTOM") {
    if (!isLoggedIn) {
      goLogin();
      return;
    }
    setLoading(type);
    try {
      const customText =
        type === "CUSTOM" ? prompt("カスタムセリフを入力（50字以内）") ?? undefined : undefined;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, type, customText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (redirectIfCheckout(data)) return;
      alert(`注文完了！\n\nボイステキスト:\n「${data.voiceText}」`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setLoading(null);
    }
  }

  if (variant === "inline") {
    return (
      <>
        {isSubscribed ? (
          <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#ffeef1] px-4 py-3 text-sm font-bold text-[#e0607a]">
            <MIcon name="favorite" className="text-[20px]" filled />
            加入中
          </span>
        ) : (
          <button
            onClick={subscribe}
            disabled={loading === "subscribe"}
            className="btn-primary flex items-center gap-1.5 rounded-2xl px-5 py-3 text-[15px] disabled:opacity-50"
          >
            <MIcon name="favorite" className="text-[20px] text-white" />
            推す · {formatYen(subscriptionPrice)}/月
          </button>
        )}
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(120,72,54,0.12)] bg-white text-[#8a7a72]"
          aria-label="共有"
        >
          <MIcon name="ios_share" className="text-[22px]" />
        </button>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {!isSubscribed && (
        <div className="card p-5">
          <h3 className="font-display font-bold text-[#3a3330]">サブスクリプション</h3>
          <p className="mt-2 font-display text-2xl font-black text-[#ef7488]">
            {formatYen(subscriptionPrice)}
            <span className="text-sm font-normal text-[#b0a099]">/月</span>
          </p>
          <p className="mt-1 text-sm text-[#8a7a72]">日常投稿の全閲覧 + チャット機能</p>
          <button
            onClick={subscribe}
            disabled={loading === "subscribe"}
            className="btn-primary mt-4 w-full rounded-2xl py-3 text-sm disabled:opacity-50"
          >
            {loading === "subscribe" ? "処理中…" : "推しする"}
          </button>
        </div>
      )}

      <div className="card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-[#3a3330]">
          <MIcon name="redeem" className="text-[20px] text-[#ef7488]" />
          ギフトを送る
        </h3>
        <GiftGrid gifts={gifts} loadingId={loading} onPick={sendGift} />
      </div>

      <div
        className="rounded-[22px] border border-[rgba(143,184,232,0.2)] p-4"
        style={{ background: "linear-gradient(150deg,#eef1ff,#f4f0ff)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white shadow-[0_6px_14px_-8px_rgba(143,184,232,0.7)]">
            <MIcon name="alarm" className="text-[22px] text-[#7d97e0]" />
          </div>
          <div className="leading-snug">
            <div className="font-display text-sm font-bold">モーニングコール</div>
            <div className="text-xs text-[#8a7a72]">{characterName}の声で起こしてもらう</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {ORDER_OPTIONS.map((order) => (
            <button
              key={order.type}
              onClick={() => orderService(order.type)}
              disabled={!!loading}
              className="w-full rounded-xl border border-[rgba(120,72,54,0.06)] bg-white/70 p-3 text-left text-sm transition hover:bg-white disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#3a3330]">{order.label}</p>
                <p className="text-[#7d97e0]">{formatYen(order.amount)}</p>
              </div>
              <p className="mt-0.5 text-xs text-[#b0a099]">{order.description}</p>
            </button>
          ))}
        </div>
      </div>
      <GiftFx gift={fx} onDone={() => setFx(null)} />
    </div>
  );
}
