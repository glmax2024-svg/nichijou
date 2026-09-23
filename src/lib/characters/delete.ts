import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteMediaAsset } from "@/lib/media";
import { deleteByPrefix } from "@/lib/storage";
import { deleteRemoteTrainingData, retryPendingRemoteDeletions } from "@/lib/ai/lora-training";

export class CharacterDeleteError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "CharacterDeleteError";
  }
}

/**
 * 删除角色及其全部数据：训练服务上的任务与版本、存储里的所有图片和素材、数据库记录。
 *
 * 有付费记录（订阅、订单、礼物、分成）的角色拒绝删除：这些表对角色是级联删除，
 * 直接删会连带抹掉粉丝的购买记录和画师的分成账目。这类角色只能下架（取消发布）。
 */
export async function deleteCharacter(characterId: string, actor: { id: string; role: UserRole }) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      creatorId: true,
      _count: { select: { subscriptions: true, orders: true, gifts: true, earnings: true } },
    },
  });
  if (!character) throw new CharacterDeleteError("角色不存在", 404, "NOT_FOUND");
  if (character.creatorId !== actor.id && actor.role !== "ADMIN") {
    throw new CharacterDeleteError("没有权限删除这个角色", 403, "FORBIDDEN");
  }

  const paid = character._count;
  if (paid.subscriptions + paid.orders + paid.gifts + paid.earnings > 0) {
    throw new CharacterDeleteError(
      "这个角色已有订阅、订单或礼物记录，不能删除，只能下架",
      409,
      "HAS_PAID_RECORDS",
    );
  }

  // 1. 训练服务上的任务、模型、预览
  await deleteRemoteTrainingData(characterId);
  await retryPendingRemoteDeletions().catch(() => {});

  // 2. 登记过的媒体（头像、封面、生成图、预览等）
  const assets = await prisma.mediaAsset.findMany({ where: { characterId }, select: { id: true } });
  for (const asset of assets) {
    await deleteMediaAsset(asset.id).catch((err) => console.error("[character] delete media failed:", asset.id, err));
  }

  // 3. 旧上传入口留下的文件（训练素材、动态配图、早期生成图）
  for (const prefix of [`lora/${characterId}/`, `posts/${characterId}/`, `generated/${characterId}/`, `public/characters/${characterId}/`]) {
    await deleteByPrefix(prefix).catch((err) => console.error("[character] delete prefix failed:", prefix, err));
  }

  // 4. 数据库：训练记录、生成记录、聊天、记忆等随角色级联删除；训练额度记录保留（防止删了重建刷次数）
  await prisma.character.delete({ where: { id: characterId } });

  return { id: character.id, name: character.name, mediaDeleted: assets.length };
}
