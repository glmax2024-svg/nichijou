"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatYen } from "@/lib/stripe";
import { formatSharePercent } from "@/lib/revenue/split";

type Campaign = {
  id: string;
  name: string;
  bonusBps: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  scope: string;
  creatorId: string | null;
  characterId: string | null;
};

type Creator = {
  id: string;
  name: string | null;
  email: string;
  creatorShareBps: number | null;
  _count: { characters: number };
};

type Character = {
  id: string;
  name: string;
  slug: string;
  creatorId: string;
  creatorShareBps: number | null;
};

type Earning = {
  id: string;
  kind: string;
  grossAmount: number;
  creatorAmount: number;
  platformAmount: number;
  finalShareBps: number;
  bonusBps: number;
  campaignName: string | null;
  createdAt: string;
  creator: { name: string | null };
  character: { name: string };
};

export type AdminRevenueData = {
  globalCreatorSharePercent: number;
  campaigns: Campaign[];
  creators: Creator[];
  characters: Character[];
  recent: Earning[];
  totals: { gross: number; creator: number; platform: number };
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function kindLabel(kind: string) {
  if (kind === "GIFT") return "ギフト";
  if (kind === "ORDER") return "オーダー";
  return "購読";
}

export function AdminRevenuePanel({ initial }: { initial: AdminRevenueData }) {
  const router = useRouter();
  const [percent, setPercent] = useState(initial.globalCreatorSharePercent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nowDefault = useMemo(() => {
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return { start: toLocalInput(start.toISOString()), end: toLocalInput(end.toISOString()) };
  }, []);

  const [campaign, setCampaign] = useState({
    name: "期間限定応援",
    bonusPercent: 10,
    startsAt: nowDefault.start,
    endsAt: nowDefault.end,
    scope: "GLOBAL" as "GLOBAL" | "CREATOR" | "CHARACTER",
    creatorId: initial.creators[0]?.id ?? "",
    characterId: initial.characters[0]?.id ?? "",
  });

  async function saveGlobal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/revenue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorSharePercent: Number(percent) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setMessage(`グローバル分成を画师 ${data.globalCreatorSharePercent}% に更新しました`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride(payload: {
    creatorId?: string;
    characterId?: string;
    creatorSharePercent: number | null;
  }) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/revenue/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setMessage("個別分成を更新しました");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/revenue/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          bonusPercent: Number(campaign.bonusPercent),
          startsAt: new Date(campaign.startsAt).toISOString(),
          endsAt: new Date(campaign.endsAt).toISOString(),
          scope: campaign.scope,
          creatorId: campaign.scope === "CREATOR" ? campaign.creatorId : null,
          characterId: campaign.scope === "CHARACTER" ? campaign.characterId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      setMessage("キャンペーンを作成しました");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(id: string, active: boolean) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/revenue/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "エラー");
    } finally {
      setSaving(false);
    }
  }

  const platformPercent = Math.round((100 - Number(percent)) * 10) / 10;

  return (
    <div className="space-y-6">
      {message && (
        <p className="rounded-[14px] border border-[rgba(239,116,136,0.2)] bg-[#fff4f6] px-4 py-3 text-[13px] text-[#3a3330]">
          {message}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "総売上", value: formatYen(initial.totals.gross) },
          { label: "画师取り分", value: formatYen(initial.totals.creator) },
          { label: "プラットフォーム", value: formatYen(initial.totals.platform) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white px-4 py-3"
          >
            <div className="text-[11px] font-bold text-[#b0a099]">{item.label}</div>
            <div className="mt-1 font-display text-xl font-black text-[#3a3330]">{item.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-6">
        <h2 className="font-display text-lg font-black text-[#3a3330]">デフォルト分成</h2>
        <p className="mt-1 text-[13px] text-[#8a7a72]">
          未設定の画师・キャラは 5:5。ここでグローバル比率を変えられます。個別指定と限時加成が優先されます。
        </p>
        <form onSubmit={saveGlobal} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-bold text-[#5a4f48]">
            画师
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="ml-2 w-20 rounded-[10px] border border-[rgba(120,72,54,0.12)] px-2 py-1.5"
            />
            %
          </label>
          <span className="text-[13px] text-[#8a7a72]">プラットフォーム {platformPercent}%</span>
          <button type="submit" disabled={saving} className="btn-primary rounded-full px-4 py-2 text-sm disabled:opacity-50">
            保存
          </button>
        </form>
      </section>

      <section className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-6">
        <h2 className="font-display text-lg font-black text-[#3a3330]">限時キャンペーン</h2>
        <p className="mt-1 text-[13px] text-[#8a7a72]">
          期間中、該当範囲の画师取り分に加算します。同じ範囲に複数ある場合は、より具体的な指定（キャラ → 画师 → 全体）と高い加成を採用します。
        </p>
        <form onSubmit={createCampaign} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-bold text-[#8a7a72]">
            名前
            <input
              value={campaign.name}
              onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
              className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
            />
          </label>
          <label className="text-[12px] font-bold text-[#8a7a72]">
            画师加成（ポイント）
            <input
              type="number"
              min={0}
              max={100}
              value={campaign.bonusPercent}
              onChange={(e) => setCampaign({ ...campaign, bonusPercent: Number(e.target.value) })}
              className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
            />
          </label>
          <label className="text-[12px] font-bold text-[#8a7a72]">
            開始
            <input
              type="datetime-local"
              value={campaign.startsAt}
              onChange={(e) => setCampaign({ ...campaign, startsAt: e.target.value })}
              className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
            />
          </label>
          <label className="text-[12px] font-bold text-[#8a7a72]">
            終了
            <input
              type="datetime-local"
              value={campaign.endsAt}
              onChange={(e) => setCampaign({ ...campaign, endsAt: e.target.value })}
              className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
            />
          </label>
          <label className="text-[12px] font-bold text-[#8a7a72]">
            範囲
            <select
              value={campaign.scope}
              onChange={(e) =>
                setCampaign({ ...campaign, scope: e.target.value as typeof campaign.scope })
              }
              className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
            >
              <option value="GLOBAL">全体</option>
              <option value="CREATOR">画师</option>
              <option value="CHARACTER">キャラクター</option>
            </select>
          </label>
          {campaign.scope === "CREATOR" && (
            <label className="text-[12px] font-bold text-[#8a7a72]">
              画师
              <select
                value={campaign.creatorId}
                onChange={(e) => setCampaign({ ...campaign, creatorId: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
              >
                {initial.creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.email}
                  </option>
                ))}
              </select>
            </label>
          )}
          {campaign.scope === "CHARACTER" && (
            <label className="text-[12px] font-bold text-[#8a7a72]">
              キャラクター
              <select
                value={campaign.characterId}
                onChange={(e) => setCampaign({ ...campaign, characterId: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[13px] text-[#3a3330]"
              >
                {initial.characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary rounded-full px-4 py-2 text-sm disabled:opacity-50">
              キャンペーンを追加
            </button>
          </div>
        </form>

        <ul className="mt-5 space-y-2">
          {initial.campaigns.length === 0 && (
            <li className="text-[13px] text-[#b0a099]">まだキャンペーンはありません。</li>
          )}
          {initial.campaigns.map((item) => {
            const live =
              item.active && new Date(item.startsAt) <= new Date() && new Date(item.endsAt) >= new Date();
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[rgba(120,72,54,0.07)] bg-[#fbf4f1] px-3 py-2.5"
              >
                <div>
                  <div className="text-[13px] font-bold text-[#3a3330]">
                    {item.name}{" "}
                    <span className="text-[#ef7488]">+{formatSharePercent(item.bonusBps)}</span>
                  </div>
                  <div className="text-[11px] text-[#8a7a72]">
                    {item.scope} · {new Date(item.startsAt).toLocaleString("ja-JP")} →{" "}
                    {new Date(item.endsAt).toLocaleString("ja-JP")}
                    {live ? " · 開催中" : item.active ? " · 予定/終了" : " · 停止"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => toggleCampaign(item.id, !item.active)}
                  className="rounded-full border border-[rgba(120,72,54,0.12)] bg-white px-3 py-1 text-[12px] font-bold text-[#5a4f48]"
                >
                  {item.active ? "停止" : "再開"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-6">
        <h2 className="font-display text-lg font-black text-[#3a3330]">画师ごとの上書き</h2>
        <p className="mt-1 text-[13px] text-[#8a7a72]">空欄で保存するとグローバル比率に戻します。</p>
        <ul className="mt-4 space-y-2">
          {initial.creators.map((creator) => (
            <CreatorOverrideRow
              key={creator.id}
              creator={creator}
              disabled={saving}
              onSave={(value) => saveOverride({ creatorId: creator.id, creatorSharePercent: value })}
            />
          ))}
        </ul>
      </section>

      <section className="rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white p-6">
        <h2 className="font-display text-lg font-black text-[#3a3330]">最近の入金</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-[11px] text-[#b0a099]">
              <tr>
                <th className="pb-2 font-bold">日時</th>
                <th className="pb-2 font-bold">種別</th>
                <th className="pb-2 font-bold">画师 / キャラ</th>
                <th className="pb-2 font-bold">売上</th>
                <th className="pb-2 font-bold">画师</th>
                <th className="pb-2 font-bold">分成</th>
              </tr>
            </thead>
            <tbody>
              {initial.recent.map((row) => (
                <tr key={row.id} className="border-t border-[rgba(120,72,54,0.06)]">
                  <td className="py-2 text-[#8a7a72]">{new Date(row.createdAt).toLocaleString("ja-JP")}</td>
                  <td>{kindLabel(row.kind)}</td>
                  <td>
                    {row.creator.name ?? "—"} / {row.character.name}
                    {row.campaignName ? (
                      <div className="text-[11px] text-[#ef7488]">{row.campaignName}</div>
                    ) : null}
                  </td>
                  <td>{formatYen(row.grossAmount)}</td>
                  <td>{formatYen(row.creatorAmount)}</td>
                  <td>
                    {formatSharePercent(row.finalShareBps)}
                    {row.bonusBps > 0 ? `（+${formatSharePercent(row.bonusBps)}）` : ""}
                  </td>
                </tr>
              ))}
              {initial.recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#b0a099]">
                    まだ入金がありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CreatorOverrideRow({
  creator,
  disabled,
  onSave,
}: {
  creator: Creator;
  disabled: boolean;
  onSave: (percent: number | null) => void;
}) {
  const [value, setValue] = useState(
    creator.creatorShareBps === null ? "" : String(creator.creatorShareBps / 100),
  );
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] bg-[#fbf4f1] px-3 py-2.5">
      <div className="min-w-[160px] flex-1">
        <div className="text-[13px] font-bold text-[#3a3330]">{creator.name ?? creator.email}</div>
        <div className="text-[11px] text-[#8a7a72]">
          {creator.email} · {creator._count.characters} キャラ
        </div>
      </div>
      <input
        type="number"
        min={0}
        max={100}
        placeholder="デフォルト"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-[10px] border border-[rgba(120,72,54,0.12)] bg-white px-2 py-1.5 text-[13px]"
      />
      <span className="text-[12px] text-[#8a7a72]">%</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSave(value === "" ? null : Number(value))}
        className="rounded-full border border-[rgba(120,72,54,0.12)] bg-white px-3 py-1 text-[12px] font-bold"
      >
        保存
      </button>
    </li>
  );
}
