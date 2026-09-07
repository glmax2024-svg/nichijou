"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatYen } from "@/lib/stripe";
import { GiftIcon } from "@/components/gifts/gift-icon";

type GiftRow = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  iconUrl: string | null;
  animationUrl: string | null;
  animationKind: string;
  amount: number;
  sortOrder: number;
  active: boolean;
  intimacyDelta: number;
  description: string;
  accentColor: string;
};

type FormState = {
  slug: string;
  name: string;
  emoji: string;
  amount: number;
  sortOrder: number;
  intimacyDelta: number;
  accentColor: string;
  description: string;
  active: boolean;
  iconUrl: string;
  animationUrl: string;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
  emoji: "🎁",
  amount: 500,
  sortOrder: 100,
  intimacyDelta: 3,
  accentColor: "#ffe1e6",
  description: "",
  active: true,
  iconUrl: "",
  animationUrl: "",
};

export function AdminGiftsPanel({ initial }: { initial: GiftRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"icon" | "animation" | null>(null);

  function startCreate() {
    setEditingId("new");
    setForm(emptyForm);
    setMessage(null);
  }

  function startEdit(row: GiftRow) {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      name: row.name,
      emoji: row.emoji,
      amount: row.amount,
      sortOrder: row.sortOrder,
      intimacyDelta: row.intimacyDelta,
      accentColor: row.accentColor,
      description: row.description,
      active: row.active,
      iconUrl: row.iconUrl ?? "",
      animationUrl: row.animationUrl ?? "",
    });
    setMessage(null);
  }

  async function upload(kind: "icon" | "animation", file: File) {
    setUploading(kind);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/gifts/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロード失敗");
      if (kind === "icon") setForm((f) => ({ ...f, iconUrl: data.url }));
      else setForm((f) => ({ ...f, animationUrl: data.url }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "アップロード失敗");
    } finally {
      setUploading(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        slug: form.slug,
        name: form.name,
        emoji: form.emoji,
        amount: Number(form.amount),
        sortOrder: Number(form.sortOrder),
        intimacyDelta: Number(form.intimacyDelta),
        accentColor: form.accentColor,
        description: form.description,
        active: form.active,
        iconUrl: form.iconUrl || null,
        animationUrl: form.animationUrl || null,
      };
      const res = await fetch(
        editingId === "new" ? "/api/admin/gifts" : `/api/admin/gifts/${editingId}`,
        {
          method: editingId === "new" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setMessage("保存しました");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gifts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "失敗");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-[14px] border border-[rgba(239,116,136,0.2)] bg-[#fff4f6] px-4 py-3 text-[13px]">
          {message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#8a7a72]">名称・価格・アイコン・GIF/MP4 を設定します。</p>
        <button type="button" onClick={startCreate} className="btn-primary rounded-full px-4 py-2 text-sm">
          新しいギフト
        </button>
      </div>

      {editingId && (
        <form onSubmit={save} className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-bold text-[#8a7a72]">
              内部 ID（slug）
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
                placeholder="flower"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              表示名
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              絵文字（アイコン未設定時）
              <input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              価格（円）
              <input
                type="number"
                min={100}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              並び順
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              親密度
              <input
                type="number"
                min={0}
                max={20}
                value={form.intimacyDelta}
                onChange={(e) => setForm({ ...form, intimacyDelta: Number(e.target.value) })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              背景色
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                className="mt-1 h-10 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)]"
              />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-[#5a4f48] sm:mt-6">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              販売中
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72] sm:col-span-2">
              説明
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]"
              />
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              アイコン画像
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload("icon", file);
                }}
                className="mt-1 block w-full text-[12px]"
              />
              {uploading === "icon" ? <span className="text-[#b0a099]">アップロード中…</span> : null}
            </label>
            <label className="text-[12px] font-bold text-[#8a7a72]">
              演出（GIF / MP4）
              <input
                type="file"
                accept="image/gif,image/webp,video/mp4"
                disabled={uploading !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload("animation", file);
                }}
                className="mt-1 block w-full text-[12px]"
              />
              {uploading === "animation" ? <span className="text-[#b0a099]">アップロード中…</span> : null}
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <GiftIcon
              gift={{ emoji: form.emoji, iconUrl: form.iconUrl || null, accentColor: form.accentColor }}
              size={56}
            />
            {form.animationUrl ? (
              <span className="text-[12px] text-[#8a7a72]">演出: {form.animationUrl}</span>
            ) : (
              <span className="text-[12px] text-[#b0a099]">演出なし（絵文字ポップ）</span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary rounded-full px-4 py-2 text-sm disabled:opacity-50">
              保存
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-full border border-[rgba(120,72,54,0.12)] px-4 py-2 text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {initial.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white px-4 py-3"
          >
            <GiftIcon gift={row} size={48} />
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-bold">
                {row.name}{" "}
                <span className="text-[12px] font-normal text-[#b0a099]">{row.slug}</span>
              </div>
              <div className="text-[12px] text-[#8a7a72]">
                {formatYen(row.amount)} · 親密度 +{row.intimacyDelta}
                {row.animationUrl ? " · 演出あり" : ""}
                {row.active ? "" : " · 非公開"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => startEdit(row)}
              className="rounded-full border border-[rgba(120,72,54,0.12)] px-3 py-1 text-[12px] font-bold"
            >
              編集
            </button>
            {row.active && (
              <button
                type="button"
                disabled={saving}
                onClick={() => deactivate(row.id)}
                className="rounded-full px-3 py-1 text-[12px] font-bold text-[#e0607a]"
              >
                非公開
              </button>
            )}
          </li>
        ))}
        {initial.length === 0 && (
          <li className="rounded-[18px] bg-white px-4 py-8 text-center text-[13px] text-[#b0a099]">
            まだギフトがありません。デフォルトの花束などはシード後に表示されます。
          </li>
        )}
      </ul>
    </div>
  );
}
