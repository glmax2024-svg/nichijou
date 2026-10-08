import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 训练相关接口的统一鉴权：登录、且是角色作者（或管理员） */
export async function requireCharacterOwner(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "ログインが必要です" }, { status: 401 }), actor: null };
  }
  const character = await prisma.character.findUnique({ where: { id: characterId }, select: { creatorId: true } });
  if (!character || (character.creatorId !== session.user.id && session.user.role !== "ADMIN")) {
    return { error: NextResponse.json({ error: "権限がありません" }, { status: 403 }), actor: null };
  }
  return { error: null, actor: { id: session.user.id, role: session.user.role } };
}
