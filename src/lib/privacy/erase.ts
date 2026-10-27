import { prisma } from "@/lib/prisma";

export type EraseCompanionResult = {
  memories: number;
  messages: number;
  bonds: number;
  chatInteractions: number;
};

/** 删除用户与角色之间的聊天、记忆、关系快照。订单/礼物/订阅保留。 */
export async function eraseCompanionData(
  userId: string,
  characterId?: string,
): Promise<EraseCompanionResult> {
  const where = characterId ? { userId, characterId } : { userId };

  const [chatInteractions, memories, messages, bonds] = await prisma.$transaction([
    prisma.chatInteraction.deleteMany({ where }),
    prisma.characterMemory.deleteMany({ where }),
    prisma.message.deleteMany({ where }),
    prisma.characterBond.deleteMany({ where }),
  ]);

  return {
    memories: memories.count,
    messages: messages.count,
    bonds: bonds.count,
    chatInteractions: chatInteractions.count,
  };
}
