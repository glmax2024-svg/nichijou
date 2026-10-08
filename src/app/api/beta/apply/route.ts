import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { betaApplicationSchema } from "@/lib/beta/application";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "beta-apply", { limit: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  try {
    const data = betaApplicationSchema.parse(await request.json());

    const fields = {
      nickname: data.nickname,
      userType: data.userType,
      twitterUrl: data.twitterUrl,
      pixivUrl: data.pixivUrl,
      contactType: data.contactType,
      contactValue: data.contactValue,
      intro: data.intro,
    };

    // 同一邮箱还在审核中 → 更新那条，不重复排队
    const pending = await prisma.betaApplication.findFirst({
      where: { email: data.email, status: "PENDING" },
      select: { id: true },
    });
    if (pending) {
      await prisma.betaApplication.update({ where: { id: pending.id }, data: fields });
    } else {
      await prisma.betaApplication.create({ data: { email: data.email, ...fields } });
    }

    // 不论邮箱是否已注册/已通过，都返回同样的结果，避免被用来探测邮箱
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      return NextResponse.json(
        { error: first?.message ?? "入力内容を確認してください", field: first?.path[0] ?? null },
        { status: 400 },
      );
    }
    console.error("[beta/apply]", error);
    return NextResponse.json({ error: "送信に失敗しました。時間をおいて再度お試しください" }, { status: 500 });
  }
}
