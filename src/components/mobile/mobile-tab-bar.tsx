"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type MobileTabBarProps = {
  basePath: "/h5" | "/app";
};

export function MobileTabBar({ basePath }: MobileTabBarProps) {
  const pathname = usePathname();
  const { dict } = useLocale();

  const tabs = [
    { href: basePath, icon: "home", label: dict.nav.home, exact: true },
    { href: `${basePath}/discover`, icon: "auto_awesome", label: dict.nav.discover },
    { href: `${basePath}/messages`, icon: "mail", label: dict.nav.messages },
    { href: `${basePath}/me`, icon: "person", label: dict.nav.me },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(120,72,54,0.08)] bg-[rgba(255,255,255,0.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map(({ href, icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                active ? "text-[#ef7488]" : "text-[#b0a099]"
              }`}
            >
              <MIcon name={icon} className="text-[26px]" filled={active} />
              <span className={`text-[10px] ${active ? "font-bold" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
