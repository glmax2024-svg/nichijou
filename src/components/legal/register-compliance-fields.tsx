"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export function RegisterComplianceFields({
  birthDate,
  acceptedTerms,
  onBirthDate,
  onAcceptedTerms,
  legalBasePath = "",
}: {
  birthDate: string;
  acceptedTerms: boolean;
  onBirthDate: (value: string) => void;
  onAcceptedTerms: (value: boolean) => void;
  legalBasePath?: "" | "/h5" | "/app";
}) {
  const { dict } = useLocale();
  const termsHref = `${legalBasePath}/legal/terms`;
  const privacyHref = `${legalBasePath}/legal/privacy`;

  return (
    <>
      <label className="mt-4 block text-xs font-bold text-[#8a7a72]">{dict.auth.birthDate}</label>
      <input
        type="date"
        required
        value={birthDate}
        onChange={(e) => onBirthDate(e.target.value)}
        className="mt-1.5 w-full rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3 text-sm outline-none"
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#b0a099]">{dict.auth.ageHint}</p>
      <label className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-[#5c524c]">
        <input
          type="checkbox"
          required
          checked={acceptedTerms}
          onChange={(e) => onAcceptedTerms(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          {dict.auth.termsAgreeBefore}
          <Link href={termsHref} className="font-bold text-[#ef7488] underline-offset-2 hover:underline">
            {dict.auth.terms}
          </Link>
          {dict.auth.termsAnd}
          <Link href={privacyHref} className="font-bold text-[#ef7488] underline-offset-2 hover:underline">
            {dict.auth.privacy}
          </Link>
          {dict.auth.termsAgreeAfter}
        </span>
      </label>
    </>
  );
}
