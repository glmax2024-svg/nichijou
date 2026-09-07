import Link from "next/link";

const LINKS = [
  { href: "/legal/terms", label: "利用規約" },
  { href: "/legal/privacy", label: "プライバシー" },
  { href: "/legal/tokushoho", label: "特定商取引法" },
  { href: "/help", label: "ヘルプ" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(120,72,54,0.07)] bg-[#fffaf8] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-[#b0a099]">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-[#ef7488]">
            {link.label}
          </Link>
        ))}
        <span>© 日常 Nichijou</span>
      </div>
    </footer>
  );
}
