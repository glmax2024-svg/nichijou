import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { loginPath } from "@/lib/login-path";
import { prisma } from "@/lib/prisma";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { MIcon } from "@/components/ui/m-icon";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { AgeVerifyForm } from "@/components/legal/age-verify-form";
import { EraseCompanionForm } from "@/components/legal/erase-companion-form";
import { getRequestLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n";

type SettingsPageProps = {
  basePath: "" | "/h5" | "/app";
};

export async function SettingsPage({ basePath }: SettingsPageProps) {
  const session = await auth();
  if (!session?.user) {
    const settingsPath = basePath ? `${basePath}/settings` : "/settings";
    if (basePath) {
      redirect(loginPath(basePath, settingsPath));
    } else {
      redirect(`/login?callbackUrl=${encodeURIComponent(settingsPath)}`);
    }
  }

  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const backHref = basePath ? `${basePath}/me` : "/me";
  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { birthDate: true, ageVerifiedAt: true },
  });
  const ageVerified = Boolean(profile?.birthDate && profile.ageVerifiedAt);
  const companions = await prisma.character.findMany({
    where: {
      OR: [
        { memories: { some: { userId: session.user.id } } },
        { messages: { some: { userId: session.user.id } } },
        { bonds: { some: { userId: session.user.id } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const roleLabel =
    session.user.role === "CREATOR"
      ? dict.settings.roleCreator
      : session.user.role === "ADMIN"
        ? dict.settings.roleAdmin
        : dict.settings.roleFan;

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title={dict.settings.title} backHref={backHref} />
      <div className="px-[18px] py-4">
        <div className="overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white">
          <div className="border-b border-[rgba(120,72,54,0.05)] px-4 py-4">
            <div className="font-display text-[15px] font-bold">
              {session.user.name ?? dict.settings.userFallback}
            </div>
            <div className="text-[13px] text-[#8a7a72]">{session.user.email}</div>
            <div className="mt-1 text-[11px] font-bold text-[#ef7488]">{roleLabel}</div>
          </div>
          <SettingsRow
            href={basePath ? `${basePath}/subscriptions` : "/subscriptions"}
            icon="favorite"
            label={dict.nav.oshi}
          />
          <SettingsRow
            href={basePath ? `${basePath}/messages` : "/messages"}
            icon="chat_bubble"
            label={dict.nav.messages}
          />
          <SettingsRow
            href={basePath ? `${basePath}/gifts` : "/gifts"}
            icon="redeem"
            label={dict.nav.giftHistory}
          />
          <SettingsRow
            href={basePath ? `${basePath}/orders` : "/orders"}
            icon="alarm"
            label={dict.nav.morningCall}
          />
          {(session.user.role === "CREATOR" || session.user.role === "ADMIN") && (
            <SettingsRow href="/studio" icon="palette" label={dict.nav.creatorStudio} />
          )}
          {session.user.role === "ADMIN" && (
            <>
              <SettingsRow href="/admin/revenue" icon="payments" label="分成管理" />
              <SettingsRow href="/admin/gifts" icon="redeem" label="ギフト図録" />
            </>
          )}
          <SettingsRow
            href={basePath ? `${basePath}/help` : "/help"}
            icon="help"
            label={dict.nav.help}
          />
          <SettingsRow
            href={basePath ? `${basePath}/legal/terms` : "/legal/terms"}
            icon="gavel"
            label="利用規約"
          />
          <SettingsRow
            href={basePath ? `${basePath}/legal/privacy` : "/legal/privacy"}
            icon="privacy_tip"
            label="プライバシー"
          />
          <SettingsRow
            href={basePath ? `${basePath}/legal/tokushoho` : "/legal/tokushoho"}
            icon="storefront"
            label="特定商取引法"
          />
          <div className="border-t border-[rgba(120,72,54,0.05)]">
            <LanguageSwitcher variant="rows" />
          </div>
        </div>

        {ageVerified ? (
          <p className="mt-3 px-1 text-[12px] text-[#8a7a72]">年齢確認済み（18歳以上）</p>
        ) : (
          <AgeVerifyForm legalBasePath={basePath} />
        )}

        <EraseCompanionForm
          companions={companions}
          labels={{
            title: dict.settings.eraseTitle,
            hint: dict.settings.eraseHint,
            eraseOne: dict.settings.eraseOne,
            eraseAll: dict.settings.eraseAll,
            confirmOne: dict.settings.eraseConfirmOne,
            confirmAll: dict.settings.eraseConfirmAll,
            done: dict.settings.eraseDone,
          }}
        />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: basePath || "/" });
          }}
          className="mt-4"
        >
          <button
            type="submit"
            className="w-full rounded-[18px] border border-[rgba(239,116,136,0.2)] bg-white py-3.5 text-[13.5px] font-bold text-[#e0607a]"
          >
            {dict.common.logout}
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsRow({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-[rgba(120,72,54,0.05)] px-4 py-3.5 last:border-0"
    >
      <MIcon name={icon} className="text-[22px] text-[#8a7a72]" />
      <span className="flex-1 text-[13.5px]">{label}</span>
      <MIcon name="chevron_right" className="text-[20px] text-[#c9bdb5]" />
    </Link>
  );
}
