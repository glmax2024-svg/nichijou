import { prisma } from "@/lib/prisma";
import { listGiftCatalog } from "@/lib/gifts/catalog";
import { GiftIcon } from "@/components/gifts/gift-icon";

export async function GiftShelf({ characterId }: { characterId: string }) {
  const catalog = await listGiftCatalog({ includeInactive: true });
  let counts = new Map<string, number>();
  try {
    const grouped = await prisma.gift.groupBy({
      by: ["giftType"],
      where: { characterId },
      _count: { _all: true },
    });
    counts = new Map(grouped.map((row) => [row.giftType, row._count._all]));
  } catch {
    /* catalog-only shelf */
  }

  const items = catalog
    .map((gift) => ({ gift, n: counts.get(gift.slug) ?? 0 }))
    .filter((row) => row.n > 0 || row.gift.active)
    .slice(0, 8);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[rgba(120,72,54,0.07)] bg-[#fbf4f1] p-3.5">
      <div className="mb-2 text-[11.5px] font-bold text-[#8a7a72]">贈られたギフト棚</div>
      <div className="flex flex-wrap gap-2.5">
        {items.map(({ gift, n }) => (
          <div key={gift.slug} className="flex w-[52px] flex-col items-center gap-1">
            <GiftIcon gift={gift} size={44} />
            <span className="text-[9.5px] text-[#b0a099]">×{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
