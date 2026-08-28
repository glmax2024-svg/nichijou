"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type MobileSideMenuProps = {
  basePath: "/h5" | "/app";
};

export function MobileSideMenu({ basePath }: MobileSideMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { dict } = useLocale();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const menuItems = [
    { href: basePath, icon: "home", label: dict.nav.home },
    { href: `${basePath}/discover`, icon: "auto_awesome", label: dict.nav.discover },
    { href: `${basePath}/messages`, icon: "mail", label: dict.nav.messages },
    { href: `${basePath}/subscriptions`, icon: "favorite", label: dict.nav.oshi },
    { href: `${basePath}/gifts`, icon: "redeem", label: dict.nav.giftHistory },
    { href: `${basePath}/notifications`, icon: "notifications", label: dict.common.notifications },
    { href: `${basePath}/search`, icon: "search", label: dict.common.search },
    { href: `${basePath}/me`, icon: "person", label: dict.nav.myPage },
    { href: `${basePath}/settings`, icon: "settings", label: dict.nav.settings },
    { href: `${basePath}/help`, icon: "help", label: dict.nav.help },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbf4f1] text-[#8a7a72] transition hover:bg-[#fff4f6] hover:text-[#ef7488]"
        aria-label={dict.common.menu}
      >
        <MIcon name="menu" className="text-[22px]" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
              aria-label={dict.common.close}
              onClick={() => setOpen(false)}
            />
            <aside className="relative z-10 flex h-full w-[min(300px,82vw)] flex-col bg-white shadow-[-12px_0_40px_-20px_rgba(58,51,48,0.45)]">
              <div className="flex items-center justify-between border-b border-[rgba(120,72,54,0.07)] px-5 py-4">
                <div>
                  <div className="font-display text-xl font-black text-[#3a3330]">
                    {dict.common.brand}
                  </div>
                  <div className="text-[11px] text-[#b0a099]">{dict.common.menu}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fbf4f1]"
                  aria-label={dict.common.close}
                >
                  <MIcon name="close" className="text-[18px]" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[14px] font-bold text-[#5a4f48] transition hover:bg-[#fbf4f1]"
                  >
                    <MIcon name={item.icon} className="text-[22px] text-[#ef7488]" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>,
          document.body,
        )}
    </>
  );
}
