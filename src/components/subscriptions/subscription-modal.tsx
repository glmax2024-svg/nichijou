"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { FREE_DAILY_MESSAGE_LIMIT } from "@/lib/chat-quota";
import { SUBSCRIPTION_PACKAGE } from "@/lib/subscription-perks";

const PREMIUM_FEATURES = SUBSCRIPTION_PACKAGE.perks;

type SubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  characterAvatar: string;
  subscriptionPrice: number;
  onSubscribed?: () => void;
};

export function SubscriptionModal({
  open,
  onClose,
  characterId,
  characterName,
  characterAvatar,
  subscriptionPrice,
  onSubscribed,
}: SubscriptionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加入に失敗しました");
      onSubscribed?.();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="推し登録"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={onClose}
        aria-label="閉じる"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-[720px] overflow-hidden rounded-[24px] bg-[#1a1816] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
          aria-label="閉じる"
        >
          <MIcon name="close" className="text-[20px]" />
        </button>

        <div className="relative hidden w-[42%] shrink-0 sm:block">
          <Image
            src={characterAvatar}
            alt={characterName}
            fill
            className="object-cover object-top"
            sizes="300px"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a1816]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1816] via-transparent to-transparent" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-7 sm:px-8">
          <div className="mb-1 flex items-center gap-2">
            <MIcon name="diamond" className="text-[22px] text-[#f79aa8]" />
            <h2 className="font-display text-[20px] font-black text-white sm:text-[22px]">
              {SUBSCRIPTION_PACKAGE.title}
            </h2>
          </div>
          <p className="text-[15px] font-bold text-[#f79aa8]">{SUBSCRIPTION_PACKAGE.tagline}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#a89a92]">
            本日の無料メッセージ（{FREE_DAILY_MESSAGE_LIMIT}通）を使い切りました。
            <br />
            {characterName} と話し続けるには推し登録が必要です。
          </p>

          <p className="mt-5 text-[12px] font-bold text-[#7a6a62]">
            登録後、以下の機能が使えます：
          </p>

          <ul className="mt-3 space-y-3">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex gap-3">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    f.highlight ? "bg-[#f79aa8]/25" : "bg-[#3fae76]/20"
                  }`}
                >
                  <MIcon
                    name={f.highlight ? "star" : "check"}
                    className={`text-[16px] ${f.highlight ? "text-[#f79aa8]" : "text-[#3fae76]"}`}
                  />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">{f.label}</p>
                  <p className="text-[12px] text-[#8a7a72]">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={subscribe}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f79aa8] to-[#ef7488] py-3.5 text-[15px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(239,116,136,0.7)] transition hover:brightness-105 disabled:opacity-60"
            >
              <MIcon name="diamond" className="text-[20px] text-white" />
              {loading
                ? "処理中…"
                : `推し登録 · ¥${subscriptionPrice.toLocaleString()}/月`}
            </button>
            {error && <p className="mt-2 text-center text-[12px] text-red-400">{error}</p>}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full py-2 text-center text-[13px] text-[#7a6a62] hover:text-[#a89a92]"
            >
              あとで
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
