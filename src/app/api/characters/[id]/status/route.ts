import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { activeStatus, STATUS_MAX_HOURS } from "@/lib/character-status";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  emoji: z.string().trim().max(8).default(""),
  text: z.string().trim().min(1).max(60),
  /** 多少小时后自动消失；null = 一直显示到下次修改 */
  hours: z.number().int().min(1).max(STATUS_MAX_HOURS).nullable(),
});

const statusSelect = {
  id: true,
  creatorId: true,
  statusEmoji: true,
  statusText: true,
  statusUpdatedAt: true,
  statusExpiresAt: true,
} as const;

async function loadOwned(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "ログインが必要です" }, { status: 401 }) } as const;
  }
  const character = await prisma.character.findUnique({ where: { id }, select: statusSelect });
  if (!character || (character.creatorId !== session.user.id && session.user.role !== "ADMIN")) {
    return { error: NextResponse.json({ error: "権限がありません" }, { status: 403 }) } as const;
  }
  return { session, character } as const;
}

function toPayload(c: Parameters<typeof activeStatus>[0]) {
  const s = activeStatus(c);
  return s
    ? {
        status: {
          emoji: s.emoji,
          text: s.text,
          updatedAt: s.updatedAt.toISOString(),
          expiresAt: s.expiresAt?.toISOString() ?? null,
        },
      }
    : { status: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const owned = await loadOwned((await context.params).id);
  if ("error" in owned) return owned.error;
  return NextResponse.json(toPayload(owned.character));
}

/** 设置「いまの様子」 */
export async function PUT(request: Request, context: RouteContext) {
  const owned = await loadOwned((await context.params).id);
  if ("error" in owned) return owned.error;

  const limited = enforceRateLimit(request, "character-status", { limit: 20, windowMs: 60_000 }, owned.session.user.id);
  if (limited) return limited;

  try {
    const data = schema.parse(await request.json());
    const blocked = await enforceContentPolicy(`${data.emoji} ${data.text}`, "post");
    if (blocked) return blocked;

    const now = new Date();
    const updated = await prisma.character.update({
      where: { id: owned.character.id },
      data: {
        statusEmoji: data.emoji || null,
        statusText: data.text,
        statusUpdatedAt: now,
        statusExpiresAt: data.hours ? new Date(now.getTime() + data.hours * 60 * 60 * 1000) : null,
      },
      select: statusSelect,
    });
    return NextResponse.json(toPayload(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "60文字以内で入力してください" }, { status: 400 });
    }
    console.error("[characters/status]", err);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const owned = await loadOwned((await context.params).id);
  if ("error" in owned) return owned.error;
  await prisma.character.update({
    where: { id: owned.character.id },
    data: { statusEmoji: null, statusText: null, statusUpdatedAt: null, statusExpiresAt: null },
  });
  return NextResponse.json({ status: null });
}
