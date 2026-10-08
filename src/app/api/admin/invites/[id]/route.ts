import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";

/** 作废邀请码（已经用它注册的账号不受影响） */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const updated = await prisma.inviteCode.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (updated.count === 0) return NextResponse.json({ error: "招待コードが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
