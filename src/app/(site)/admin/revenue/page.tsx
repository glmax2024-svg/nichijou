import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { AdminRevenuePanel } from "@/components/admin/admin-revenue-panel";
import { DEFAULT_CREATOR_SHARE_BPS } from "@/lib/revenue/split";
import { getGlobalCreatorShareBps } from "@/lib/revenue/ledger";

export default async function AdminRevenuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/revenue");
  if (session.user.role !== "ADMIN") redirect("/");

  const [globalBps, campaigns, creators, characters, recent, totals] = await Promise.all([
    getGlobalCreatorShareBps(),
    prisma.revenueCampaign.findMany({ orderBy: { startsAt: "desc" } }),
    prisma.user.findMany({
      where: { role: { in: ["CREATOR", "ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        creatorShareBps: true,
        _count: { select: { characters: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.character.findMany({
      select: { id: true, name: true, slug: true, creatorId: true, creatorShareBps: true },
      orderBy: { name: "asc" },
    }),
    prisma.creatorEarning.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        creator: { select: { name: true } },
        character: { select: { name: true } },
      },
    }),
    prisma.creatorEarning.aggregate({
      _sum: { grossAmount: true, creatorAmount: true, platformAmount: true },
    }),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[960px] px-4 py-10">
        <Link href="/studio" className="text-[12px] font-bold text-[#ef7488] hover:underline">
          ← スタジオ
        </Link>
        <Link href="/admin/gifts" className="ml-4 text-[12px] font-bold text-[#ef7488] hover:underline">
          ギフト図録
        </Link>
        <h1 className="mt-3 font-display text-2xl font-black text-[#3a3330]">分成とキャンペーン</h1>
        <p className="mt-1 text-sm text-[#8a7a72]">
          デフォルトは画师 {DEFAULT_CREATOR_SHARE_BPS / 100}% / プラットフォーム{" "}
          {100 - DEFAULT_CREATOR_SHARE_BPS / 100}%。限時活動で画师取り分を加算できます。
        </p>
        <div className="mt-6">
          <AdminRevenuePanel
            initial={{
              globalCreatorSharePercent: globalBps / 100,
              campaigns: campaigns.map((c) => ({
                id: c.id,
                name: c.name,
                bonusBps: c.bonusBps,
                startsAt: c.startsAt.toISOString(),
                endsAt: c.endsAt.toISOString(),
                active: c.active,
                scope: c.scope,
                creatorId: c.creatorId,
                characterId: c.characterId,
              })),
              creators,
              characters,
              recent: recent.map((row) => ({
                id: row.id,
                kind: row.kind,
                grossAmount: row.grossAmount,
                creatorAmount: row.creatorAmount,
                platformAmount: row.platformAmount,
                finalShareBps: row.finalShareBps,
                bonusBps: row.bonusBps,
                campaignName: row.campaignName,
                createdAt: row.createdAt.toISOString(),
                creator: row.creator,
                character: row.character,
              })),
              totals: {
                gross: totals._sum.grossAmount ?? 0,
                creator: totals._sum.creatorAmount ?? 0,
                platform: totals._sum.platformAmount ?? 0,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
