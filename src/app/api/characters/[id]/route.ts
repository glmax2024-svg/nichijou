import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { CharacterDeleteError, deleteCharacter } from "@/lib/characters/delete";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const limited = enforceRateLimit(request, "character-delete", { limit: 5, windowMs: 10 * 60_000 }, session.user.id);
  if (limited) return limited;

  const { id } = await params;
  try {
    const result = await deleteCharacter(id, { id: session.user.id, role: session.user.role });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof CharacterDeleteError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[characters/delete]", err);
    return NextResponse.json({ error: "删除失败，请稍后再试" }, { status: 500 });
  }
}
