import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { eventInputSchema } from "@/lib/events";

type RouteContext = { params: Promise<{ id: string }> };

/** 整体替换（管理画面总是提交完整表单） */
export async function PUT(request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;
  try {
    const data = eventInputSchema.parse(await request.json());
    const existing = await prisma.platformEvent.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    const event = await prisma.platformEvent.update({
      where: { id },
      data: { ...data, imageUrl: data.imageUrl || null, linkHref: data.linkHref || null },
    });
    return NextResponse.json({ event });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "入力内容を確認してください" }, { status: 400 });
    }
    console.error("[admin/events] update failed:", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;
  const result = await prisma.platformEvent.deleteMany({ where: { id } });
  if (result.count === 0) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
