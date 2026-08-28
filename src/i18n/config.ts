export const LOCALES = ["ja", "zh-Hant", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ja";

export const LOCALE_COOKIE = "nichijou-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  "zh-Hant": "繁體中文",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function htmlLang(locale: Locale): string {
  if (locale === "zh-Hant") return "zh-Hant";
  return locale;
}
