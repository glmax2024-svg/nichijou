"use client";

import { useEffect, useState } from "react";
import { getCharacterSkills, listSkillCatalog } from "@/lib/character-skills";

type PersonaForm = {
  tagline: string;
  identity: string;
  bio: string;
  personality: string;
  speechStyle: string;
  worldRules: string;
  brandVoice: string;
  boundaries: string;
  contentRating: "ALL" | "MATURE";
  triggerWord: string;
  skillIds: string[];
  personaVersion: number;
};

export function PersonaEditor({ characterId }: { characterId: string }) {
  const [form, setForm] = useState<PersonaForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/characters?id=${characterId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setForm({
          tagline: data.tagline ?? "",
          identity: data.identity ?? "",
          bio: data.bio ?? "",
          personality: data.personality ?? "",
          speechStyle: data.speechStyle ?? "",
          worldRules: data.worldRules ?? "",
          brandVoice: data.brandVoice ?? "",
          boundaries: data.boundaries ?? "",
          contentRating: data.contentRating === "MATURE" ? "MATURE" : "ALL",
          triggerWord: data.triggerWord ?? "",
          skillIds: (() => {
            const saved = String(data.skillIds ?? "")
              .split(/[,|\s]+/)
              .map((id: string) => id.trim())
              .filter(Boolean);
            if (saved.length > 0) return saved.filter((id) => id !== "daily-chat");
            return getCharacterSkills(data.slug, { tags: data.tags ?? "" })
              .map((skill) => skill.id)
              .filter((id) => id !== "daily-chat");
          })(),
          personaVersion: data.personaVersion ?? 1,
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [characterId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: characterId,
          action: "update-persona",
          ...form,
          triggerWord: form.triggerWord || null,
          skillIds: ["daily-chat", ...form.skillIds.filter((id) => id !== "daily-chat")].join(","),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm((prev) =>
        prev
          ? { ...prev, personaVersion: data.character?.personaVersion ?? prev.personaVersion + 1 }
          : prev,
      );
      alert("人格コンテナを保存しました");
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return <p className="text-sm text-[#8a7a72]">読み込み中…</p>;
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-[22px] border border-[rgba(120,72,54,0.07)] bg-white p-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black text-[#3a3330]">人格コンテナ</h2>
          <p className="mt-1 text-[12px] text-[#8a7a72]">
            身分・世界ルール・社交境界を保存すると、チャットの system prompt に入ります。版 {form.personaVersion}
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary rounded-[14px] px-4 py-2 text-[13px] disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存する"}
        </button>
      </div>
      <Field
        label="肩書き"
        value={form.tagline}
        onChange={(tagline) => setForm({ ...form, tagline })}
      />
      <Field
        label="身分・立ち位置"
        value={form.identity}
        onChange={(identity) => setForm({ ...form, identity })}
        multiline
      />
      <Field label="背景" value={form.bio} onChange={(bio) => setForm({ ...form, bio })} multiline />
      <Field
        label="性格"
        value={form.personality}
        onChange={(personality) => setForm({ ...form, personality })}
        multiline
      />
      <Field
        label="話し方"
        value={form.speechStyle}
        onChange={(speechStyle) => setForm({ ...form, speechStyle })}
        multiline
      />
      <Field
        label="世界ルール"
        value={form.worldRules}
        onChange={(worldRules) => setForm({ ...form, worldRules })}
        multiline
      />
      <Field
        label="ブランド表現"
        value={form.brandVoice}
        onChange={(brandVoice) => setForm({ ...form, brandVoice })}
        multiline
      />
      <Field
        label="社交境界（1行1ルール）"
        value={form.boundaries}
        onChange={(boundaries) => setForm({ ...form, boundaries })}
        multiline
      />
      <label className="block text-xs font-bold text-[#8a7a72]">レーティング</label>
      <select
        value={form.contentRating}
        onChange={(e) =>
          setForm({ ...form, contentRating: e.target.value === "MATURE" ? "MATURE" : "ALL" })
        }
        className="w-full rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3 text-sm"
      >
        <option value="ALL">ALL（日常）</option>
        <option value="MATURE">MATURE（成人向け可）</option>
      </select>
      <Field
        label="LoRA trigger word"
        value={form.triggerWord}
        onChange={(triggerWord) => setForm({ ...form, triggerWord })}
      />
      <div>
        <div className="text-xs font-bold text-[#8a7a72]">スキルプラグイン</div>
        <p className="mt-1 text-[11px] text-[#b0a099]">
          未選択のときはキャラクターの slug / タグからデフォルト装備します。
        </p>
        <div className="mt-2 space-y-2">
          {listSkillCatalog()
            .filter((skill) => skill.id !== "daily-chat")
            .map((skill) => {
              const checked = form.skillIds.includes(skill.id);
              return (
                <label
                  key={skill.id}
                  className="flex items-start gap-2 rounded-[14px] border border-[rgba(120,72,54,0.08)] bg-[#faf5f2] px-3 py-2 text-[13px]"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        skillIds: e.target.checked
                          ? [...form.skillIds, skill.id]
                          : form.skillIds.filter((id) => id !== skill.id),
                      });
                    }}
                  />
                  <span>
                    <span className="font-bold text-[#3a3330]">{skill.name}</span>
                    <span className="mt-0.5 block text-[11px] text-[#8a7a72]">{skill.description}</span>
                  </span>
                </label>
              );
            })}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#8a7a72]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3 text-sm outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3 text-sm outline-none"
        />
      )}
    </label>
  );
}
