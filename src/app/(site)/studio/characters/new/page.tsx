"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCharacterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    avatarUrl: "/characters/aoi/avatar.png",
    bio: "",
    personality: "",
    speechStyle: "",
    tags: "校园,治愈",
    subscriptionPrice: 980,
    published: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/studio/characters/${data.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: "name", label: "名前", required: true },
    { key: "tagline", label: "キャッチコピー" },
    { key: "avatarUrl", label: "アバター URL", required: true },
    { key: "bio", label: "プロフィール", textarea: true, required: true },
    { key: "personality", label: "性格設定", textarea: true, required: true },
    { key: "speechStyle", label: "話し方", textarea: true, required: true },
    { key: "tags", label: "タグ（カンマ区切り）" },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/studio" className="text-sm text-stone-400 hover:text-rose-500">
        ← スタジオに戻る
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-stone-800">新しいキャラクター</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-rose-100">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              {field.label}
            </label>
            {"textarea" in field && field.textarea ? (
              <textarea
                required={"required" in field && field.required}
                rows={3}
                value={form[field.key as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
              />
            ) : (
              <input
                required={"required" in field && field.required}
                value={form[field.key as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
              />
            )}
          </div>
        ))}

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            月額料金（円）
          </label>
          <input
            type="number"
            min={100}
            value={form.subscriptionPrice}
            onChange={(e) =>
              setForm({ ...form, subscriptionPrice: parseInt(e.target.value, 10) })
            }
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="rounded"
          />
          公開する
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-rose-500 py-3 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
        >
          {loading ? "作成中…" : "キャラクターを作成"}
        </button>
      </form>
    </div>
  );
}
