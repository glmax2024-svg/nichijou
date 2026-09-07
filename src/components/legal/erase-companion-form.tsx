"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Companion = {
  id: string;
  name: string;
};

export function EraseCompanionForm({
  companions,
  labels,
}: {
  companions: Companion[];
  labels: {
    title: string;
    hint: string;
    eraseOne: string;
    eraseAll: string;
    confirmOne: string;
    confirmAll: string;
    done: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function erase(characterId?: string) {
    const confirmed = window.confirm(characterId ? labels.confirmOne : labels.confirmAll);
    if (!confirmed) return;
    setLoading(characterId ?? "all");
    try {
      const res = await fetch("/api/ai/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(characterId ? { characterId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? labels.done);
      router.refresh();
      alert(labels.done);
    } catch (err) {
      alert(err instanceof Error ? err.message : labels.done);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 rounded-[18px] border border-[rgba(120,72,54,0.08)] bg-white px-4 py-4">
      <div className="font-display text-[14px] font-bold text-[#3a3330]">{labels.title}</div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#8a7a72]">{labels.hint}</p>
      {companions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {companions.map((companion) => (
            <li key={companion.id} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-[#3a3330]">{companion.name}</span>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => erase(companion.id)}
                className="rounded-full border border-[rgba(239,116,136,0.25)] px-3 py-1 text-[12px] font-bold text-[#e0607a] disabled:opacity-50"
              >
                {loading === companion.id ? "…" : labels.eraseOne}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => erase()}
        className="mt-3 w-full rounded-[14px] border border-[rgba(239,116,136,0.2)] py-2.5 text-[13px] font-bold text-[#e0607a] disabled:opacity-50"
      >
        {loading === "all" ? "…" : labels.eraseAll}
      </button>
    </div>
  );
}
