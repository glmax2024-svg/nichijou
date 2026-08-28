import Link from "next/link";
import { auth } from "@/lib/auth";
import { MIcon } from "@/components/ui/m-icon";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getRequestLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n";

export async function Header() {
  const session = await auth();
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);

  return (
    <header className="sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[rgba(120,72,54,0.07)] bg-[rgba(255,250,248,0.82)] px-4 backdrop-blur-[14px] sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488]">
          <MIcon name="favorite" className="text-[20px] text-white" />
        </div>
        <span className="font-display text-xl font-black text-[#3a3330]">{dict.common.brand}</span>
      </Link>

      <Link href="/search" className="hidden max-w-[340px] flex-1 md:mx-8 md:flex">
        <div className="flex w-full items-center gap-2 rounded-full border border-[rgba(120,72,54,0.1)] bg-white px-4 py-2 text-[#c2b4ac] transition hover:border-[rgba(239,116,136,0.2)]">
          <MIcon name="search" className="text-[19px]" />
          <span className="text-[12.5px]">{dict.nav.searchPlaceholder}</span>
        </div>
      </Link>

      <div className="flex items-center gap-2.5">
        <LanguageSwitcher />
        {session?.user && (
          <div className="coin-badge hidden sm:flex">
            <MIcon name="toll" className="text-[17px] text-[#e0a93a]" filled />
            1,240
          </div>
        )}
        {session?.user && (
          <Link
            href="/messages"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
            aria-label={dict.nav.messages}
          >
            <MIcon name="mail" className="text-[20px]" />
          </Link>
        )}
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
          aria-label={dict.common.notifications}
        >
          <MIcon name="notifications" className="text-[20px]" />
          <span className="absolute -right-0.5 -top-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-white bg-[#ef7488] text-[9px] font-bold text-white">
            3
          </span>
        </Link>
        {session?.user ? (
          <Link
            href="/me"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff] text-sm font-bold text-[#ef7488]"
          >
            {(session.user.name ?? session.user.email ?? "?")[0]}
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-[#3a3330] px-4 py-2 text-sm font-bold text-white"
          >
            {dict.common.login}
          </Link>
        )}
      </div>
    </header>
  );
}
