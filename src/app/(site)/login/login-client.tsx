"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { RegisterComplianceFields } from "@/components/legal/register-compliance-fields";
import { BetaApplyForm } from "@/components/beta/beta-apply-form";

type Mode = "login" | "register" | "apply";

export default function LoginPageClient({
  inviteOnly = true,
}: {
  inviteOnly?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  // 审核通过后发出的链接形如 /login?invite=NJ-XXXX-XXXX，直接进入注册并填好邀请码
  const inviteFromLink = searchParams.get("invite") ?? "";
  // 内测期第二个 tab 是「β版に応募」；开放注册（NICHIJOU_INVITE_ONLY=false）后自动变回「新規登録」
  const secondTab: Mode = inviteOnly ? "apply" : "register";

  const [mode, setMode] = useState<Mode>(() => {
    if (inviteFromLink) return "register";
    const requested = searchParams.get("tab") ?? searchParams.get("mode");
    if (requested === "apply" || requested === "register") return secondTab;
    return "login";
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    birthDate: "",
    acceptedTerms: false,
    inviteCode: inviteFromLink,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
            birthDate: form.birthDate,
            acceptedTerms: form.acceptedTerms,
            inviteCode: form.inviteCode,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "登録に失敗しました");
        }
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) throw new Error("ログインに失敗しました");

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto flex max-w-[820px] items-center justify-center px-4 py-12">
        <div className="w-full overflow-hidden rounded-[30px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_30px_70px_-44px_rgba(120,72,54,0.5)]">
          <div className="grid min-h-[520px] md:grid-cols-2">
            <div
              className="relative flex flex-col overflow-hidden p-9"
              style={{ background: "linear-gradient(160deg,#ffd9df,#ffc4cf 45%,#c9d6f5)" }}
            >
              <div className="absolute -right-12 -top-16 h-[220px] w-[220px] rounded-full bg-white/30" />
              <div className="absolute -left-10 bottom-10 h-[150px] w-[150px] rounded-full bg-white/20" />
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-white shadow-[0_8px_16px_-8px_rgba(239,116,136,0.6)]">
                  <MIcon name="favorite" className="animate-soft-pulse text-[24px] text-[#ef7488]" />
                </div>
                <span className="font-display text-2xl font-black text-[#3a2a2e]">日常</span>
                {inviteOnly && (
                  <span className="ml-1 rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-[#ef7488]">
                    CLOSED BETA
                  </span>
                )}
              </div>
              <div className="relative mt-auto">
                <h2 className="font-display text-[30px] font-black leading-[1.35] text-[#3a2a2e]">
                  推しの「日常」を、
                  <br />
                  あなたのそばに。
                </h2>
                <p className="mt-3.5 text-sm leading-relaxed text-[#6a4a52]">
                  画师が創る AI キャラクターと、
                  <br />
                  チャット・ギフト・声で毎日をいっしょに。
                </p>
              </div>
            </div>

            <div className="flex flex-col p-9 sm:p-10">
              <div className="flex w-fit gap-1.5 rounded-[14px] bg-[#f4ece8] p-1.5">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-[10px] px-5 py-2 font-display text-sm font-bold transition ${
                    mode === "login"
                      ? "bg-white text-[#3a3330] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)]"
                      : "text-[#8a7a72]"
                  }`}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => setMode(secondTab)}
                  className={`rounded-[10px] px-5 py-2 font-display text-sm font-bold transition ${
                    mode === secondTab
                      ? "bg-white text-[#3a3330] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)]"
                      : "text-[#8a7a72]"
                  }`}
                >
                  {inviteOnly ? "β版に応募" : "新規登録"}
                </button>
              </div>

              <h3 className="mt-6 font-display text-[22px] font-black text-[#3a3330]">
                {mode === "login" ? "おかえりなさい" : mode === "apply" ? "β版テスター募集中" : "はじめまして"}
              </h3>
              <p className="mt-1 text-[13px] text-[#b0a099]">
                {mode === "login"
                  ? "メールアドレスでログイン"
                  : mode === "apply"
                    ? "審査のうえ、招待コードをお送りします"
                    : inviteOnly
                      ? "招待コードでアカウントを作成"
                      : "アカウントを作成"}
              </p>

              {mode === "apply" ? (
                <div className="mt-5">
                  <BetaApplyForm onHaveCode={() => setMode("register")} onBackToLogin={() => setMode("login")} />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col">
                  {mode === "register" && (
                    <>
                      {inviteOnly && (
                        <>
                          <label className="text-xs font-bold text-[#8a7a72]">招待コード</label>
                          <div className="mb-4 mt-1.5 flex items-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3">
                            <MIcon name="key" className="text-[20px] text-[#c2b4ac]" />
                            <input
                              type="text"
                              required
                              autoCapitalize="characters"
                              autoComplete="off"
                              spellCheck={false}
                              value={form.inviteCode}
                              onChange={(e) => setForm({ ...form, inviteCode: e.target.value })}
                              className="flex-1 bg-transparent font-mono text-sm tracking-wider outline-none"
                              placeholder="NJ-XXXX-XXXX"
                            />
                          </div>
                        </>
                      )}
                      <label className="text-xs font-bold text-[#8a7a72]">表示名</label>
                      <div className="mt-1.5 flex items-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3">
                        <MIcon name="person" className="text-[20px] text-[#c2b4ac]" />
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="flex-1 bg-transparent text-sm outline-none"
                          placeholder="ゆい"
                        />
                      </div>
                      <RegisterComplianceFields
                        birthDate={form.birthDate}
                        acceptedTerms={form.acceptedTerms}
                        onBirthDate={(birthDate) => setForm({ ...form, birthDate })}
                        onAcceptedTerms={(acceptedTerms) => setForm({ ...form, acceptedTerms })}
                      />
                    </>
                  )}

                  <label className="mt-4 text-xs font-bold text-[#8a7a72]">メールアドレス</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3">
                    <MIcon name="mail" className="text-[20px] text-[#c2b4ac]" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="flex-1 bg-transparent text-sm outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <label className="mt-4 text-xs font-bold text-[#8a7a72]">パスワード</label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3">
                    <MIcon name="lock" className="text-[20px] text-[#c2b4ac]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="flex-1 bg-transparent text-sm outline-none"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#c2b4ac]"
                    >
                      <MIcon name={showPassword ? "visibility" : "visibility_off"} className="text-[20px]" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary mt-5 w-full rounded-[15px] py-3.5 text-[15px] transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? "処理中…" : mode === "login" ? "ログイン" : "登録する"}
                  </button>
                </form>
              )}

              {inviteOnly && mode === "login" && (
                <p className="mt-5 text-center text-[13px] text-[#8a7a72]">
                  アカウントをお持ちでない方は
                  <button type="button" onClick={() => setMode("apply")} className="ml-1 font-bold text-[#ef7488] hover:underline">
                    β版テスターに応募
                  </button>
                </p>
              )}

              {inviteOnly && mode === "register" && (
                <p className="mt-4 text-center text-[13px] text-[#8a7a72]">
                  招待コードをお持ちでない方は
                  <button type="button" onClick={() => setMode("apply")} className="ml-1 font-bold text-[#ef7488] hover:underline">
                    β版に応募
                  </button>
                </p>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* 内测期未登录看不到首页，这个链接只会跳回登录页 */}
      {!inviteOnly && (
        <div className="relative z-10 pb-8 text-center">
          <Link href="/" className="text-sm text-[#b0a099] hover:text-[#ef7488]">
            ← トップに戻る
          </Link>
        </div>
      )}
    </div>
  );
}
