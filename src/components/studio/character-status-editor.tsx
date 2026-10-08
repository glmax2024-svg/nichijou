"use client";

import { useEffect, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";

type Status = { emoji: string; text: string; updatedAt: string; expiresAt: string | null };

const DURATIONS = [
  { hours: 3, label: "3時間" },
  { hours: 12, label: "12時間" },
  { hours: 24, label: "1日" },
  { hours: 72, label: "3日" },
  { hours: null, label: "次に変えるまで" },
] as const;

const QUICK_EMOJI = ["☕", "📚", "🎮", "🍳", "🛁", "💤", "🎧", "🏃‍♀️", "✏️", "🌙"];

const timeFormat = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 工作室：设置角色「いまの様子」，显示在聊天侧栏和角色主页，也会告诉 AI */
export function CharacterStatusEditor({ characterId }: { characterId: string }) {
  const [current, setCurrent] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [emoji, setEmoji] = useState("");
  const [text, setText] = useState("");
  const [hours, setHours] = useState<number | null>(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/characters/${characterId}/status`)
      .then((res) => (res.ok ? res.json() : { status: null }))
      .then((data: { status: Status | null }) => {
        if (cancelled) return;
        setCurrent(data.status);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${characterId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, text, hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setCurrent(data.status);
      setText("");
      setEmoji("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/characters/${characterId}/status`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      setCurrent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#3a3330]">
          <MIcon name="radio_button_checked" className="text-[18px] text-[#3fae76]" />
          いまの様子
        </h3>
        <p className="mt-1 text-[12px] text-[#8a7a72]">
          チャット画面とプロフィールに表示され、会話の AI にも伝わります。期限が来ると自動で消えます。
        </p>
      </div>

      {loaded && current && (
        <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[#f4fbf6] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-[#3a3330]">
              {current.emoji} {current.text}
            </p>
            <p className="text-[11px] text-[#8a7a72]">
              {current.expiresAt ? `${timeFormat.format(new Date(current.expiresAt))} まで表示` : "次に変えるまで表示"}
            </p>
          </div>
          <button type="button" onClick={clear} disabled={busy} className="shrink-0 text-[12px] font-bold text-[#d46565] disabled:opacity-50">
            消す
          </button>
        </div>
      )}

      <form onSubmit={save} className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? "" : e)}
              className={`h-9 w-9 rounded-full text-[18px] ${emoji === e ? "bg-[#ffeef1] ring-2 ring-[#ef7488]" : "bg-[#fbf4f1]"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={60}
          required
          placeholder="例：放課後、カフェで課題中"
          className="w-full rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-4 py-2.5 text-sm outline-none focus:border-[#ef7488]/40"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              type="button"
              onClick={() => setHours(d.hours)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                hours === d.hours ? "bg-[#ef7488] text-white" : "bg-[#fbf4f1] text-[#8a7a72]"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {error && <p className="text-[12px] font-bold text-[#d46565]">{error}</p>}
        <button type="submit" disabled={busy || !text.trim()} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-50">
          {busy ? "保存中…" : current ? "更新する" : "設定する"}
        </button>
      </form>
    </section>
  );
}
