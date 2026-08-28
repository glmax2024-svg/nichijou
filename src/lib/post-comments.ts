import { prisma } from "@/lib/prisma";

export type PostCommentView = {
  id: string;
  authorType: "user" | "character";
  content: string;
  isAiGenerated: boolean;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

export async function getCommentsForPosts(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, PostCommentView[]>();

  const rows = await prisma.postComment.findMany({
    where: { postId: { in: postIds } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  const map = new Map<string, PostCommentView[]>();
  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push({
      id: row.id,
      authorType: row.authorType as "user" | "character",
      content: row.content,
      isAiGenerated: row.isAiGenerated,
      createdAt: row.createdAt,
      user: row.user,
    });
    map.set(row.postId, list);
  }
  return map;
}

export async function getCommentsForPost(postId: string) {
  const rows = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    authorType: row.authorType as "user" | "character",
    content: row.content,
    isAiGenerated: row.isAiGenerated,
    createdAt: row.createdAt,
    user: row.user,
  }));
}
