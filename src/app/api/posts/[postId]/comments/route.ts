import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCommentsForPost } from "@/lib/post-comments";
import { generatePostCommentReply } from "@/lib/ai/post-comment";
import { z } from "zod";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";

const createSchema = z.object({
  content: z.string().min(1).max(500),
});

type RouteContext = { params: Promise<{ postId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { postId } = await context.params;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
  }

  const comments = await getCommentsForPost(postId);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { postId } = await context.params;

  try {
    const body = await request.json();
    const { content } = createSchema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;
    const blocked = await enforceContentPolicy(content, "comment");
    if (blocked) return blocked;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { character: true },
    });
    if (!post) {
      return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
    }

    const userComment = await prisma.postComment.create({
      data: {
        postId,
        userId: session.user.id,
        authorType: "user",
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    const replyText = await generatePostCommentReply({
      character: post.character,
      postContent: post.content,
      userComment: content.trim(),
      userName: session.user.name ?? "ファン",
    });

    const characterComment = await prisma.postComment.create({
      data: {
        postId,
        authorType: "character",
        content: replyText,
        isAiGenerated: true,
      },
    });

    return NextResponse.json({
      comments: [
        {
          id: userComment.id,
          authorType: "user" as const,
          content: userComment.content,
          isAiGenerated: false,
          createdAt: userComment.createdAt,
          user: userComment.user,
        },
        {
          id: characterComment.id,
          authorType: "character" as const,
          content: characterComment.content,
          isAiGenerated: true,
          createdAt: characterComment.createdAt,
          user: null,
        },
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "コメントを確認してください" }, { status: 400 });
    }
    console.error("[comments]", error);
    return NextResponse.json({ error: "コメントの投稿に失敗しました" }, { status: 500 });
  }
}
