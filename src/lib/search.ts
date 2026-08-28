import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const SEARCH_TAGS = ["おすすめ", "#治愈", "#恋爱", "#校园", "#元气", "#夜型"] as const;

export async function searchCharacters({
  q,
  tag,
  limit = 40,
}: {
  q?: string;
  tag?: string;
  limit?: number;
}) {
  const and: Prisma.CharacterWhereInput[] = [{ published: true }];

  const query = q?.trim();
  if (query) {
    and.push({
      OR: [
        { name: { contains: query } },
        { slug: { contains: query } },
        { tagline: { contains: query } },
        { tags: { contains: query } },
        { bio: { contains: query } },
      ],
    });
  }

  const cleanTag = tag?.replace(/^#/, "").trim();
  if (cleanTag && cleanTag !== "おすすめ") {
    and.push({ tags: { contains: cleanTag } });
  }

  return prisma.character.findMany({
    where: { AND: and },
    include: { _count: { select: { posts: true, subscriptions: true } } },
    orderBy: { subscriptions: { _count: "desc" } },
    take: limit,
  });
}

export async function getSubscribedFeedPosts(userId: string, limit = 50) {
  return prisma.post.findMany({
    where: {
      character: {
        published: true,
        subscriptions: { some: { userId, status: "ACTIVE" } },
      },
    },
    include: {
      character: {
        select: {
          id: true,
          slug: true,
          name: true,
          avatarUrl: true,
          tagline: true,
          tags: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}
