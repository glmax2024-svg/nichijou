import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Character } from "@prisma/client";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function isSubscribed(userId: string, characterId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });
  return sub?.status === "ACTIVE";
}

export async function canChatWithCharacter(
  userId: string | undefined,
  character: Pick<Character, "id" | "creatorId">,
) {
  if (!userId) return false;
  if (character.creatorId === userId) return true;
  return isSubscribed(userId, character.id);
}

export function parseTags(tags: string) {
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
