"use client";

import { useState } from "react";
import { EVENT_THEMES, EVENT_THEME_IDS, eventTheme } from "@/lib/event-themes";

export type AdminEventRow = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  theme: string;
  imageUrl: string | null;
  linkHref: string | null;
  ctaLabel: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
  sortOrder: number;
};

type Form = Omit<AdminEventRow, "id" | "imageUrl" | "linkHref"> & { imageUrl: string; linkHref: string };

const inputClass = "mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px]";
const labelClass = "text-[12px] font-bold text-[#8a7a72]";

/** ISO → datetime-local 的值（浏览器本地时区） */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): Form {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: "",
    subtitle: "",
    description: "",
    badge: "期間限定イベント",
    theme: "sakura",
    imageUrl: "",
    linkHref: "",
    ctaLabel: "詳しく見る",
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
    published: false,
    sortOrder: 100,
  };
}

function statusOf(row: AdminEventRow, now: number) {
  if (!row.published) return { label: "非公開", className: "bg-[#f1ece9] text-[#8a7a72]" };
  if (new Date(row.endsAt).getTime() <= now) return { label: "終了", className: "bg-[#f1ece9] text-[#b0a099]" };
  if (new Date(row.startsAt).getTime() > now) return { label: "予定", className: "bg-[#eef1ff] text-[#6b7fd0]" };
  return { label: "開催中", className: "bg-[#eafaf1] text-[#3fae76]" };
}

const rangeFormat = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function AdminEventsPanel({ initial, now }: { initial: AdminEventRow[]; now: number }) {
  const [rows, setRows] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function startCreate() {
    setForm(emptyForm());
    setEditingId("new");
    setMessage(null);
  }

  function startEdit(row: AdminEventRow) {
    setForm({
      ...row,
      imageUrl: row.imageUrl ?? "",
      linkHref: row.linkHref ?? "",
      startsAt: toLocalInput(row.startsAt),
      endsAt: toLocalInput(row.endsAt),
    });
    setEditingId(row.id);
    setMessage(null);
  }

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/events/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        imageUrl: form.imageUrl.trim() || null,
        linkHref: form.linkHref.trim() || null,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      const res = await fetch(editingId === "new" ? "/api/admin/events" : `/api/admin/events/${editingId}`, {
        method: editingId === "new" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      const saved: AdminEventRow = {
        ...data.event,
        startsAt: new Date(data.event.startsAt).toISOString(),
        endsAt: new Date(data.event.endsAt).toISOString(),
      };
      setRows((prev) =>
        editingId === "new" ? [saved, ...prev] : prev.map((r) => (r.id === saved.id ? saved : r)),
      );
      setEditingId(null);
      setMessage("保存しました");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AdminEventRow) {
    if (!confirm(`「${row.title}」を削除しますか？`)) return;
    const res = await fetch(`/api/admin/events/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "削除に失敗しました");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (editingId === row.id) setEditingId(null);
  }

  const preview = eventTheme(form.theme);

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-[14px] border border-[rgba(239,116,136,0.2)] bg-[#fff4f6] px-4 py-3 text-[13px]">{message}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#8a7a72]">公開中かつ期間内のイベントがホームに表示されます。</p>
        <button type="button" onClick={startCreate} className="btn-primary rounded-full px-4 py-2 text-sm">
          新しいイベント
        </button>
      </div>

      {editingId && (
        <form onSubmit={save} className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-5">
          <div
            className="relative mb-4 flex h-24 items-center overflow-hidden rounded-[18px] px-5"
            style={{ background: preview.background }}
          >
            {form.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover [mask-image:linear-gradient(90deg,transparent,#000_45%)]" />
            )}
            <div className="relative">
              <div className="inline-flex rounded-full bg-white/85 px-2.5 py-1 text-[10.5px] font-bold" style={{ color: preview.accent }}>
                {form.badge || "バッジ"}
              </div>
              <div className="mt-1.5 font-display text-lg font-black" style={{ color: preview.ink }}>
                {form.title || "タイトル"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              タイトル
              <input required maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              サブタイトル
              <input maxLength={120} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputClass} />
            </label>
            <label className={labelClass}>
              バッジ
              <input required maxLength={20} value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className={inputClass} />
            </label>
            <label className={labelClass}>
              配色
              <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className={inputClass}>
                {EVENT_THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {EVENT_THEMES[id].label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              開始
              <input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputClass} />
            </label>
            <label className={labelClass}>
              終了
              <input type="datetime-local" required value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </label>
            <label className={labelClass}>
              ボタン文言
              <input required maxLength={20} value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} className={inputClass} />
            </label>
            <label className={labelClass}>
              リンク先（空欄なら詳細ページ）
              <input
                value={form.linkHref}
                onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
                className={inputClass}
                placeholder="/characters/wanting"
              />
            </label>
            <label className={labelClass}>
              バナー画像
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
                className="mt-1 block w-full text-[12px]"
              />
              {uploading && <span className="text-[#b0a099]">アップロード中…</span>}
              {form.imageUrl && !uploading && (
                <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="mt-1 text-[11.5px] text-[#d46565]">
                  画像を外す
                </button>
              )}
            </label>
            <label className={labelClass}>
              並び順（小さいほど先）
              <input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              詳細（イベントページに表示）
              <textarea rows={6} maxLength={4000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-bold text-[#5a4f48]">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              公開する
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy || uploading} className="btn-primary rounded-full px-5 py-2 text-sm disabled:opacity-60">
              {busy ? "保存中…" : "保存"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-[rgba(120,72,54,0.12)] px-5 py-2 text-sm">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-[rgba(120,72,54,0.15)] p-8 text-center text-[13px] text-[#8a7a72]">
          まだイベントはありません
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const status = statusOf(row, now);
            return (
              <li key={row.id} className="flex items-center gap-3 rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white p-3.5">
                <div className="h-12 w-16 shrink-0 rounded-[12px]" style={{ background: eventTheme(row.theme).background }} />
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-[14.5px] font-bold">{row.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="text-[11.5px] text-[#8a7a72]">
                    {rangeFormat.format(new Date(row.startsAt))} 〜 {rangeFormat.format(new Date(row.endsAt))}
                  </div>
                </div>
                <a href={`/events/${row.id}`} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-[#8a7a72]">
                  表示
                </a>
                <button type="button" onClick={() => startEdit(row)} className="text-[12px] font-bold text-[#ef7488]">
                  編集
                </button>
                <button type="button" onClick={() => remove(row)} className="text-[12px] font-bold text-[#d46565]">
                  削除
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
