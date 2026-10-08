/**
 * Anima LoRA 生图服务适配（ComfyUI 后端）
 *
 * 服务只有固定的几个 LoRA，没有「每个角色一个 adapter」的概念，
 * 所以用 Character.loraAdapterId = "anima:<lora>" 把角色绑定到某个 LoRA。
 *
 * 服务强制鉴权（Bearer），图片下载也要带 key —— 远程地址绝不能给前端，调用方需要下载后转存。
 * 服务端按原样使用 prompt，触发词由调用方（角色 triggerWord）前置。
 */

const ANIMA_API_URL = process.env.ANIMA_API_URL?.replace(/\/$/, "");
const ANIMA_API_KEY = process.env.ANIMA_API_KEY;

const ADAPTER_PREFIX = "anima:";
// 服务重启后首张图要加载模型，实测冷启动约 85s
const TIMEOUT_MS = 180_000;

export function isAnimaConfigured(): boolean {
  return Boolean(ANIMA_API_URL && ANIMA_API_KEY);
}

function assertSecureUrl(url: string) {
  // key 走请求头，明文 HTTP 会被截获；本地调试地址除外
  if (process.env.NODE_ENV === "production" && !/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("ANIMA_API_URL must use HTTPS in production");
  }
}

/** "anima:augmented" → "augmented"；不是 Anima 绑定则返回 null。 */
export function parseAnimaAdapter(adapterId: string | null | undefined): string | null {
  if (!adapterId?.startsWith(ADAPTER_PREFIX)) return null;
  const lora = adapterId.slice(ADAPTER_PREFIX.length).trim();
  return lora || null;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (ANIMA_API_KEY) h.Authorization = `Bearer ${ANIMA_API_KEY}`;
  return h;
}

export type AnimaImage = {
  body: Buffer;
  contentType: string;
  remoteId: string;
  /** 服务端实际使用的 seed，用于复现 */
  seed: number | null;
};

/** 服务要求宽高是 16 的倍数，范围 64–2048 */
function snap16(n: number): number {
  return Math.min(2048, Math.max(64, Math.round(n / 16) * 16));
}

type GenerateResponse = { id: string; image_url: string; seed?: number; triggerWord?: string };

async function generateOnce(params: {
  lora: string;
  prompt: string;
  negativePrompt?: string;
  strength: number;
  steps: number;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<AnimaImage> {
  const res = await fetch(`${ANIMA_API_URL}/generate`, {
    method: "POST",
    headers: headers(),
    // HTTP→HTTPS 的跨域跳转会丢掉 Authorization，宁可直接失败也不要静默 401
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      prompt: params.prompt,
      // 服务端有自己的默认负面词，未指定时不覆盖
      ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
      lora: params.lora,
      lora_strength: Math.min(2, Math.max(0, params.strength)),
      steps: Math.min(100, Math.max(1, params.steps)),
      width: snap16(params.width ?? 1024),
      height: snap16(params.height ?? 1024),
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Anima generate error: ${res.status} ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as Partial<GenerateResponse>;
  if (!data.image_url) throw new Error("Anima generate returned no image_url");

  const img = await fetch(`${ANIMA_API_URL}${data.image_url}`, {
    headers: ANIMA_API_KEY ? { Authorization: `Bearer ${ANIMA_API_KEY}` } : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!img.ok) throw new Error(`Anima image fetch error: ${img.status}`);

  return {
    body: Buffer.from(await img.arrayBuffer()),
    contentType: img.headers.get("content-type") ?? "image/png",
    remoteId: data.id ?? "",
    seed: typeof data.seed === "number" ? data.seed : null,
  };
}

/** 网关偶发 502/503/504（GPU 机器经隧道接入），以及网络抖动，重试两次 */
const RETRYABLE = /Anima (generate|image fetch) error: 50[234]\b|fetch failed|aborted|timeout/i;

async function generateOne(params: Parameters<typeof generateOnce>[0]): Promise<AnimaImage> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await generateOnce(params);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof Error) || !RETRYABLE.test(err.message) || attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

/** 服务一次只出一张图；按 batch 串行调用，避免单卡排队互相拖慢。 */
export async function generateAnimaImages(params: {
  lora: string;
  prompt: string;
  negativePrompt?: string;
  strength: number;
  steps: number;
  batch: number;
  width?: number;
  height?: number;
  seed?: number;
}): Promise<AnimaImage[]> {
  if (!ANIMA_API_URL || !ANIMA_API_KEY) throw new Error("ANIMA_API_URL / ANIMA_API_KEY not configured");
  assertSecureUrl(ANIMA_API_URL);

  const images: AnimaImage[] = [];
  for (let i = 0; i < params.batch; i++) {
    images.push(await generateOne(params));
  }
  return images;
}

export type AnimaLoraInfo = {
  id: string;
  triggerWord?: string;
  /** 从训练标注统计出的推荐提示词前缀，如 "laiwanting, one girl, red hair" */
  recommendedPromptPrefix?: string;
};

/** 生图服务的动态 LoRA 目录（训练完成并注册后会出现在这里） */
export async function getAnimaLora(id: string): Promise<AnimaLoraInfo | null> {
  if (!ANIMA_API_URL || !ANIMA_API_KEY) return null;
  const res = await fetch(`${ANIMA_API_URL}/loras`, {
    headers: headers(),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Anima loras error: ${res.status}`);
  const data = (await res.json()) as { loras?: AnimaLoraInfo[] };
  return data.loras?.find((l) => l.id === id) ?? null;
}

/** 生图目录里的全部固定版本（默认不含别名） */
export async function listAnimaLoras(): Promise<(AnimaLoraInfo & { character?: string; revision?: number })[]> {
  if (!ANIMA_API_URL || !ANIMA_API_KEY) throw new Error("ANIMA_API_URL / ANIMA_API_KEY not configured");
  const res = await fetch(`${ANIMA_API_URL}/loras`, { headers: headers(), redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Anima loras error: ${res.status}`);
  return ((await res.json()) as { loras?: (AnimaLoraInfo & { character?: string; revision?: number })[] }).loras ?? [];
}

export type AnimaManifestEntry = {
  lora_id: string;
  name: string;
  gender: "female" | "male" | string;
  /** original | existing | null（来源未确认） */
  origin: string | null;
  originVerified?: boolean;
  source_work: string | null;
  notes?: string;
  recommendedPromptPrefix?: string;
};

/** 正式角色清单（名字、性别、来源），按 lora_id 与目录关联 */
export async function getAnimaManifest(): Promise<AnimaManifestEntry[]> {
  if (!ANIMA_API_URL || !ANIMA_API_KEY) throw new Error("ANIMA_API_URL / ANIMA_API_KEY not configured");
  const res = await fetch(`${ANIMA_API_URL}/loras/manifest`, { headers: headers(), redirect: "error", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Anima manifest error: ${res.status}`);
  const data = (await res.json()) as AnimaManifestEntry[] | { entries: AnimaManifestEntry[] };
  return Array.isArray(data) ? data : data.entries;
}
