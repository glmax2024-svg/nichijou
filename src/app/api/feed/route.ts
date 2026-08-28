import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedPosts } from "@/lib/feed";
import { getSubscribedFeedPosts } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);

  const session = await auth();
  const userId = session?.user?.id;

  const posts =
    tab === "following" && userId
      ? await getSubscribedFeedPosts(userId, limit)
      : await getFeedPosts(limit);

  const postIds = posts.map((p) => p.id);
  const allLikes = postIds.length
    ? await prisma.postLike.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, userId: true },
      })
    : [];

  const likeCountMap = new Map<string, number>();
  const likedSet = new Set<string>();
  for (const like of allLikes) {
    likeCountMap.set(like.postId, (likeCountMap.get(like.postId) ?? 0) + 1);
    if (userId && like.userId === userId) likedSet.add(like.postId);
  }

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      isAiAssisted: p.isAiAssisted,
      publishedAt: p.publishedAt.toISOString(),
      characterId: p.character.id,
      character: p.character,
      commentCount: p._count?.comments ?? 0,
      likeCount: likeCountMap.get(p.id) ?? 0,
      likedByMe: likedSet.has(p.id),
    })),
    user: userId
      ? {
          id: userId,
          name: session?.user?.name ?? null,
          email: session?.user?.email ?? null,
        }
      : null,
  });
}
