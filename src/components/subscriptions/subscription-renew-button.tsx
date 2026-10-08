"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCoins, purchaseErrorMessage } from "@/lib/pricing";

/** 临近到期时显示：再买一期，从当前到期日顺延 */
export function SubscriptionRenewButton({ characterId, price }: { characterId: string; price: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function renew() {
    if (!confirm(`${formatCoins(price)}で30日延長しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(purchaseErrorMessage(data));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "延長に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={renew}
      disabled={loading}
      className="flex flex-1 items-center justify-center rounded-[13px] bg-[#fff3e6] py-2.5 text-[13px] font-bold text-[#d18a3a] disabled:opacity-60"
    >
      {loading ? "処理中…" : "延長する"}
    </button>
  );
}
