import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/i18n/config";

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  if (!raw) return DEFAULT_LOCALE;
  try {
    const decoded = decodeURIComponent(raw);
    return isLocale(decoded) ? decoded : isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  }
}
