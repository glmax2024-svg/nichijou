import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  characterId: z.string(),
  content: z.string().min(1).max(2000),
  imageUrl: z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("/") || /^https?:\/\//.test(v),
      "imageUrl must be a path or URL",
    )
    .optional(),
  isAiAssisted: z.boolean().default(false),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const character = await prisma.character.findUnique({ where: { id: data.characterId } });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const post = await prisma.post.create({
      data: {
        characterId: data.characterId,
        content: data.content,
        imageUrl: data.imageUrl,
        isAiAssisted: data.isAiAssisted,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "投稿に失敗しました" }, { status: 500 });
  }
}
