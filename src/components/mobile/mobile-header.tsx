import { auth } from "@/lib/auth";
import { MIcon } from "@/components/ui/m-icon";
import { getCoinBalance } from "@/lib/coins";
import { countUnreadNotifications } from "@/lib/notifications";

type MobileHeaderProps = {
  basePath: "/h5" | "/app";
  title?: string;
};

export async function MobileHeader({
  basePath,
  title = "日常",
}: MobileHeaderProps) {
  const session = await auth();
  const coins = session?.user ? await getCoinBalance(session.user.id) : null;
  const unread = session?.user ? await countUnreadNotifications(session.user.id) : 0;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[rgba(120,72,54,0.08)] bg-white/95 px-[18px] py-2 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <span className="font-display text-[22px] font-black text-[#3a3330]">{title}</span>
      <div className="flex items-center gap-2 text-[#8a7a72]">
        {coins !== null && (
          <div className="coin-badge hidden scale-90 sm:flex tabular-nums">
            <MIcon name="toll" className="text-[16px] text-[#e0a93a]" filled />
            {coins.toLocaleString("ja-JP")}
          </div>
        )}
        <MIcon name="search" className="text-[24px]" />
        <span className="relative">
          <MIcon name="notifications" className="text-[24px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center rounded-full bg-[#ef7488] text-[8px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </div>
    </header>
  );
}
