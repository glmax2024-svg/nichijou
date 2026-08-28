import { prisma } from "@/lib/prisma";
import { buildFirstGreeting, type PostContext } from "@/lib/chat-greeting";

export type ChatContextData = {
  memoryHints: string[];
  postContext: PostContext | null;
  initialGreeting: string | null;
};

export async function getChatContext(
  userId: string,
  character: { id: string; slug: string; name: string },
  opts?: { postId?: string | null; messageCount?: number },
): Promise<ChatContextData> {
  const [memories, post] = await Promise.all([
    prisma.characterMemory.findMany({
      where: { userId, characterId: character.id },
      orderBy: { importance: "desc" },
      take: 3,
      select: { content: true },
    }),
    opts?.postId
      ? prisma.post.findFirst({
          where: { id: opts.postId, characterId: character.id },
          select: { id: true, content: true },
        })
      : Promise.resolve(null),
  ]);

  const memoryHints = memories.map((m) => m.content);
  const postContext: PostContext | null = post
    ? {
        id: post.id,
        excerpt: post.content.replace(/\s+/g, " ").trim(),
      }
    : null;

  const hasMessages = (opts?.messageCount ?? 0) > 0;
  const initialGreeting = hasMessages
    ? null
    : buildFirstGreeting(character.slug, character.name, memoryHints, postContext);

  return { memoryHints, postContext, initialGreeting };
}
