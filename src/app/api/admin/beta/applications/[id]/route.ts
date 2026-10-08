import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { generateInviteCode } from "@/lib/beta/invite";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    grantRole: z.enum(["FAN", "CREATOR"]),
    expiresInDays: z.number().int().min(1).max(90).default(14),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    note: z.string().max(500).optional(),
  }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  const input = parsed.data;

  const application = await prisma.betaApplication.findUnique({
    where: { id },
    include: { inviteCode: true },
  });
  if (!application) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
  if (application.status !== "PENDING") {
    return NextResponse.json({ error: "この申請は処理済みです" }, { status: 409 });
  }

  const reviewed = { reviewedAt: new Date(), reviewedById: session.user.id, reviewNote: input.note ?? null };

  if (input.action === "reject") {
    await prisma.betaApplication.update({ where: { id }, data: { status: "REJECTED", ...reviewed } });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const invite = await prisma.$transaction(async (tx) => {
    // 条件更新防止两个管理员同时点「通过」生成两张码
    const claimed = await tx.betaApplication.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "APPROVED", ...reviewed },
    });
    if (claimed.count !== 1) return null;
    return tx.inviteCode.create({
      data: {
        code: generateInviteCode(),
        grantRole: input.grantRole,
        email: application.email,
        maxUses: 1,
        expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
        note: `内測申請: ${application.nickname}`,
        createdById: session.user.id,
        applicationId: id,
      },
    });
  });
  if (!invite) return NextResponse.json({ error: "この申請は処理済みです" }, { status: 409 });

  return NextResponse.json({ ok: true, status: "APPROVED", invite: { code: invite.code, expiresAt: invite.expiresAt } });
}
