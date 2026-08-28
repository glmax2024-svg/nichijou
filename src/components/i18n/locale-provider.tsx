"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  htmlLang,
  isLocale,
  type Locale,
} from "@/i18n/config";
import { formatMessage, getDictionary } from "@/i18n";
import type { Dictionary } from "@/i18n/dictionaries/ja";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (template: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );

  // Keep client locale in sync when server re-renders after cookie change
  useEffect(() => {
    if (isLocale(initialLocale) && initialLocale !== locale) {
      setLocaleState(initialLocale);
      document.documentElement.lang = htmlLang(initialLocale);
    }
    // Only react to server-provided locale changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      setLocaleState(next);
      writeLocaleCookie(next);
      document.documentElement.lang = htmlLang(next);
      // Server Components (Header / Feed / Settings) read the cookie on refresh
      router.refresh();
    },
    [router],
  );

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback(
    (template: string, params?: Record<string, string | number>) =>
      formatMessage(template, params),
    [],
  );

  const value = useMemo(
    () => ({ locale, dict, setLocale, t }),
    [locale, dict, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
