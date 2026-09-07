import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "ログインが必要です" }, { status: 401 }),
    };
  }
  if (session.user.role !== "ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ error: "権限がありません" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
