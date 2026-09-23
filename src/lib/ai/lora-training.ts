/**
 * 角色 LoRA 训练（Anima 训练服务）。
 *
 * 规则：
 * - 固定版本：训练完成得到 nj_xxx__vN，角色引用固定版本。已有可用版本的角色重训后，
 *   新版本不会自动生效，由画师看过预览后手动「设为使用中」；首个版本自动生效。
 * - 额度：每位画师每月 3 次（日本时间自然月），管理员不限。
 *   在训练真正开始之前失败/取消的任务退还额度。
 * - 训练中不改变角色当前使用的版本，已上线角色重训期间照常生图。
 */

import type { LoraStatus, LoraTrainingJob, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { deleteMediaAsset, resolveMediaUrl, storeMediaAsset } from "@/lib/media";
import { getAnimaLora } from "./providers/anima";
import {
  AnimaTrainError,
  cancelTrainingJob,
  createTrainingJob,
  deleteTrainingJob,
  fetchTrainingPreview,
  findSubmission,
  getTrainingJob,
  isTerminalStatus,
  remoteCharacterName,
  requestKeyFor,
  validateTrainingImages,
  type AnimaJob,
  type TrainImage,
} from "./providers/anima-train";

export const MONTHLY_TRAINING_LIMIT = 3;

export class TrainingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "TrainingError";
  }
}

type Actor = { id: string; role: UserRole };

// ───────────────────────── 额度 ─────────────────────────

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本时间当月 1 日 0 点、下月 1 日 0 点（UTC 时刻） */
function jstMonthRange(now = new Date()) {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const start = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET_MS;
  const next = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 1) - JST_OFFSET_MS;
  return { start: new Date(start), resetsAt: new Date(next) };
}

export type TrainingQuota = {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string;
};

export async function getTrainingQuota(actor: Actor): Promise<TrainingQuota> {
  const { start, resetsAt } = jstMonthRange();
  const used = await prisma.loraTrainingCharge.count({
    where: { creatorId: actor.id, createdAt: { gte: start } },
  });
  if (actor.role === "ADMIN") return { limit: null, used, remaining: null, resetsAt: resetsAt.toISOString() };
  return {
    limit: MONTHLY_TRAINING_LIMIT,
    used,
    remaining: Math.max(0, MONTHLY_TRAINING_LIMIT - used),
    resetsAt: resetsAt.toISOString(),
  };
}

// ───────────────────────── 训练素材 ─────────────────────────

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Studio 上传后拿到的是地址（/uploads/lora/…、/media/lora/… 或 CDN 地址），这里还原成存储 key。
 * 只接受这个角色自己的 lora/<characterId>/ 目录，防止借训练接口读取别的文件。
 */
function datasetKeyFromUrl(url: string, characterId: string): string {
  const clean = url.split("?")[0];
  const base = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const prefixes = ["/uploads/", "/media/", ...(base ? [`${base}/`] : [])];
  const prefix = prefixes.find((p) => clean.startsWith(p));
  if (!prefix) throw new TrainingError("训练素材地址不正确", 400, "BAD_DATASET_URL");
  const key = decodeURIComponent(clean.slice(prefix.length));
  if (!key.startsWith(`lora/${characterId}/`) || key.split("/").some((s) => s === ".." || s === "")) {
    throw new TrainingError("训练素材不属于这个角色", 403, "FOREIGN_DATASET");
  }
  return key;
}

async function loadDataset(characterId: string, imageUrls: string[]): Promise<TrainImage[]> {
  const unique = [...new Set(imageUrls)];
  const images: TrainImage[] = [];
  for (const url of unique) {
    const key = datasetKeyFromUrl(url, characterId);
    const body = await getObject(key);
    if (!body) throw new TrainingError("有训练素材已经找不到了，请重新上传", 400, "DATASET_MISSING");
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) throw new TrainingError(`不支持的图片格式：${ext}`, 400, "BAD_FORMAT");
    images.push({ name: key.split("/").pop()!, body, contentType });
  }
  return images;
}

function wrapRemoteError(err: unknown): never {
  if (err instanceof AnimaTrainError) throw new TrainingError(err.message, err.status >= 500 ? 502 : err.status, err.code);
  throw new TrainingError("训练服务暂时连接不上，请稍后再试", 502, "TRAIN_SERVICE_UNAVAILABLE");
}

/** 提交前的真实校验（去重、格式、数量），不占 GPU、不消耗额度 */
export async function validateTrainingDataset(characterId: string, imageUrls: string[]) {
  const images = await loadDataset(characterId, imageUrls);
  try {
    return await validateTrainingImages(remoteCharacterName(characterId), images);
  } catch (err) {
    wrapRemoteError(err);
  }
}

// ───────────────────────── 提交 ─────────────────────────

/** 角色当前是否已经有一个正在使用的训练版本（或预置的 anima LoRA） */
function hasActiveVersion(character: { loraAdapterId: string | null; loraStatus: LoraStatus }) {
  return character.loraStatus === "READY" && Boolean(character.loraAdapterId?.startsWith("anima:"));
}

export async function startTraining(params: { characterId: string; actor: Actor; imageUrls: string[] }) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: params.characterId },
    select: { id: true, creatorId: true, loraAdapterId: true, loraStatus: true },
  });

  const quota = await getTrainingQuota(params.actor);
  if (quota.remaining === 0) {
    throw new TrainingError(`本月训练次数已用完（每月 ${MONTHLY_TRAINING_LIMIT} 次）`, 429, "QUOTA_EXCEEDED");
  }

  const running = await prisma.loraTrainingJob.findFirst({
    where: { characterId: character.id, provider: "anima", status: { in: ["QUEUED", "TRAINING"] } },
    select: { id: true },
  });
  if (running) throw new TrainingError("这个角色已经有训练在进行中", 409, "ALREADY_TRAINING");

  // 先读素材，读不到就不扣额度
  const images = await loadDataset(character.id, params.imageUrls);
  const remoteCharacter = remoteCharacterName(character.id);

  const job = await prisma.loraTrainingJob.create({
    data: {
      characterId: character.id,
      provider: "anima",
      status: "QUEUED",
      progress: 0,
      remoteCharacter,
      imageCount: images.length,
      datasetNote: JSON.stringify({ images: params.imageUrls.map((url) => ({ url, caption: "" })) }),
    },
  });
  const requestKey = requestKeyFor(job.id);
  await prisma.loraTrainingJob.update({ where: { id: job.id }, data: { requestKey } });
  await prisma.loraTrainingCharge.create({
    data: { creatorId: character.creatorId, characterId: character.id, jobId: job.id },
  });

  // 首次训练的角色，状态跟着训练走；已有可用版本的角色保持原样，训练期间照常生图
  if (!hasActiveVersion(character)) {
    await prisma.character.update({ where: { id: character.id }, data: { loraStatus: "QUEUED" } });
  }

  let remote: AnimaJob;
  try {
    remote = await createTrainingJob(remoteCharacter, images, requestKey);
  } catch (err) {
    // 上传过程中断网：服务端可能其实收到了，用幂等键确认一次
    const recovered = await findSubmission(requestKey).catch(() => null);
    if (!recovered) {
      await failBeforeStart(job, err instanceof Error ? err.message : "提交失败");
      wrapRemoteError(err);
    }
    remote = recovered;
  }

  return applyRemote(job, remote);
}

async function failBeforeStart(job: LoraTrainingJob, message: string) {
  await prisma.loraTrainingJob.update({
    where: { id: job.id },
    data: { status: "FAILED", errorMsg: message, finishedAt: new Date() },
  });
  await refundIfUnstarted(job.id);
  await syncCharacterStatus(job.characterId);
}

// ───────────────────────── 同步 ─────────────────────────

function mapStatus(remote: AnimaJob): LoraStatus {
  if (remote.platform_status === "FAILED") return "FAILED";
  if (remote.status === "cancelled") return "FAILED";
  // 服务端可能先报 READY、预览还在生成；以「真的能生图」为准
  if (remote.platform_status === "READY") return remote.ready_for_generation ? "READY" : "TRAINING";
  return remote.platform_status === "QUEUED" ? "QUEUED" : "TRAINING";
}

const secToDate = (sec?: number | null) => (sec ? new Date(sec * 1000) : null);

async function applyRemote(job: LoraTrainingJob, remote: AnimaJob): Promise<LoraTrainingJob> {
  const status = mapStatus(remote);
  const updated = await prisma.loraTrainingJob.update({
    where: { id: job.id },
    data: {
      remoteJobId: remote.id,
      remoteStatus: remote.status,
      status,
      progress: status === "READY" ? 100 : Math.round(Math.max(0, Math.min(1, remote.progress ?? 0)) * 100),
      step: remote.step ?? null,
      totalSteps: remote.total_steps ?? null,
      queuePosition: remote.queue_position ?? null,
      revision: remote.revision ?? null,
      loraId: remote.lora_id ?? null,
      readyForGeneration: Boolean(remote.ready_for_generation),
      triggerWord: remote.trigger_word,
      errorCode: remote.error_code ?? null,
      errorMsg: remote.status === "cancelled" ? "已取消" : (remote.error ?? null),
      imageCount: remote.image_count ?? job.imageCount,
      duplicatesRemoved: remote.duplicates_removed ?? null,
      trainingStartedAt: secToDate(remote.training_started_at),
      startedAt: job.startedAt ?? secToDate(remote.training_started_at),
      finishedAt: isTerminalStatus(remote.status) ? (secToDate(remote.finished_at) ?? new Date()) : null,
    },
  });

  if (status === "FAILED") await refundIfUnstarted(job.id);
  return updated;
}

/** 训练还没真正开始就失败或取消的，退还本次额度 */
async function refundIfUnstarted(jobId: string) {
  const job = await prisma.loraTrainingJob.findUnique({
    where: { id: jobId },
    select: { trainingStartedAt: true },
  });
  if (job && !job.trainingStartedAt) {
    await prisma.loraTrainingCharge.deleteMany({ where: { jobId } });
  }
}

type StoredPreview = { angle: string; assetId: string; url: string };

async function storePreviews(job: LoraTrainingJob, remote: AnimaJob, creatorId: string) {
  if (!remote.previews?.length || job.previews) return;
  const stored: StoredPreview[] = [];
  for (const preview of remote.previews) {
    try {
      const image = await fetchTrainingPreview(remote.id, preview.angle);
      const asset = await storeMediaAsset({
        kind: "IMAGE",
        // 预览只给画师自己看，发布前不公开
        visibility: "PRIVATE",
        body: image.body,
        contentType: image.contentType,
        source: "anima-train",
        characterId: job.characterId,
        userId: creatorId,
        sourceMeta: { jobId: job.id, remoteJobId: remote.id, angle: preview.angle, seed: preview.seed ?? null },
      });
      stored.push({ angle: preview.angle, assetId: asset.id, url: resolveMediaUrl(asset) });
    } catch (err) {
      console.error("[lora-training] preview fetch failed:", preview.angle, err);
    }
  }
  if (stored.length) {
    await prisma.loraTrainingJob.update({
      where: { id: job.id },
      data: { previews: stored as unknown as Prisma.InputJsonValue },
    });
  }
}

/** 没有正在使用的版本时，角色状态跟随最新一次训练，方便 Studio 展示 */
async function syncCharacterStatus(characterId: string) {
  const character = await prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    select: { loraAdapterId: true, loraStatus: true },
  });
  if (hasActiveVersion(character)) return;
  const latest = await prisma.loraTrainingJob.findFirst({
    where: { characterId, provider: "anima" },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  if (latest && latest.status !== "READY") {
    await prisma.character.update({ where: { id: characterId }, data: { loraStatus: latest.status } });
  }
}

/** Studio 轮询时调用：拉取远端最新状态，完成后保存预览、首个版本自动生效 */
export async function syncTrainingJob(job: LoraTrainingJob): Promise<LoraTrainingJob> {
  if (!job.remoteJobId) return job;
  const needsPreviews = job.status === "READY" && !job.previews;
  if (job.status !== "QUEUED" && job.status !== "TRAINING" && !needsPreviews) return job;

  const character = await prisma.character.findUniqueOrThrow({
    where: { id: job.characterId },
    select: { creatorId: true, loraAdapterId: true, loraStatus: true },
  });

  let remote: AnimaJob;
  try {
    remote = await getTrainingJob(job.remoteJobId);
  } catch (err) {
    console.error("[lora-training] sync failed:", err);
    return job;
  }

  let updated = await applyRemote(job, remote);
  if (remote.preview_status === "completed" || remote.status === "completed") {
    await storePreviews(updated, remote, character.creatorId);
  }

  if (updated.status === "READY" && updated.loraId && !hasActiveVersion(character)) {
    updated = await activateVersion(updated.id);
  }
  await syncCharacterStatus(job.characterId);
  return prisma.loraTrainingJob.findUniqueOrThrow({ where: { id: updated.id } });
}

// ───────────────────────── 发布 / 取消 ─────────────────────────

/** 把某个训练版本设为角色当前使用的版本 */
export async function activateVersion(jobId: string): Promise<LoraTrainingJob> {
  const job = await prisma.loraTrainingJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status !== "READY" || !job.readyForGeneration || !job.loraId) {
    throw new TrainingError("这个版本还不能使用", 409, "NOT_READY");
  }

  // 推荐提示词前缀来自训练标注统计，比单独的触发词更能稳定角色外观
  const info = await getAnimaLora(job.loraId).catch(() => null);
  await prisma.character.update({
    where: { id: job.characterId },
    data: {
      loraAdapterId: `anima:${job.loraId}`,
      loraStatus: "READY",
      loraVersion: job.revision ?? undefined,
      triggerWord: info?.recommendedPromptPrefix || job.triggerWord || undefined,
    },
  });
  return prisma.loraTrainingJob.update({ where: { id: jobId }, data: { activatedAt: new Date() } });
}

export async function cancelTraining(jobId: string): Promise<LoraTrainingJob> {
  const job = await prisma.loraTrainingJob.findUniqueOrThrow({ where: { id: jobId } });
  if (!job.remoteJobId || (job.status !== "QUEUED" && job.status !== "TRAINING")) {
    throw new TrainingError("这个训练已经结束了", 409, "NOT_ACTIVE");
  }
  try {
    await cancelTrainingJob(job.remoteJobId);
  } catch (err) {
    wrapRemoteError(err);
  }
  return syncTrainingJob(job);
}

// ───────────────────────── 删除 ─────────────────────────

/**
 * 删除角色在训练服务上的全部任务与版本。
 * 进行中的先取消；删不掉的（例如取消还没生效）记到 PendingRemoteDeletion 之后重试。
 */
export async function deleteRemoteTrainingData(characterId: string) {
  const jobs = await prisma.loraTrainingJob.findMany({
    where: { characterId, remoteJobId: { not: null } },
    select: { id: true, remoteJobId: true, status: true, previews: true },
  });

  for (const job of jobs) {
    const remoteId = job.remoteJobId!;
    try {
      if (job.status === "QUEUED" || job.status === "TRAINING") await cancelTrainingJob(remoteId);
      await deleteTrainingJob(remoteId);
    } catch (err) {
      await prisma.pendingRemoteDeletion.upsert({
        where: { remoteId },
        create: { kind: "anima-train-job", remoteId, lastError: String(err) },
        update: { lastError: String(err), attempts: { increment: 1 } },
      });
    }
    for (const p of (job.previews as StoredPreview[] | null) ?? []) {
      await deleteMediaAsset(p.assetId).catch(() => {});
    }
  }
}

/** 重试之前没删掉的远端任务（删除角色时顺带执行，也可以单独跑） */
export async function retryPendingRemoteDeletions(limit = 20) {
  const pending = await prisma.pendingRemoteDeletion.findMany({
    where: { kind: "anima-train-job" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const item of pending) {
    try {
      await cancelTrainingJob(item.remoteId).catch(() => {});
      await deleteTrainingJob(item.remoteId);
      await prisma.pendingRemoteDeletion.delete({ where: { id: item.id } });
    } catch (err) {
      await prisma.pendingRemoteDeletion.update({
        where: { id: item.id },
        data: { attempts: { increment: 1 }, lastError: String(err) },
      });
    }
  }
}
