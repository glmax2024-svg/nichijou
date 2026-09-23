"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

/** 删除角色：需输入角色名确认。有付费记录的角色服务端会拒绝（只能下架）。 */
export function CharacterDangerZone({ characterId, characterName }: { characterId: string; characterName: string }) {
  const { dict, t } = useLocale();
  const s = dict.studio.danger;
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${characterId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.code === "HAS_PAID_RECORDS" ? s.blocked : (data.error ?? res.statusText));
      router.push("/studio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[rgba(212,101,101,0.25)] bg-white p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#d46565]">
        <MIcon name="warning" className="text-[20px]" />
        {s.title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-[#8a7a72]">{s.desc}</p>
      <label className="mt-4 block text-[12px] font-bold text-[#5a4f48]">{t(s.confirm, { name: characterName })}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="min-w-[200px] flex-1 rounded-[12px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-3 py-2.5 text-sm outline-none focus:border-[#d46565]/50"
          autoComplete="off"
        />
        <button
          type="button"
          disabled={typed.trim() !== characterName || busy}
          onClick={() => void remove()}
          className="rounded-[12px] bg-[#d46565] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#c85555] disabled:opacity-40"
        >
          {busy ? s.deleting : s.button}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-[12.5px] font-bold text-[#d46565]" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
