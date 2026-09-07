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

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  birthDate: z.string(),
  acceptedTerms: z.literal(true),
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

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: "FAN",
        passwordHash,
        birthDate,
        ageVerifiedAt: now,
        termsAcceptedAt: now,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "入力内容と利用規約への同意を確認してください" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
