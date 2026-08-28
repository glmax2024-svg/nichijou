import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  const { postId } = await context.params;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
  }

  const [likeCount, liked] = await Promise.all([
    prisma.postLike.count({ where: { postId } }),
    session?.user?.id
      ? prisma.postLike
          .findUnique({
            where: { postId_userId: { postId, userId: session.user.id } },
          })
          .then(Boolean)
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ likeCount, liked });
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { postId } = await context.params;
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
  }

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({
      data: { postId, userId: session.user.id },
    });
  }

  const likeCount = await prisma.postLike.count({ where: { postId } });
  return NextResponse.json({ liked: !existing, likeCount });
}
