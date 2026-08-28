import { auth } from "@/lib/auth";
import { MIcon } from "@/components/ui/m-icon";

type MobileHeaderProps = {
  basePath: "/h5" | "/app";
  title?: string;
};

export async function MobileHeader({
  basePath,
  title = "日常",
}: MobileHeaderProps) {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[rgba(120,72,54,0.08)] bg-white/95 px-[18px] py-2 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <span className="font-display text-[22px] font-black text-[#3a3330]">{title}</span>
      <div className="flex items-center gap-2 text-[#8a7a72]">
        {session?.user && (
          <div className="coin-badge hidden scale-90 sm:flex">
            <MIcon name="toll" className="text-[16px] text-[#e0a93a]" filled />
            1,240
          </div>
        )}
        <MIcon name="search" className="text-[24px]" />
        <span className="relative">
          <MIcon name="notifications" className="text-[24px]" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ef7488] text-[8px] font-bold text-white">
            3
          </span>
        </span>
      </div>
    </header>
  );
}
