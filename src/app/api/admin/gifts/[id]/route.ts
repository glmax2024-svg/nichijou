import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { giftItemSchema, resolveAnimationKind } from "@/lib/gifts/admin-schema";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;

  try {
    const body = giftItemSchema.partial().parse(await request.json());
    const existing = await prisma.giftItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ギフトが見つかりません" }, { status: 404 });
    }
    if (body.slug && body.slug !== existing.slug) {
      const taken = await prisma.giftItem.findUnique({ where: { slug: body.slug } });
      if (taken) {
        return NextResponse.json({ error: "この slug は既に使われています" }, { status: 409 });
      }
    }
    const animationUrl = body.animationUrl === undefined ? existing.animationUrl : body.animationUrl;
    const gift = await prisma.giftItem.update({
      where: { id },
      data: {
        slug: body.slug,
        name: body.name,
        emoji: body.emoji,
        iconUrl: body.iconUrl,
        animationUrl,
        animationKind: resolveAnimationKind(
          body.animationKind ?? (existing.animationKind as "none" | "gif" | "mp4"),
          animationUrl,
        ),
        amount: body.amount,
        sortOrder: body.sortOrder,
        active: body.active,
        intimacyDelta: body.intimacyDelta,
        description: body.description,
        accentColor: body.accentColor,
      },
    });
    return NextResponse.json({ gift });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;
  const existing = await prisma.giftItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ギフトが見つかりません" }, { status: 404 });
  }
  await prisma.giftItem.update({
    where: { id },
    data: { active: false },
  });
  return NextResponse.json({ ok: true });
}
