import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { clampShareBps } from "@/lib/revenue/split";

const schema = z.object({
  creatorId: z.string().optional(),
  characterId: z.string().optional(),
  creatorSharePercent: z.number().min(0).max(100).nullable(),
});

export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = schema.parse(await request.json());
    const bps =
      body.creatorSharePercent === null ? null : clampShareBps(body.creatorSharePercent * 100);

    if (body.characterId) {
      const character = await prisma.character.findUnique({ where: { id: body.characterId } });
      if (!character) {
        return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
      }
      await prisma.character.update({
        where: { id: body.characterId },
        data: { creatorShareBps: bps },
      });
      return NextResponse.json({ ok: true, characterId: body.characterId, creatorShareBps: bps });
    }

    if (body.creatorId) {
      const creator = await prisma.user.findUnique({ where: { id: body.creatorId } });
      if (!creator) {
        return NextResponse.json({ error: "クリエイターが見つかりません" }, { status: 404 });
      }
      await prisma.user.update({
        where: { id: body.creatorId },
        data: { creatorShareBps: bps },
      });
      return NextResponse.json({ ok: true, creatorId: body.creatorId, creatorShareBps: bps });
    }

    return NextResponse.json({ error: "creatorId または characterId が必要です" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
