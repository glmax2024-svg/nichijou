import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n";

export async function SiteFooter() {
  const dict = getDictionary(await getRequestLocale());
  const links = [
    { href: "/legal/terms", label: dict.auth.terms },
    { href: "/legal/privacy", label: dict.auth.footerPrivacy },
    { href: "/legal/tokushoho", label: dict.auth.footerTokushoho },
    { href: "/help", label: dict.auth.footerHelp },
  ] as const;

  return (
    <footer className="border-t border-[rgba(120,72,54,0.07)] bg-[#fffaf8] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[#b0a099]">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-[#ef7488]">
            {link.label}
          </Link>
        ))}
        <span>© {dict.common.brand} Nichijou</span>
      </div>
    </footer>
  );
}
