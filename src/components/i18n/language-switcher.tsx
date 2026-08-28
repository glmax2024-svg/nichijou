"use client";

import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { useLocale } from "@/components/i18n/locale-provider";

type LanguageSwitcherProps = {
  variant?: "compact" | "rows";
};

export function LanguageSwitcher({ variant = "compact" }: LanguageSwitcherProps) {
  const { locale, setLocale, dict } = useLocale();

  if (variant === "rows") {
    return (
      <div className="px-4 py-3">
        <div className="mb-2 text-[11px] font-bold text-[#b0a099]">
          {dict.common.systemLanguage}
        </div>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLocale(id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
                locale === id
                  ? "bg-[#3a3330] text-white"
                  : "border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
              }`}
            >
              {LOCALE_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{dict.common.language}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none rounded-full border border-[rgba(120,72,54,0.1)] bg-white py-1.5 pl-3 pr-8 text-[11px] font-bold text-[#5a4f48] outline-none transition hover:border-[rgba(239,116,136,0.25)]"
        aria-label={dict.common.language}
      >
        {LOCALES.map((id) => (
          <option key={id} value={id}>
            {LOCALE_LABELS[id]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-[10px] text-[#b0a099]">▾</span>
    </label>
  );
}
