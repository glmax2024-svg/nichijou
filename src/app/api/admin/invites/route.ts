import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/admin";
import { generateInviteCode } from "@/lib/beta/invite";

const schema = z.object({
  note: z.string().trim().max(200).optional(),
  grantRole: z.enum(["FAN", "CREATOR"]).default("FAN"),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  maxUses: z.number().int().min(1).max(500).default(1),
  expiresInDays: z.number().int().min(1).max(365).nullable().default(14),
});

/** 不经过申请、直接发码（给熟人、合作画师、活动批量码） */
export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  const input = parsed.data;

  const invite = await prisma.inviteCode.create({
    data: {
      code: generateInviteCode(),
      note: input.note || null,
      grantRole: input.grantRole,
      email: input.email || null,
      maxUses: input.maxUses,
      expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86_400_000) : null,
      createdById: session.user.id,
    },
  });
  return NextResponse.json({ ok: true, invite });
}
