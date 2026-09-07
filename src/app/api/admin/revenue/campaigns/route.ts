import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { clampShareBps } from "@/lib/revenue/split";

const schema = z.object({
  name: z.string().min(1).max(80),
  bonusPercent: z.number().min(0).max(100),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  scope: z.enum(["GLOBAL", "CREATOR", "CHARACTER"]).default("GLOBAL"),
  creatorId: z.string().optional().nullable(),
  characterId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = schema.parse(await request.json());
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!(startsAt < endsAt)) {
      return NextResponse.json({ error: "終了日時は開始より後にしてください" }, { status: 400 });
    }
    if (body.scope === "CREATOR" && !body.creatorId) {
      return NextResponse.json({ error: "クリエイターを選んでください" }, { status: 400 });
    }
    if (body.scope === "CHARACTER" && !body.characterId) {
      return NextResponse.json({ error: "キャラクターを選んでください" }, { status: 400 });
    }

    const campaign = await prisma.revenueCampaign.create({
      data: {
        name: body.name,
        bonusBps: clampShareBps(body.bonusPercent * 100),
        startsAt,
        endsAt,
        scope: body.scope,
        creatorId: body.scope === "CREATOR" ? body.creatorId : null,
        characterId: body.scope === "CHARACTER" ? body.characterId : null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
