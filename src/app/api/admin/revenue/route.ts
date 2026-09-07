import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import {
  clampShareBps,
  getGlobalCreatorShareBps,
  setGlobalCreatorShareBps,
} from "@/lib/revenue/ledger";
import { DEFAULT_CREATOR_SHARE_BPS } from "@/lib/revenue/split";

const putSchema = z.object({
  creatorSharePercent: z.number().min(0).max(100),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

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

  return NextResponse.json({
    defaultPercent: DEFAULT_CREATOR_SHARE_BPS / 100,
    globalCreatorShareBps: globalBps,
    globalCreatorSharePercent: globalBps / 100,
    campaigns,
    creators,
    characters,
    recent,
    totals: {
      gross: totals._sum.grossAmount ?? 0,
      creator: totals._sum.creatorAmount ?? 0,
      platform: totals._sum.platformAmount ?? 0,
    },
  });
}

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = putSchema.parse(await request.json());
    const bps = clampShareBps(body.creatorSharePercent * 100);
    await setGlobalCreatorShareBps(bps);
    return NextResponse.json({
      globalCreatorShareBps: bps,
      globalCreatorSharePercent: bps / 100,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
