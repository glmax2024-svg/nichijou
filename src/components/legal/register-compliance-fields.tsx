"use client";

import Link from "next/link";

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
  const termsHref = `${legalBasePath}/legal/terms`;
  const privacyHref = `${legalBasePath}/legal/privacy`;

  return (
    <>
      <label className="mt-4 block text-xs font-bold text-[#8a7a72]">生年月日</label>
      <input
        type="date"
        required
        value={birthDate}
        onChange={(e) => onBirthDate(e.target.value)}
        className="mt-1.5 w-full rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-[#faf5f2] px-4 py-3 text-sm outline-none"
      />
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#b0a099]">
        本サービスは満18歳以上の方限定です。生年月日は年齢確認のみに使用します。
      </p>
      <label className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-[#5c524c]">
        <input
          type="checkbox"
          required
          checked={acceptedTerms}
          onChange={(e) => onAcceptedTerms(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          私は18歳以上であり、
          <Link href={termsHref} className="font-bold text-[#ef7488] underline-offset-2 hover:underline">
            利用規約
          </Link>
          および
          <Link href={privacyHref} className="font-bold text-[#ef7488] underline-offset-2 hover:underline">
            プライバシーポリシー
          </Link>
          に同意します。
        </span>
      </label>
    </>
  );
}
