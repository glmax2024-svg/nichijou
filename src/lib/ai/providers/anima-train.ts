/**
 * Anima 角色 LoRA 训练服务适配（/api/train，OpenAPI v1.2.0）
 *
 * 流程：POST /validations 预校验（不占 GPU）→ POST /jobs 提交 → 轮询 GET /jobs/{id}
 *      → 完成后拿固定版本 lora_id（nj_xxx__v2）用于生图 → DELETE /jobs/{id} 清理
 *
 * 训练参数由服务端固定（2000 步 / rank 32 等），这里不传任何配方。
 * key 与生图共用 ANIMA_API_KEY，只能在服务端调用。
 */

import { createHash } from "crypto";

const TRAIN_API_URL = process.env.ANIMA_TRAIN_API_URL?.replace(/\/$/, "");
const API_KEY = process.env.ANIMA_API_KEY;

/** 服务端上限 512 MiB；留出 multipart 开销 */
export const MAX_UPLOAD_BYTES = 480 * 1024 * 1024;
export const MIN_IMAGES = 5;
export const MAX_IMAGES = 100;

const JSON_TIMEOUT_MS = 30_000;
/** 服务端读入期限 1800s；上百张图在慢网络下需要时间 */
const UPLOAD_TIMEOUT_MS = 15 * 60_000;

export function isAnimaTrainingConfigured(): boolean {
  return Boolean(TRAIN_API_URL && API_KEY);
}

/** 平台内唯一的训练角色名：服务端要求字母开头、仅字母数字下划线、≤64 */
export function remoteCharacterName(characterId: string): string {
  const name = `nj_${characterId.toLowerCase()}`;
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) throw new Error(`invalid character id for training: ${characterId}`);
  return name;
}

/** 幂等键：32 位小写十六进制，由本地任务 id 派生，重试时保持不变 */
export function requestKeyFor(localJobId: string): string {
  return createHash("md5").update(`nichijou-train:${localJobId}`).digest("hex");
}

export type TrainImage = { name: string; body: Buffer; contentType: string };

export type AnimaPlatformStatus = "QUEUED" | "TRAINING" | "READY" | "FAILED";

export type AnimaPreview = {
  angle: "front" | "three_quarter" | "profile";
  label?: string;
  prompt?: string;
  seed?: number;
  sha256: string;
};

/** 只列出平台用到的字段 */
export type AnimaJob = {
  id: string;
  character: string;
  trigger_word: string;
  revision?: number;
  status: string;
  platform_status: AnimaPlatformStatus;
  progress: number;
  step?: number;
  total_steps?: number;
  queue_position?: number | null;
  error?: string | null;
  error_code?: string | null;
  image_count?: number | null;
  duplicates_removed?: number;
  cancel_requested: boolean;
  preview_status?: string;
  previews?: AnimaPreview[];
  ready_for_generation?: boolean;
  lora_id?: string | null;
  lora_alias?: string | null;
  training_started_at?: number | null;
  finished_at?: number | null;
};

export type AnimaValidation = {
  valid: boolean;
  character: string;
  image_count: number;
  duplicates_removed: number;
  normalized_bytes: number;
};

export class AnimaTrainError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "AnimaTrainError";
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${API_KEY}`, ...extra };
}

async function toError(res: Response): Promise<AnimaTrainError> {
  const text = await res.text().catch(() => "");
  try {
    const body = JSON.parse(text) as { detail?: unknown; error?: { code?: string; message?: string } };
    const message =
      body.error?.message ??
      (typeof body.detail === "string" ? body.detail : Array.isArray(body.detail) ? "入力内容が不正です" : null) ??
      `训练服务返回 ${res.status}`;
    return new AnimaTrainError(message, res.status, body.error?.code ?? null);
  } catch {
    return new AnimaTrainError(`训练服务返回 ${res.status}`, res.status, null);
  }
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 带重试的请求。网络中断、502/503/504 会重试；
 * POST /jobs 也能安全重试，因为带着同一个幂等键。
 */
async function request(
  path: string,
  init: RequestInit & { timeoutMs?: number },
  attempts = 3,
): Promise<Response> {
  if (!TRAIN_API_URL || !API_KEY) throw new Error("ANIMA_TRAIN_API_URL / ANIMA_API_KEY not configured");
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${TRAIN_API_URL}${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(init.timeoutMs ?? JSON_TIMEOUT_MS),
      });
      if (!RETRYABLE_STATUS.has(res.status) || i === attempts - 1) return res;
      lastError = await toError(res);
    } catch (err) {
      lastError = err;
    }
    await sleep(800 * 2 ** i);
  }
  throw lastError instanceof Error ? lastError : new Error("训练服务连接失败");
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}

function multipart(character: string, images: TrainImage[]): FormData {
  const form = new FormData();
  form.set("character", character);
  for (const img of images) {
    form.append("images", new Blob([new Uint8Array(img.body)], { type: img.contentType }), img.name);
  }
  return form;
}

function assertImages(images: TrainImage[]) {
  if (images.length < MIN_IMAGES) throw new AnimaTrainError(`训练至少需要 ${MIN_IMAGES} 张图片`, 400, "TOO_FEW_IMAGES");
  if (images.length > MAX_IMAGES) throw new AnimaTrainError(`训练最多 ${MAX_IMAGES} 张图片`, 400, "TOO_MANY_IMAGES");
  const total = images.reduce((s, i) => s + i.body.length, 0);
  if (total > MAX_UPLOAD_BYTES) {
    throw new AnimaTrainError(`图片总大小超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`, 413, "UPLOAD_TOO_LARGE");
  }
}

/** 真实校验与去重，不排队、不占 GPU、不保留图片 */
export async function validateTrainingImages(character: string, images: TrainImage[]): Promise<AnimaValidation> {
  assertImages(images);
  const res = await request("/validations", {
    method: "POST",
    headers: headers(),
    body: multipart(character, images),
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return json<AnimaValidation>(res);
}

export async function createTrainingJob(
  character: string,
  images: TrainImage[],
  requestKey: string,
): Promise<AnimaJob> {
  assertImages(images);
  const res = await request("/jobs", {
    method: "POST",
    headers: headers({ "Idempotency-Key": requestKey }),
    body: multipart(character, images),
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return json<AnimaJob>(res);
}

export async function getTrainingJob(jobId: string): Promise<AnimaJob> {
  return json<AnimaJob>(await request(`/jobs/${encodeURIComponent(jobId)}`, { headers: headers() }));
}

/** 上传中途断网时，用幂等键反查任务是否其实已经提交成功 */
export async function findSubmission(requestKey: string): Promise<AnimaJob | null> {
  const res = await request(`/submissions/${encodeURIComponent(requestKey)}`, { headers: headers() });
  if (res.status === 404) return null;
  return json<AnimaJob>(res);
}

export async function cancelTrainingJob(jobId: string): Promise<void> {
  const res = await request(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST", headers: headers() });
  if (!res.ok && res.status !== 404) throw await toError(res);
}

/** 只能删已结束的任务（进行中的要先 cancel）。任务已不存在视为成功。 */
export async function deleteTrainingJob(jobId: string): Promise<void> {
  const res = await request(`/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE", headers: headers() });
  if (!res.ok && res.status !== 404) throw await toError(res);
}

export async function fetchTrainingPreview(
  jobId: string,
  angle: string,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await request(`/jobs/${encodeURIComponent(jobId)}/previews/${encodeURIComponent(angle)}`, {
    headers: headers(),
    timeoutMs: 60_000,
  });
  if (!res.ok) throw await toError(res);
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "image/png",
  };
}

export function isTerminalStatus(status: string): boolean {
  return ["completed", "failed", "cancelled", "preview_failed"].includes(status);
}
