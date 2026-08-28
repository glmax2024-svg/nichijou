import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  encodeSessionToken,
  sessionCookieHeader,
  type MobileSessionUser,
} from "@/lib/mobile-auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "mobile-login", { limit: 10, windowMs: 15 * 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "メールまたはパスワードが正しくありません" }, { status: 401 });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "メールまたはパスワードが正しくありません" }, { status: 401 });
    }

    const sessionUser: MobileSessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    };

    const token = await encodeSessionToken(sessionUser);
    const res = NextResponse.json({ user: sessionUser });
    res.headers.append("Set-Cookie", sessionCookieHeader(token));
    return res;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    console.error("[mobile/login]", error);
    return NextResponse.json({ error: "ログインに失敗しました" }, { status: 500 });
  }
}
