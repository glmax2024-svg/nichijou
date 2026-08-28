import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mandatoryMemosQuery } from "@/lib/ai/pipeline";
import { z } from "zod";

const schema = z.object({
  characterId: z.string(),
  query: z.string().min(1).max(500),
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
