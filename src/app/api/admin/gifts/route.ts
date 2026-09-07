import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { giftItemSchema, resolveAnimationKind } from "@/lib/gifts/admin-schema";
import { z } from "zod";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const gifts = await prisma.giftItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ gifts });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = giftItemSchema.parse(await request.json());
    const existing = await prisma.giftItem.findUnique({ where: { slug: body.slug } });
    if (existing) {
      return NextResponse.json({ error: "この slug は既に使われています" }, { status: 409 });
    }
    const animationUrl = body.animationUrl ?? null;
    const gift = await prisma.giftItem.create({
      data: {
        slug: body.slug,
        name: body.name,
        emoji: body.emoji,
        iconUrl: body.iconUrl ?? null,
        animationUrl,
        animationKind: resolveAnimationKind(body.animationKind, animationUrl),
        amount: body.amount,
        sortOrder: body.sortOrder ?? 100,
        active: body.active ?? true,
        intimacyDelta: body.intimacyDelta ?? 3,
        description: body.description ?? "",
        accentColor: body.accentColor ?? "#ffe1e6",
      },
    });
    return NextResponse.json({ gift }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
