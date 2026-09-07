"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";
import { RegisterComplianceFields } from "@/components/legal/register-compliance-fields";

export function MobileLoginForm({
  defaultCallbackUrl = "/h5",
  embedded = false,
  showDemoHints = false,
  legalBasePath = "/h5",
}: {
  defaultCallbackUrl?: string;
  embedded?: boolean;
  showDemoHints?: boolean;
  legalBasePath?: "" | "/h5" | "/app";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? defaultCallbackUrl;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    birthDate: "",
    acceptedTerms: false,
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
    <div
      className={`flex w-full flex-col ${
        embedded ? "min-h-[calc(100dvh-72px-env(safe-area-inset-bottom))]" : "min-h-[100dvh]"
      }`}
      style={{ background: "linear-gradient(170deg,#ffd9df,#ffc4cf 38%,#fbf4f1 62%)" }}
    >
      <div className="relative w-full overflow-hidden px-[26px] pb-5 pt-[30px]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/28" />
        <div className="relative flex items-center gap-2">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-white shadow-[0_8px_16px_-8px_rgba(239,116,136,0.6)]">
            <MIcon name="favorite" className="text-[22px] text-[#ef7488]" />
          </div>
          <span className="font-display text-[22px] font-black text-[#3a2a2e]">日常</span>
        </div>
        <h2 className="relative mt-[22px] font-display text-[23px] font-black leading-[1.4] text-[#3a2a2e]">
          推しの「日常」を、
          <br />
          あなたのそばに。
        </h2>
      </div>

      <div className="flex w-full flex-1 flex-col rounded-t-[30px] bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[26px] shadow-[0_-14px_34px_-20px_rgba(120,72,54,0.4)]">
        <div className="flex w-fit gap-1.5 rounded-[13px] bg-[#f4ece8] p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-[10px] px-[18px] py-[7px] font-display text-[13px] font-bold ${
              mode === "login"
                ? "bg-white text-[#3a3330] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)]"
                : "text-[#8a7a72]"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-[10px] px-[18px] py-[7px] font-display text-[13px] font-bold ${
              mode === "register"
                ? "bg-white text-[#3a3330] shadow-[0_4px_10px_-6px_rgba(0,0,0,0.2)]"
                : "text-[#8a7a72]"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label className="mt-5 block text-xs font-bold text-[#8a7a72]">表示名</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-[13px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-3.5 py-3">
                <MIcon name="person" className="text-[19px] text-[#c2b4ac]" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="flex-1 bg-transparent text-[13.5px] outline-none"
                  placeholder="ゆい"
                />
              </div>
              <RegisterComplianceFields
                birthDate={form.birthDate}
                acceptedTerms={form.acceptedTerms}
                onBirthDate={(birthDate) => setForm({ ...form, birthDate })}
                onAcceptedTerms={(acceptedTerms) => setForm({ ...form, acceptedTerms })}
                legalBasePath={legalBasePath}
              />
            </>
          )}

          <label className="mt-5 block text-xs font-bold text-[#8a7a72]">メールアドレス</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-[13px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-3.5 py-3">
            <MIcon name="mail" className="text-[19px] text-[#c2b4ac]" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="flex-1 bg-transparent text-[13.5px] outline-none"
              placeholder="fan@demo.jp"
            />
          </div>

          <label className="mt-3.5 block text-xs font-bold text-[#8a7a72]">パスワード</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-[13px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-3.5 py-3">
            <MIcon name="lock" className="text-[19px] text-[#c2b4ac]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="flex-1 bg-transparent text-[13.5px] outline-none"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#c2b4ac]"
            >
              <MIcon name={showPassword ? "visibility" : "visibility_off"} className="text-[19px]" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-5 w-full rounded-[15px] py-3.5 text-[15px] shadow-[0_14px_26px_-12px_rgba(239,116,136,0.8)] disabled:opacity-50"
          >
            {loading ? "処理中…" : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        {mode === "login" && showDemoHints && (
          <p className="mt-4 text-center text-[11.5px] leading-[1.7] text-[#b0a099]">
            デモ: fan@demo.jp / demo123
          </p>
        )}
      </div>
    </div>
  );
}
