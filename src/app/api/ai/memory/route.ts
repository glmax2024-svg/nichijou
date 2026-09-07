import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mandatoryMemosQuery } from "@/lib/ai/pipeline";
import { eraseCompanionData } from "@/lib/privacy/erase";
import { enforceRateLimit } from "@/modules/governance";
import { z } from "zod";

const schema = z.object({
  characterId: z.string(),
  query: z.string().min(1).max(500),
});

const eraseSchema = z.object({
  characterId: z.string().optional(),
});

/** Debug / transparency — inspect memories returned by Memos. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { characterId, query } = schema.parse(body);

    const memories = await mandatoryMemosQuery({
      userId: session.user.id,
      characterId,
      query,
    });

    return NextResponse.json({
      count: memories.length,
      memories,
      note: "Memos 强制查询 — 每次对话前 pipeline 自动执行相同逻辑",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "记忆查询失败" }, { status: 500 });
  }
}

/** 删除该用户与角色的聊天 / 记忆 / 关系快照。省略 characterId 则清除全部。 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "memory-erase",
    { limit: 8, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const { characterId } = eraseSchema.parse(body);
    const result = await eraseCompanionData(session.user.id, characterId || undefined);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    return NextResponse.json({ error: "データの削除に失敗しました" }, { status: 500 });
  }
}
