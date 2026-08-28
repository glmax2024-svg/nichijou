import { prisma } from "@/lib/prisma";

export type ChatThread = {
  character: {
    id: string;
    slug: string;
    name: string;
    avatarUrl: string;
    tagline: string | null;
  };
  lastMessage: {
    content: string;
    role: string;
    createdAt: Date;
  } | null;
};

export async function getChatThreads(userId: string): Promise<ChatThread[]> {
  const [subscriptions, messageGroups] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      select: { characterId: true },
    }),
    prisma.message.groupBy({
      by: ["characterId"],
      where: { userId },
      _max: { createdAt: true },
    }),
  ]);

  const characterIds = [
    ...new Set([
      ...subscriptions.map((s) => s.characterId),
      ...messageGroups.map((g) => g.characterId),
    ]),
  ];

  if (characterIds.length === 0) return [];

  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds }, published: true },
    select: {
      id: true,
      slug: true,
      name: true,
      avatarUrl: true,
      tagline: true,
    },
  });

  const threads = await Promise.all(
    characters.map(async (character) => {
      const lastMessage = await prisma.message.findFirst({
        where: { userId, characterId: character.id },
        orderBy: { createdAt: "desc" },
        select: { content: true, role: true, createdAt: true },
      });
      return { character, lastMessage };
    }),
  );

  return threads.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
    const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export function characterChatHref(
  basePath: "" | "/h5" | "/app",
  slug: string,
  opts?: { post?: string; skill?: string },
) {
  const base = `${basePath}/characters/${slug}/chat`;
  const params = new URLSearchParams();
  if (opts?.post) params.set("post", opts.post);
  if (opts?.skill) params.set("skill", opts.skill);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
