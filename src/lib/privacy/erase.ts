import { prisma } from "@/lib/prisma";
import { deleteMemosRemote } from "@/lib/ai/memos-plugin";
import { deleteUserMediaAssets } from "@/lib/media";

export type EraseCompanionResult = {
  memories: number;
  messages: number;
  bonds: number;
  mediaAssets: number;
  remoteDeleted: boolean;
};

/** 删除用户与角色之间的聊天、记忆、关系快照。订单/礼物/订阅保留。 */
export async function eraseCompanionData(
  userId: string,
  characterId?: string,
): Promise<EraseCompanionResult> {
  const where = characterId ? { userId, characterId } : { userId };

  const [memories, messages, bonds] = await prisma.$transaction([
    prisma.characterMemory.deleteMany({ where }),
    prisma.message.deleteMany({ where }),
    prisma.characterBond.deleteMany({ where }),
  ]);

  // 存储里的私有文件也要一起清，否则删除不彻底（订单语音随订单保留）
  let mediaAssets = 0;
  try {
    mediaAssets = await deleteUserMediaAssets(userId, characterId);
  } catch (err) {
    console.error("[privacy] media delete failed:", err);
  }

  let remoteDeleted = false;
  try {
    remoteDeleted = await deleteMemosRemote(userId, characterId);
  } catch (err) {
    console.error("[privacy] remote memory delete failed:", err);
  }

  return {
    memories: memories.count,
    messages: messages.count,
    bonds: bonds.count,
    mediaAssets,
    remoteDeleted,
  };
}
