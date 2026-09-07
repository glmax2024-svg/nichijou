"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterComplianceFields } from "@/components/legal/register-compliance-fields";

export function AgeVerifyForm({ legalBasePath = "" }: { legalBasePath?: "" | "/h5" | "/app" }) {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/me/age", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, acceptedTerms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "確認に失敗しました");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 rounded-[18px] border border-[rgba(239,116,136,0.2)] bg-white px-4 py-4"
    >
      <div className="font-display text-[14px] font-bold text-[#3a3330]">年齢確認</div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#8a7a72]">
        チャット・投稿・決済の前に、18歳以上であることの確認が必要です。
      </p>
      <RegisterComplianceFields
        birthDate={birthDate}
        acceptedTerms={acceptedTerms}
        onBirthDate={setBirthDate}
        onAcceptedTerms={setAcceptedTerms}
        legalBasePath={legalBasePath}
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary mt-4 w-full rounded-[14px] py-3 text-[14px] disabled:opacity-50"
      >
        {loading ? "送信中…" : "確認する"}
      </button>
    </form>
  );
}
