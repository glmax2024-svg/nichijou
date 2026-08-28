"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { Locale } from "@/i18n/config";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <SessionProvider>
      <LocaleProvider key={locale} initialLocale={locale}>
        {children}
      </LocaleProvider>
    </SessionProvider>
  );
}
