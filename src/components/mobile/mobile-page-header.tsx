import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";

export function MobilePageHeader({
  title,
  backHref,
}: {
  title: string;
  backHref: string;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[rgba(120,72,54,0.08)] bg-white px-[18px] py-3">
      <Link
        href={backHref}
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full hover:bg-[#fbf4f1]"
      >
        <MIcon name="arrow_back" className="text-[22px] text-[#3a3330]" />
      </Link>
      <h1 className="font-display text-[18px] font-black text-[#3a3330]">{title}</h1>
    </div>
  );
}
