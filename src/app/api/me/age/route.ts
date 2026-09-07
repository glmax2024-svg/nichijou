import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAdultBirthDate,
  parseBirthDateInput,
  underageResponse,
} from "@/lib/security/age";

const schema = z.object({
  birthDate: z.string(),
  acceptedTerms: z.literal(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());
    const birthDate = parseBirthDateInput(body.birthDate);
    if (!birthDate) {
      return NextResponse.json({ error: "生年月日を確認してください" }, { status: 400 });
    }
    if (!isAdultBirthDate(birthDate)) {
      return underageResponse();
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        birthDate,
        ageVerifiedAt: now,
        termsAcceptedAt: now,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "利用規約への同意と生年月日が必要です" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "確認に失敗しました" }, { status: 500 });
  }
}
