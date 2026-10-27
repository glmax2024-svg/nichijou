"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type FieldName =
  | "nickname"
  | "userType"
  | "twitter"
  | "pixiv"
  | "contactType"
  | "contactValue"
  | "email"
  | "intro"
  | "isAdult"
  | "acceptedPrivacy";

const CONTACT_VALUES = ["LINE", "DISCORD", "X_DM", "OTHER"] as const;

const INTRO_MAX = 1000;

const inputBox =
  "mt-1.5 flex items-center gap-2 rounded-[14px] border bg-[#faf5f2] px-4 py-3 transition focus-within:border-[#ef7488]";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <label className="text-xs font-bold text-[#8a7a72]">{label}</label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] font-bold text-[#d64a61]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-[#b0a099]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * β版テスター応募フォーム。ログイン画面の「β版に応募」タブと、モバイルのログイン画面で共用。
 */
export function BetaApplyForm({
  onHaveCode,
  onBackToLogin,
}: {
  /** 招待コードを既に持っている人を登録フォームへ */
  onHaveCode?: () => void;
  /** 送信完了後にログインタブへ戻す */
  onBackToLogin?: () => void;
}) {
  const { dict } = useLocale();
  const topRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    nickname: "",
    userType: "FAN" as "FAN" | "CREATOR",
    twitter: "",
    pixiv: "",
    contactType: "LINE" as (typeof CONTACT_VALUES)[number],
    contactValue: "",
    email: "",
    intro: "",
    isAdult: false,
    acceptedPrivacy: false,
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const contactOptions = useMemo(
    () =>
      [
        { value: "LINE" as const, label: "LINE", placeholder: "LINE ID" },
        { value: "DISCORD" as const, label: "Discord", placeholder: dict.auth.contactDiscordPlaceholder },
        { value: "X_DM" as const, label: dict.auth.contactXdm, placeholder: "@your_id" },
        { value: "OTHER" as const, label: dict.auth.contactOther, placeholder: dict.auth.contactOtherPlaceholder },
      ] as const,
    [dict],
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const border = (name: FieldName) =>
    errors[name] ? "border-[#e98a9a]" : "border-[rgba(120,72,54,0.1)]";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.twitter.trim() && !form.pixiv.trim()) {
      setErrors({ twitter: dict.auth.snsRequired });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/beta/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.field) setErrors({ [data.field as FieldName]: data.error });
        else setFormError(data.error ?? dict.auth.submitFailed);
        return;
      }
      setDone(true);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setFormError(dict.auth.networkFailed);
    } finally {
      setLoading(false);
    }
  }

  const contact = contactOptions.find((o) => o.value === form.contactType)!;

  return (
    <div ref={topRef} className="scroll-mt-24">
      {done ? (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f2]">
            <MIcon name="mark_email_read" className="text-[30px] text-[#ef7488]" />
          </div>
          <h2 className="mt-4 font-display text-xl font-black text-[#3a3330]">{dict.auth.applyDoneTitle}</h2>
          <p className="mx-auto mt-3 max-w-[380px] text-sm leading-relaxed text-[#8a7a72]">
            {dict.auth.applyDoneBody}
            <br />
            <span className="font-bold text-[#3a3330]">{form.email}</span> {dict.auth.applyDoneBodyAfter}
          </p>
          <p className="mx-auto mt-3 max-w-[380px] text-[12px] leading-relaxed text-[#b0a099]">
            {dict.auth.applyDoneHint}
          </p>
          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-7 inline-block rounded-[14px] bg-[#f4ece8] px-6 py-3 text-sm font-bold text-[#3a3330] hover:bg-[#efe3dd]"
            >
              {dict.auth.backToLogin}
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Field label={dict.auth.nickname} error={errors.nickname}>
            <div className={`${inputBox} ${border("nickname")}`}>
              <MIcon name="person" className="text-[20px] text-[#c2b4ac]" />
              <input
                type="text"
                required
                maxLength={40}
                value={form.nickname}
                onChange={(e) => set("nickname", e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder={dict.auth.displayNamePlaceholder}
              />
            </div>
          </Field>

          <Field label={dict.auth.howToJoin} error={errors.userType}>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  { value: "FAN", icon: "favorite", title: dict.auth.fan, sub: dict.auth.fanSub },
                  { value: "CREATOR", icon: "brush", title: dict.auth.creator, sub: dict.auth.creatorSub },
                ] as const
              ).map((opt) => {
                const active = form.userType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("userType", opt.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3 text-left transition ${
                      active
                        ? "border-[#ef7488] bg-[#fff4f6]"
                        : "border-[rgba(120,72,54,0.1)] bg-[#faf5f2] hover:border-[rgba(239,116,136,0.4)]"
                    }`}
                  >
                    <MIcon
                      name={opt.icon}
                      className={`text-[22px] ${active ? "text-[#ef7488]" : "text-[#c2b4ac]"}`}
                    />
                    <span>
                      <span className="block text-sm font-bold text-[#3a3330]">{opt.title}</span>
                      <span className="block text-[11px] text-[#b0a099]">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="mt-6 rounded-[18px] bg-[#fbf7f5] p-4">
            <p className="text-xs font-bold text-[#8a7a72]">
              {dict.auth.snsTitle}
              <span className="ml-1.5 font-normal text-[#b0a099]">{dict.auth.snsOneRequired}</span>
            </p>
            <Field label="" error={errors.twitter}>
              <div className={`${inputBox} bg-white ${border("twitter")}`}>
                <span className="w-[20px] text-center text-[15px] font-black text-[#3a3330]">𝕏</span>
                <input
                  type="text"
                  value={form.twitter}
                  onChange={(e) => set("twitter", e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder={dict.auth.twitterPlaceholder}
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
            </Field>
            <Field label="" error={errors.pixiv}>
              <div className={`${inputBox} mt-2.5 bg-white ${border("pixiv")}`}>
                <span className="w-[20px] text-center text-[13px] font-black text-[#0096fa]">P</span>
                <input
                  type="url"
                  value={form.pixiv}
                  onChange={(e) => set("pixiv", e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="https://www.pixiv.net/users/12345678"
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
            </Field>
          </div>

          <Field label={dict.auth.contact} hint={dict.auth.contactHint} error={errors.contactValue}>
            <div className="mt-1.5 flex gap-2">
              <select
                value={form.contactType}
                onChange={(e) => set("contactType", e.target.value as typeof form.contactType)}
                className="rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-3 text-sm font-bold text-[#3a3330] outline-none focus:border-[#ef7488]"
                aria-label={dict.auth.contactMethod}
              >
                {contactOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className={`${inputBox} mt-0 flex-1 ${border("contactValue")}`}>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.contactValue}
                  onChange={(e) => set("contactValue", e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder={contact.placeholder}
                  autoCapitalize="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </Field>

          <Field label={dict.auth.email} hint={dict.auth.emailHint} error={errors.email}>
            <div className={`${inputBox} ${border("email")}`}>
              <MIcon name="mail" className="text-[20px] text-[#c2b4ac]" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="you@example.com"
                autoCapitalize="off"
              />
            </div>
          </Field>

          <Field label={dict.auth.intro} error={errors.intro}>
            <div className={`mt-1.5 rounded-[14px] border bg-[#faf5f2] px-4 py-3 transition focus-within:border-[#ef7488] ${border("intro")}`}>
              <textarea
                required
                rows={5}
                maxLength={INTRO_MAX}
                value={form.intro}
                onChange={(e) => set("intro", e.target.value)}
                className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                placeholder={form.userType === "CREATOR" ? dict.auth.introCreator : dict.auth.introFan}
              />
              <p className="text-right text-[11px] tabular-nums text-[#c2b4ac]">
                {form.intro.length} / {INTRO_MAX}
              </p>
            </div>
          </Field>

          <div className="mt-6 flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#6a4a52]">
              <input
                type="checkbox"
                checked={form.isAdult}
                onChange={(e) => set("isAdult", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#ef7488]"
              />
              {dict.auth.isAdult}
            </label>
            {errors.isAdult && <p className="text-[12px] font-bold text-[#d64a61]">{errors.isAdult}</p>}
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[#6a4a52]">
              <input
                type="checkbox"
                checked={form.acceptedPrivacy}
                onChange={(e) => set("acceptedPrivacy", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#ef7488]"
              />
              <span>
                <Link href="/legal/privacy" target="_blank" className="font-bold text-[#ef7488] underline-offset-2 hover:underline">
                  {dict.auth.privacy}
                </Link>
                {dict.auth.privacyAgreeAfter}
              </span>
            </label>
            {errors.acceptedPrivacy && (
              <p className="text-[12px] font-bold text-[#d64a61]">{errors.acceptedPrivacy}</p>
            )}
          </div>

          {formError && (
            <p className="mt-5 rounded-[12px] bg-[#fff0f2] px-4 py-3 text-[13px] font-bold text-[#d64a61]" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-6 w-full rounded-[15px] py-3.5 text-[15px] transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? dict.auth.sending : dict.auth.applySubmit}
          </button>

          {onHaveCode && (
            <p className="mt-4 text-center text-[13px] text-[#8a7a72]">
              {dict.auth.haveCode}
              <button type="button" onClick={onHaveCode} className="ml-1 font-bold text-[#ef7488] hover:underline">
                {dict.auth.registerHere}
              </button>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
