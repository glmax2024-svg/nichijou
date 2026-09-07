import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { clampShareBps } from "@/lib/revenue/split";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  bonusPercent: z.number().min(0).max(100).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;

  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.revenueCampaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "キャンペーンが見つかりません" }, { status: 404 });
    }

    const startsAt = body.startsAt ? new Date(body.startsAt) : existing.startsAt;
    const endsAt = body.endsAt ? new Date(body.endsAt) : existing.endsAt;
    if (!(startsAt < endsAt)) {
      return NextResponse.json({ error: "終了日時は開始より後にしてください" }, { status: 400 });
    }

    const campaign = await prisma.revenueCampaign.update({
      where: { id },
      data: {
        name: body.name,
        bonusBps: body.bonusPercent === undefined ? undefined : clampShareBps(body.bonusPercent * 100),
        startsAt,
        endsAt,
        active: body.active,
      },
    });
    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
