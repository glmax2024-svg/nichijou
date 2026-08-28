import { prisma } from "@/lib/prisma";
import { isSubscribed } from "@/lib/utils";
import type { Character } from "@prisma/client";

export const FREE_DAILY_MESSAGE_LIMIT = 10;

export type ChatAccess = {
  /** Whether the next message can be sent. */
  canSend: boolean;
  isSubscribed: boolean;
  isCreator: boolean;
  used: number;
  limit: number;
  remaining: number;
};

function startOfTodayJst() {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${dateKey}T00:00:00+09:00`);
}

export async function getDailyUserMessageCount(userId: string, characterId: string) {
  return prisma.message.count({
    where: {
      userId,
      characterId,
      role: "user",
      createdAt: { gte: startOfTodayJst() },
    },
  });
}

export async function getChatAccess(
  userId: string,
  character: Pick<Character, "id" | "creatorId">,
): Promise<ChatAccess> {
  if (character.creatorId === userId) {
    return {
      canSend: true,
      isSubscribed: false,
      isCreator: true,
      used: 0,
      limit: FREE_DAILY_MESSAGE_LIMIT,
      remaining: FREE_DAILY_MESSAGE_LIMIT,
    };
  }

  const subscribed = await isSubscribed(userId, character.id);
  if (subscribed) {
    return {
      canSend: true,
      isSubscribed: true,
      isCreator: false,
      used: 0,
      limit: FREE_DAILY_MESSAGE_LIMIT,
      remaining: FREE_DAILY_MESSAGE_LIMIT,
    };
  }

  const used = await getDailyUserMessageCount(userId, character.id);
  const remaining = Math.max(0, FREE_DAILY_MESSAGE_LIMIT - used);

  return {
    canSend: remaining > 0,
    isSubscribed: false,
    isCreator: false,
    used,
    limit: FREE_DAILY_MESSAGE_LIMIT,
    remaining,
  };
}
