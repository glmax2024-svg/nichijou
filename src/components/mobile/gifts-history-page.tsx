import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginPath } from "@/lib/login-path";
import { formatYen } from "@/lib/stripe";
import { formatTimeAgo } from "@/lib/feed";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";
import { mapGiftsBySlug } from "@/lib/gifts/catalog";
import { GiftIcon } from "@/components/gifts/gift-icon";

export async function GiftsHistoryPage({ basePath }: { basePath: "" | "/h5" | "/app" }) {
  const session = await auth();
  const giftsPath = basePath ? `${basePath}/gifts` : "/gifts";
  if (!session?.user) redirect(basePath ? loginPath(basePath, giftsPath) : `/login?callbackUrl=${giftsPath}`);

  const [gifts, catalog] = await Promise.all([
    prisma.gift.findMany({
      where: { userId: session.user.id },
      include: { character: { select: { name: true, avatarUrl: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    mapGiftsBySlug(),
  ]);

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title="ギフト履歴" backHref={basePath ? `${basePath}/me` : "/me"} />
      <div className="px-[18px] py-3">
        {gifts.length === 0 ? (
          <div className="py-16 text-center">
            <MIcon name="redeem" className="mx-auto text-[48px] text-[#ef7488]/30" />
            <p className="mt-4 font-display font-bold text-[#3a3330]">まだギフトがありません</p>
            <p className="mt-2 text-sm text-[#8a7a72]">推しキャラにギフトを贈ってみましょう</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {gifts.map((gift) => {
              const meta = catalog.get(gift.giftType);
              return (
                <li
                  key={gift.id}
                  className="flex items-center gap-3 rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white p-3.5"
                >
                  <GiftIcon
                    gift={{
                      emoji: meta?.emoji ?? "🎁",
                      iconUrl: meta?.iconUrl,
                      accentColor: meta?.accentColor,
                    }}
                    size={40}
                  />
                  <CharacterAvatar
                    slug={gift.character.slug}
                    src={gift.character.avatarUrl}
                    alt={gift.character.name}
                    size={40}
                    rounded="xl"
                  />
                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="font-display text-sm font-bold">
                      {meta?.name ?? gift.giftType} → {gift.character.name}
                    </div>
                    <div className="text-[11.5px] text-[#8a7a72]">
                      {formatYen(gift.amount)} · {formatTimeAgo(gift.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`${basePath}/characters/${gift.character.slug}`}
                    className="text-[11px] font-bold text-[#ef7488]"
                  >
                    見る
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
