import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { eventInputSchema } from "@/lib/events";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const events = await prisma.platformEvent.findMany({ orderBy: [{ startsAt: "desc" }] });
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const data = eventInputSchema.parse(await request.json());
    const event = await prisma.platformEvent.create({
      data: { ...data, imageUrl: data.imageUrl || null, linkHref: data.linkHref || null },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "入力内容を確認してください" }, { status: 400 });
    }
    console.error("[admin/events] create failed:", err);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
