import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/ja";
import ja from "./dictionaries/ja";
import zhHant from "./dictionaries/zh-Hant";
import en from "./dictionaries/en";

const DICTS: Record<Locale, Dictionary> = {
  ja,
  "zh-Hant": zhHant,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale] ?? DICTS.ja;
}

type Params = Record<string, string | number>;

export function formatMessage(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}
