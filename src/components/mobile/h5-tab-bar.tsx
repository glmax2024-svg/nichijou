"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type H5TabBarProps = {
  basePath: "/h5" | "/app";
};

const HIDDEN_SUFFIXES = ["/login", "/settings", "/gifts", "/orders", "/help"];

export function H5TabBar({ basePath }: H5TabBarProps) {
  const pathname = usePathname();
  const { dict } = useLocale();

  if (
    pathname.includes("/characters/") ||
    HIDDEN_SUFFIXES.some((suffix) => pathname.endsWith(suffix))
  ) {
    return null;
  }

  const tabs = [
    { href: basePath, icon: "home", label: dict.nav.home, exact: true },
    { href: `${basePath}/discover`, icon: "auto_awesome", label: dict.nav.discover },
    { href: `${basePath}/messages`, icon: "mail", label: dict.nav.messages },
    { href: `${basePath}/me`, icon: "person", label: dict.nav.me },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-[rgba(120,72,54,0.08)] bg-[rgba(255,255,255,0.98)] shadow-[0_-8px_24px_-18px_rgba(120,72,54,0.35)] backdrop-blur-[12px]">
      <div className="mx-auto flex w-full max-w-[560px] items-center justify-around px-2 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ href, icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 ${
                active ? "text-[#ef7488]" : "text-[#b0a099]"
              }`}
            >
              <MIcon name={icon} className="text-[26px]" filled={active} />
              <span className={`truncate text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
