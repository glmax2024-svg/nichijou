import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  isAdultBirthDate,
  parseBirthDateInput,
  underageResponse,
} from "@/lib/security/age";
import { InviteCodeError, isInviteOnly, redeemInviteCode } from "@/lib/beta/invite";
import { grantSignupBonus } from "@/lib/coins";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  birthDate: z.string(),
  acceptedTerms: z.literal(true),
  inviteCode: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "register", { limit: 5, windowMs: 15 * 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const data = schema.parse(body);
    const birthDate = parseBirthDateInput(data.birthDate);
    if (!birthDate) {
      return NextResponse.json({ error: "生年月日を確認してください" }, { status: 400 });
    }
    if (!isAdultBirthDate(birthDate)) {
      return underageResponse();
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは既に登録されています" }, { status: 400 });
    }

    const inviteOnly = isInviteOnly();
    if (inviteOnly && !data.inviteCode?.trim()) {
      return NextResponse.json({ error: "招待コードを入力してください", field: "inviteCode" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date();
    // 占用邀请码和建用户放在同一个事务里：建号失败时名额不会被白白消耗
    const user = await prisma.$transaction(async (tx) => {
      const invite = inviteOnly ? await redeemInviteCode(tx, data.inviteCode!, data.email) : null;
      const created = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: invite?.grantRole ?? "FAN",
          inviteCodeId: invite?.inviteCodeId ?? null,
          passwordHash,
          birthDate,
          ageVerifiedAt: now,
          termsAcceptedAt: now,
        },
      });
      await grantSignupBonus(tx, created.id);
      return created;
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    if (error instanceof InviteCodeError) {
      return NextResponse.json({ error: error.message, field: "inviteCode" }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力内容と利用規約への同意を確認してください" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
