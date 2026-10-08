/**
 * 媒体资产：所有生成/上传的二进制产物在这里统一登记。
 *
 * 约定：
 * - 数据库只存 storageKey，不存完整 URL —— 换 CDN、换域名不用改数据
 * - PUBLIC  → CDN 直出，可长期缓存
 * - PRIVATE → 返回 /api/media/<id>，由该接口鉴权后再签发限时地址
 */

import { createHash, randomUUID } from "crypto";
import type { MediaAsset, MediaKind, MediaVisibility, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deleteByPrefix,
  deleteObject,
  extFromContentType,
  publicUrlForKey,
  putObject,
} from "@/lib/storage";

export type StoreMediaInput = {
  kind: MediaKind;
  visibility: MediaVisibility;
  body: Buffer;
  contentType: string;
  /** anima | zetta | gateway | upload */
  source: string;
  sourceMeta?: Prisma.InputJsonValue;
  characterId?: string | null;
  /** PRIVATE 必填：决定存储路径与删除范围 */
  userId?: string | null;
};

const SEGMENT_RE = /^[A-Za-z0-9_-]{1,64}$/;

function safeSegment(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!SEGMENT_RE.test(value)) throw new Error(`invalid storage path segment: ${value}`);
  return value;
}

export function buildMediaKey(input: {
  visibility: MediaVisibility;
  kind: MediaKind;
  characterId?: string | null;
  userId?: string | null;
  filename: string;
}): string {
  const folder = input.kind.toLowerCase();
  if (input.visibility === "PRIVATE") {
    // 按用户分区：注销时可以整段前缀删除
    const user = safeSegment(input.userId, "");
    if (!user) throw new Error("private media requires userId");
    return `private/users/${user}/${safeSegment(input.characterId, "_")}/${folder}/${input.filename}`;
  }
  return `public/characters/${safeSegment(input.characterId, "_")}/${folder}/${input.filename}`;
}

/** PNG 的宽高就在 IHDR 里，不用引图片库 */
function pngSize(body: Buffer): { width: number; height: number } | null {
  if (body.length < 24 || body.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

/** WAV：从 fmt/data 块算时长 */
function wavDurationMs(body: Buffer): number | null {
  if (body.length < 44 || body.toString("ascii", 0, 4) !== "RIFF") return null;
  const byteRate = body.readUInt32LE(28);
  if (!byteRate) return null;
  const dataSize = body.readUInt32LE(40);
  return Math.round((dataSize / byteRate) * 1000);
}

/** 上传字节并登记一条 MediaAsset。 */
export async function storeMediaAsset(input: StoreMediaInput): Promise<MediaAsset> {
  const ext = extFromContentType(input.contentType);
  const key = buildMediaKey({
    visibility: input.visibility,
    kind: input.kind,
    characterId: input.characterId,
    userId: input.userId,
    filename: `${randomUUID()}.${ext}`,
  });

  await putObject({ key, body: input.body, contentType: input.contentType });

  const size = input.kind === "IMAGE" ? pngSize(input.body) : null;
  const durationMs = input.kind === "AUDIO" ? wavDurationMs(input.body) : null;

  try {
    return await prisma.mediaAsset.create({
      data: {
        kind: input.kind,
        visibility: input.visibility,
        storageKey: key,
        contentType: input.contentType,
        bytes: input.body.length,
        width: size?.width ?? null,
        height: size?.height ?? null,
        durationMs,
        sha256: createHash("sha256").update(input.body).digest("hex"),
        source: input.source,
        sourceMeta: input.sourceMeta,
        characterId: input.characterId ?? null,
        userId: input.userId ?? null,
      },
    });
  } catch (err) {
    // 入库失败就把已上传的对象删掉，避免留下没人引用的文件
    await deleteObject(key).catch(() => {});
    throw err;
  }
}

export type MediaViewer = { id: string; role: UserRole } | null;

/** 私有资产的可见性：本人、该角色的作者、管理员 */
export async function canViewMediaAsset(asset: MediaAsset, viewer: MediaViewer): Promise<boolean> {
  if (asset.visibility === "PUBLIC") return true;
  if (!viewer) return false;
  if (viewer.role === "ADMIN") return true;
  if (asset.userId && asset.userId === viewer.id) return true;
  if (asset.characterId) {
    const character = await prisma.character.findUnique({
      where: { id: asset.characterId },
      select: { creatorId: true },
    });
    if (character?.creatorId === viewer.id) return true;
  }
  return false;
}

/**
 * 给前端的地址。
 * PUBLIC 是可缓存的 CDN 直链；PRIVATE 返回鉴权接口，真正的存储地址永不外泄。
 */
export function resolveMediaUrl(
  asset: Pick<MediaAsset, "id" | "visibility" | "storageKey">,
): string {
  return asset.visibility === "PUBLIC" ? publicUrlForKey(asset.storageKey) : `/api/media/${asset.id}`;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;
  await deleteObject(asset.storageKey);
  await prisma.mediaAsset.delete({ where: { id } });
}

/**
 * 删除用户与角色之间的私有媒体（聊天里的图片、语音等）。
 * 挂在订单上的语音是用户买下的东西，与订单一起保留，这里不动。
 */
export async function deleteUserMediaAssets(
  userId: string,
  characterId?: string,
): Promise<number> {
  const assets = await prisma.mediaAsset.findMany({
    where: {
      userId,
      visibility: "PRIVATE",
      ...(characterId ? { characterId } : {}),
      orders: { none: {} },
    },
    select: { id: true, storageKey: true },
  });
  for (const asset of assets) {
    await deleteObject(asset.storageKey).catch((err) =>
      console.error("[media] delete object failed:", asset.storageKey, err),
    );
  }
  const { count } = await prisma.mediaAsset.deleteMany({
    where: { id: { in: assets.map((a) => a.id) } },
  });
  return count;
}

/** 注销账号时用：整段前缀删除该用户的全部私有文件（含订单语音）。 */
export async function deleteAllUserMedia(userId: string): Promise<number> {
  await deleteByPrefix(`private/users/${safeSegment(userId, "")}/`);
  const { count } = await prisma.mediaAsset.deleteMany({ where: { userId } });
  return count;
}
