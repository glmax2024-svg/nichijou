"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";

type Role = "FAN" | "CREATOR" | "ADMIN";
type Status = "PENDING" | "APPROVED" | "REJECTED";

type ApplicationRow = {
  id: string;
  email: string;
  nickname: string;
  userType: Role;
  twitterUrl: string | null;
  pixivUrl: string | null;
  contactType: string;
  contactValue: string;
  intro: string;
  status: Status;
  reviewNote: string | null;
  createdAt: string;
  invite: { code: string; used: boolean; expiresAt: string | null; revoked: boolean } | null;
};

type InviteRow = {
  id: string;
  code: string;
  note: string | null;
  grantRole: Role;
  email: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  users: string[];
};

const CONTACT_LABEL: Record<string, string> = { LINE: "LINE", DISCORD: "Discord", X_DM: "X DM", OTHER: "その他" };
const ROLE_LABEL: Record<Role, string> = { FAN: "ファン", CREATOR: "絵師", ADMIN: "管理者" };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function inviteLink(code: string) {
  return `${window.location.origin}/login?invite=${encodeURIComponent(code)}`;
}

function inviteMessage(nickname: string, code: string, expiresAt: string | null) {
  const until = expiresAt ? new Date(expiresAt).toLocaleDateString("ja-JP") : null;
  return [
    `${nickname} さん`,
    "",
    "日常 Nichijou β版テストへのご応募ありがとうございます。",
    "テスターとしてご招待します。以下のリンクから登録してください。",
    "",
    inviteLink(code),
    "",
    `招待コード: ${code}`,
    until ? `有効期限: ${until}` : null,
    "※ 応募時のメールアドレスでのみ登録できます。",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="inline-flex items-center gap-1 rounded-[10px] bg-[#f4ece8] px-3 py-1.5 text-[12px] font-bold text-[#3a3330] hover:bg-[#efe3dd]"
    >
      <MIcon name={copied ? "check" : "content_copy"} className="text-[15px]" />
      {copied ? "コピーしました" : label}
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const style = {
    PENDING: "bg-[#fff4d6] text-[#a8740b]",
    APPROVED: "bg-[#e3f5ea] text-[#2c8a55]",
    REJECTED: "bg-[#f1ecea] text-[#8a7a72]",
  }[status];
  const label = { PENDING: "審査待ち", APPROVED: "承認済み", REJECTED: "却下" }[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style}`}>{label}</span>;
}

function ApplicationCard({ app, onDone }: { app: ApplicationRow; onDone: () => void }) {
  const [grantRole, setGrantRole] = useState<"FAN" | "CREATOR">(app.userType === "CREATOR" ? "CREATOR" : "FAN");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function review(action: "approve" | "reject") {
    if (action === "reject" && !window.confirm(`${app.nickname} さんの応募を却下しますか？`)) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/beta/applications/${app.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { action, grantRole, note: note || undefined } : { action, note: note || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "処理に失敗しました");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-[20px] border border-[rgba(120,72,54,0.08)] bg-white p-5 shadow-[0_14px_30px_-26px_rgba(120,72,54,0.6)]">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-[17px] font-black text-[#3a3330]">{app.nickname}</h3>
        <span className="rounded-full bg-[#faf5f2] px-2.5 py-0.5 text-[11px] font-bold text-[#8a7a72]">
          {app.userType === "CREATOR" ? "絵師として応募" : "ファンとして応募"}
        </span>
        <StatusPill status={app.status} />
        <span className="ml-auto text-[12px] tabular-nums text-[#b0a099]">{fmtDate(app.createdAt)}</span>
      </header>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[auto_1fr]">
        <dt className="font-bold text-[#b0a099]">メール</dt>
        <dd className="break-all text-[#3a3330]">{app.email}</dd>
        <dt className="font-bold text-[#b0a099]">連絡先</dt>
        <dd className="break-all text-[#3a3330]">
          <span className="mr-1.5 text-[#8a7a72]">{CONTACT_LABEL[app.contactType] ?? app.contactType}</span>
          {app.contactValue}
        </dd>
        <dt className="font-bold text-[#b0a099]">SNS</dt>
        <dd className="flex flex-wrap gap-3">
          {app.twitterUrl && (
            <a href={app.twitterUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-[#3a3330] hover:text-[#ef7488] hover:underline">
              𝕏 {app.twitterUrl.replace("https://x.com/", "@")}
            </a>
          )}
          {app.pixivUrl && (
            <a href={app.pixivUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-[#0096fa] hover:underline">
              pixiv ↗
            </a>
          )}
        </dd>
      </dl>

      <p className="mt-3 whitespace-pre-wrap rounded-[14px] bg-[#faf5f2] px-4 py-3 text-[13px] leading-relaxed text-[#6a4a52]">
        {app.intro}
      </p>

      {app.status === "PENDING" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={grantRole}
            onChange={(e) => setGrantRole(e.target.value as "FAN" | "CREATOR")}
            className="rounded-[10px] border border-[rgba(120,72,54,0.12)] bg-white px-2.5 py-2 text-[13px] font-bold text-[#3a3330]"
            aria-label="付与する権限"
          >
            <option value="FAN">ファンとして招待</option>
            <option value="CREATOR">絵師として招待</option>
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意・応募者には見えません）"
            className="min-w-[180px] flex-1 rounded-[10px] border border-[rgba(120,72,54,0.12)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#ef7488]"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => review("reject")}
            className="rounded-[10px] px-4 py-2 text-[13px] font-bold text-[#8a7a72] hover:bg-[#f4ece8] disabled:opacity-50"
          >
            {busy === "reject" ? "処理中…" : "却下"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => review("approve")}
            className="btn-primary rounded-[10px] px-5 py-2 text-[13px] disabled:opacity-50"
          >
            {busy === "approve" ? "発行中…" : "承認してコード発行"}
          </button>
          {error && <p className="w-full text-[12px] font-bold text-[#d64a61]">{error}</p>}
        </div>
      )}

      {app.status === "APPROVED" && app.invite && (
        <div className="mt-4 rounded-[14px] border border-dashed border-[rgba(44,138,85,0.35)] bg-[#f4fbf6] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-[15px] font-bold tracking-wider text-[#2c8a55]">{app.invite.code}</code>
            <span className="text-[12px] text-[#6a8a75]">
              {app.invite.revoked
                ? "無効化済み"
                : app.invite.used
                  ? "登録済み"
                  : app.invite.expiresAt
                    ? `未使用 · ${new Date(app.invite.expiresAt).toLocaleDateString("ja-JP")} まで`
                    : "未使用"}
            </span>
            {!app.invite.used && !app.invite.revoked && (
              <span className="ml-auto flex flex-wrap gap-2">
                <CopyButton text={inviteLink(app.invite.code)} label="登録リンク" />
                <CopyButton text={inviteMessage(app.nickname, app.invite.code, app.invite.expiresAt)} label="招待メッセージ" />
              </span>
            )}
          </div>
        </div>
      )}

      {app.reviewNote && <p className="mt-2 text-[12px] text-[#b0a099]">メモ: {app.reviewNote}</p>}
    </article>
  );
}

function CreateInviteForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ note: "", grantRole: "FAN" as "FAN" | "CREATOR", email: "", maxUses: 1, expiresInDays: 14 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "発行に失敗しました");
      setForm((f) => ({ ...f, note: "", email: "" }));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "発行に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-[10px] border border-[rgba(120,72,54,0.12)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#ef7488]";
  return (
    <form onSubmit={submit} className="rounded-[20px] border border-[rgba(120,72,54,0.08)] bg-white p-5">
      <h3 className="font-display text-[15px] font-black text-[#3a3330]">招待コードを直接発行</h3>
      <p className="mt-0.5 text-[12px] text-[#b0a099]">知り合いや提携絵師に。メールを指定するとそのアドレス専用になります。</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1.4fr_auto_auto_auto_auto]">
        <input className={input} placeholder="メモ（誰向けか）" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <input className={input} type="email" placeholder="メール（任意）" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className={input} value={form.grantRole} onChange={(e) => setForm({ ...form, grantRole: e.target.value as "FAN" | "CREATOR" })} aria-label="権限">
          <option value="FAN">ファン</option>
          <option value="CREATOR">絵師</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-[#8a7a72]">
          回数
          <input className={`${input} w-16`} type="number" min={1} max={500} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) || 1 })} />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-[#8a7a72]">
          日数
          <input className={`${input} w-16`} type="number" min={1} max={365} value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) || 14 })} />
        </label>
        <button type="submit" disabled={busy} className="btn-primary rounded-[10px] px-4 py-2 text-[13px] disabled:opacity-50">
          {busy ? "発行中…" : "発行"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] font-bold text-[#d64a61]">{error}</p>}
    </form>
  );
}

function InviteTable({ invites, onDone }: { invites: InviteRow[]; onDone: () => void }) {
  // 渲染期间不能直接调 Date.now()；取一次挂载时间即可（刷新后会重新计算）
  const [now] = useState(() => Date.now());
  async function revoke(invite: InviteRow) {
    if (!window.confirm(`${invite.code} を無効化しますか？（登録済みのアカウントには影響しません）`)) return;
    const res = await fetch(`/api/admin/invites/${invite.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "無効化に失敗しました");
      return;
    }
    onDone();
  }

  if (invites.length === 0) {
    return <p className="rounded-[20px] bg-white px-5 py-10 text-center text-sm text-[#b0a099]">まだ招待コードはありません</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[rgba(120,72,54,0.08)] bg-white">
      <table className="w-full min-w-[760px] text-left text-[13px]">
        <thead className="border-b border-[rgba(120,72,54,0.08)] text-[11px] font-bold text-[#b0a099]">
          <tr>
            <th className="px-4 py-3">コード</th>
            <th className="px-4 py-3">メモ / 対象</th>
            <th className="px-4 py-3">権限</th>
            <th className="px-4 py-3 text-right">使用</th>
            <th className="px-4 py-3">期限</th>
            <th className="px-4 py-3">登録者</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => {
            const expired = invite.expiresAt ? new Date(invite.expiresAt).getTime() < now : false;
            const exhausted = invite.usedCount >= invite.maxUses;
            const active = !invite.revokedAt && !expired && !exhausted;
            return (
              <tr key={invite.id} className={`border-b border-[rgba(120,72,54,0.05)] last:border-0 ${active ? "" : "text-[#b0a099]"}`}>
                <td className="px-4 py-3">
                  <code className={`font-mono font-bold tracking-wider ${active ? "text-[#3a3330]" : "line-through"}`}>{invite.code}</code>
                </td>
                <td className="px-4 py-3">
                  <div>{invite.note || "—"}</div>
                  {invite.email && <div className="text-[11px] text-[#b0a099]">{invite.email} 専用</div>}
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[invite.grantRole]}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {invite.usedCount} / {invite.maxUses}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {invite.revokedAt ? "無効化" : invite.expiresAt ? `${new Date(invite.expiresAt).toLocaleDateString("ja-JP")}${expired ? "（期限切れ）" : ""}` : "無期限"}
                </td>
                <td className="px-4 py-3">{invite.users.length ? invite.users.join("、") : "—"}</td>
                <td className="px-4 py-3">
                  {active && (
                    <span className="flex justify-end gap-1.5">
                      <CopyButton text={inviteLink(invite.code)} label="リンク" />
                      <button type="button" onClick={() => revoke(invite)} className="rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold text-[#8a7a72] hover:bg-[#f4ece8]">
                        無効化
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdminBetaPanel({ applications, invites }: { applications: ApplicationRow[]; invites: InviteRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Status | "INVITES">("PENDING");
  const refresh = () => router.refresh();

  const counts = useMemo(
    () => ({
      PENDING: applications.filter((a) => a.status === "PENDING").length,
      APPROVED: applications.filter((a) => a.status === "APPROVED").length,
      REJECTED: applications.filter((a) => a.status === "REJECTED").length,
    }),
    [applications],
  );
  const visible = tab === "INVITES" ? [] : applications.filter((a) => a.status === tab);

  const tabs: { key: Status | "INVITES"; label: string; count?: number }[] = [
    { key: "PENDING", label: "審査待ち", count: counts.PENDING },
    { key: "APPROVED", label: "承認済み", count: counts.APPROVED },
    { key: "REJECTED", label: "却下", count: counts.REJECTED },
    { key: "INVITES", label: "招待コード", count: invites.length },
  ];

  return (
    <div>
      <div className="flex w-fit flex-wrap gap-1.5 rounded-[14px] bg-[#f4ece8] p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-[10px] px-4 py-2 font-display text-sm font-bold transition ${
              tab === t.key ? "bg-white text-[#3a3330] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)]" : "text-[#8a7a72]"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 tabular-nums ${t.key === "PENDING" && t.count > 0 ? "text-[#ef7488]" : "text-[#b0a099]"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {tab === "INVITES" ? (
          <>
            <CreateInviteForm onDone={refresh} />
            <InviteTable invites={invites} onDone={refresh} />
          </>
        ) : visible.length === 0 ? (
          <p className="rounded-[20px] bg-white px-5 py-10 text-center text-sm text-[#b0a099]">
            {tab === "PENDING" ? "審査待ちの応募はありません" : "該当する応募はありません"}
          </p>
        ) : (
          visible.map((app) => <ApplicationCard key={app.id} app={app} onDone={refresh} />)
        )}
      </div>
    </div>
  );
}
