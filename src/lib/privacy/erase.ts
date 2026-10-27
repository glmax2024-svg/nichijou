import { prisma } from "@/lib/prisma";
import { deleteMemosRemote } from "@/lib/ai/memos-plugin";

export type EraseCompanionResult = {
  memories: number;
  messages: number;
  bonds: number;
  remoteDeleted: boolean;
};

export class RemoteMemoryEraseError extends Error {
  constructor() {
    super("Remote memory deletion failed");
    this.name = "RemoteMemoryEraseError";
  }
}

/** 删除用户与角色之间的聊天、记忆、关系快照。订单/礼物/订阅保留。 */
export async function eraseCompanionData(
  userId: string,
  characterId?: string,
): Promise<EraseCompanionResult> {
  const where = characterId ? { userId, characterId } : { userId };

  let remoteDeleted = false;
  try {
    remoteDeleted = await deleteMemosRemote(userId, characterId);
  } catch (err) {
    console.error("[privacy] remote memory delete failed:", err);
    throw new RemoteMemoryEraseError();
  }

  const [memories, messages, bonds] = await prisma.$transaction([
    prisma.characterMemory.deleteMany({ where }),
    prisma.message.deleteMany({ where }),
    prisma.characterBond.deleteMany({ where }),
  ]);

  return {
    memories: memories.count,
    messages: messages.count,
    bonds: bonds.count,
    remoteDeleted,
  };
}
