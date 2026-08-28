/**
 * Nichijou AI Gateway — 中转站统一客户端
 *
 * 中转站同时暴露三种协议，按模型名自动选择：
 *   openai     POST {base}/v1/chat/completions                  Authorization: Bearer
 *   anthropic  POST {base}/v1/messages                          x-api-key + anthropic-version
 *   gemini     POST {base}/v1beta/models/{model}:generateContent x-goog-api-key
 *
 * 若中转站已把所有模型归一到 OpenAI 协议，设 AI_GATEWAY_PROTOCOL=openai 全局强制。
 *
 * 这一层只负责「怎么调」；「什么时候调哪个」在 model-router.ts。
 */

export type GatewayProtocol = "openai" | "anthropic" | "gemini";

export type GatewayRole = "system" | "user" | "assistant";

export type GatewayMessage = { role: GatewayRole; content: string };

export type GatewayUsage = {
  inputTokens: number;
  outputTokens: number;
  /** 命中缓存的输入 token（计费通常打 1–2 折，用来衡量 prompt cache 效果）。 */
  cachedInputTokens: number;
};

export type GatewayChatParams = {
  model: string;
  messages: GatewayMessage[];
  maxTokens?: number;
  temperature?: number;
  protocol?: GatewayProtocol;
  timeoutMs?: number;
  /** Anthropic 协议下把 system 段标为可缓存 —— 人设 prompt 稳定，命中率高。 */
  cacheSystem?: boolean;
};

export type GatewayChatResult = {
  text: string;
  model: string;
  protocol: GatewayProtocol;
  usage: GatewayUsage;
  latencyMs: number;
  attempts: number;
};

const BASE_URL = (process.env.AI_GATEWAY_BASE_URL ?? "").replace(/\/+$/, "");
const API_KEY = process.env.AI_GATEWAY_API_KEY ?? "";
const ANTHROPIC_VERSION = process.env.AI_GATEWAY_ANTHROPIC_VERSION ?? "2023-06-01";
const DEFAULT_TIMEOUT_MS = toPositiveInt(process.env.AI_GATEWAY_TIMEOUT_MS, 30_000);
const MAX_RETRIES = toPositiveInt(process.env.AI_GATEWAY_MAX_RETRIES, 2);
const FORCED_PROTOCOL = normalizeProtocol(process.env.AI_GATEWAY_PROTOCOL);

const EMPTY_USAGE: GatewayUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

function toPositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function normalizeProtocol(value?: string): GatewayProtocol | null {
  return value === "openai" || value === "anthropic" || value === "gemini" ? value : null;
}

export function isGatewayConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

/** 按模型名推断协议；AI_GATEWAY_PROTOCOL 可全局覆盖。 */
export function detectProtocol(model: string): GatewayProtocol {
  if (FORCED_PROTOCOL) return FORCED_PROTOCOL;
  const m = model.toLowerCase();
  if (m.startsWith("gemini")) return "gemini";
  if (m.startsWith("claude")) return "anthropic";
  return "openai";
}

export class GatewayError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.retryable = retryable;
  }
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number) {
  const base = 400 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
}

async function gatewayFetch(
  path: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

/** 带超时 + 指数退避重试的通用执行器。 */
async function withRetry<T>(
  label: string,
  run: () => Promise<T>,
): Promise<{ value: T; attempts: number }> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const value = await run();
      return { value, attempts: attempt + 1 };
    } catch (err) {
      lastErr = err;
      const retryable =
        err instanceof GatewayError
          ? err.retryable
          : err instanceof Error && (err.name === "AbortError" || err.name === "TypeError");

      if (!retryable || attempt === MAX_RETRIES) break;
      const wait = backoffMs(attempt);
      console.warn(`[gateway] ${label} attempt ${attempt + 1} failed, retrying in ${wait}ms:`, err);
      await sleep(wait);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(`[gateway] ${label} failed`);
}

// ── 协议适配 ────────────────────────────────────────────────

type ProtocolCall = {
  path: string;
  headers: Record<string, string>;
  body: unknown;
  parse: (json: unknown) => { text: string; usage: GatewayUsage };
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function splitSystem(messages: GatewayMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");
  return { system, rest };
}

function buildOpenAiCall(params: GatewayChatParams): ProtocolCall {
  return {
    path: "/v1/chat/completions",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: {
      model: params.model,
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    },
    parse: (json) => {
      const data = json as {
        choices?: { message?: { content?: string | null } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          prompt_tokens_details?: { cached_tokens?: number };
        };
      };
      return {
        text: data.choices?.[0]?.message?.content?.trim() ?? "",
        usage: {
          inputTokens: num(data.usage?.prompt_tokens),
          outputTokens: num(data.usage?.completion_tokens),
          cachedInputTokens: num(data.usage?.prompt_tokens_details?.cached_tokens),
        },
      };
    },
  };
}

function buildAnthropicCall(params: GatewayChatParams): ProtocolCall {
  const { system, rest } = splitSystem(params.messages);
  const systemField =
    system && params.cacheSystem
      ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }]
      : system || undefined;

  return {
    path: "/v1/messages",
    headers: { "x-api-key": API_KEY, "anthropic-version": ANTHROPIC_VERSION },
    body: {
      model: params.model,
      max_tokens: params.maxTokens ?? 1024,
      temperature: params.temperature,
      system: systemField,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    },
    parse: (json) => {
      const data = json as {
        content?: { type?: string; text?: string }[];
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          cache_read_input_tokens?: number;
        };
      };
      const text = (data.content ?? [])
        .filter((block) => block.type === "text" && typeof block.text === "string")
        .map((block) => block.text as string)
        .join("")
        .trim();
      return {
        text,
        usage: {
          inputTokens: num(data.usage?.input_tokens),
          outputTokens: num(data.usage?.output_tokens),
          cachedInputTokens: num(data.usage?.cache_read_input_tokens),
        },
      };
    },
  };
}

function buildGeminiCall(params: GatewayChatParams): ProtocolCall {
  const { system, rest } = splitSystem(params.messages);

  return {
    path: `/v1beta/models/${encodeURIComponent(params.model)}:generateContent`,
    headers: { "x-goog-api-key": API_KEY },
    body: {
      contents: rest.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: {
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature,
      },
    },
    parse: (json) => {
      const data = json as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          cachedContentTokenCount?: number;
        };
      };
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      return {
        text,
        usage: {
          inputTokens: num(data.usageMetadata?.promptTokenCount),
          outputTokens: num(data.usageMetadata?.candidatesTokenCount),
          cachedInputTokens: num(data.usageMetadata?.cachedContentTokenCount),
        },
      };
    },
  };
}

function buildCall(protocol: GatewayProtocol, params: GatewayChatParams): ProtocolCall {
  if (protocol === "anthropic") return buildAnthropicCall(params);
  if (protocol === "gemini") return buildGeminiCall(params);
  return buildOpenAiCall(params);
}

// ── 对外接口 ────────────────────────────────────────────────

export async function gatewayChat(params: GatewayChatParams): Promise<GatewayChatResult> {
  if (!isGatewayConfigured()) {
    throw new GatewayError("AI gateway 未配置（缺 AI_GATEWAY_BASE_URL / AI_GATEWAY_API_KEY）", 0, false);
  }

  const protocol = params.protocol ?? detectProtocol(params.model);
  const call = buildCall(protocol, params);
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  const { value, attempts } = await withRetry(`chat ${params.model}`, async () => {
    const res = await gatewayFetch(call.path, call.headers, call.body, timeoutMs);
    if (!res.ok) {
      const detail = await readError(res);
      throw new GatewayError(
        `${protocol} ${res.status}: ${detail}`,
        res.status,
        RETRYABLE_STATUS.has(res.status),
      );
    }
    return call.parse(await res.json());
  });

  return {
    text: value.text,
    model: params.model,
    protocol,
    usage: value.usage,
    latencyMs: Date.now() - startedAt,
    attempts,
  };
}

export type GatewayImageParams = {
  model: string;
  prompt: string;
  negativePrompt?: string;
  n?: number;
  size?: string;
  timeoutMs?: number;
};

export type GatewayImageResult = {
  /** http(s) URL 或 data:image/... base64 URI */
  images: string[];
  model: string;
  latencyMs: number;
};

/** 生图 —— 走 OpenAI 兼容的 /v1/images/generations。 */
export async function gatewayImage(params: GatewayImageParams): Promise<GatewayImageResult> {
  if (!isGatewayConfigured()) {
    throw new GatewayError("AI gateway 未配置", 0, false);
  }

  const startedAt = Date.now();
  const timeoutMs = params.timeoutMs ?? Math.max(DEFAULT_TIMEOUT_MS, 60_000);

  const { value } = await withRetry(`image ${params.model}`, async () => {
    const res = await gatewayFetch(
      "/v1/images/generations",
      { Authorization: `Bearer ${API_KEY}` },
      {
        model: params.model,
        prompt: params.negativePrompt
          ? `${params.prompt}\n\nAvoid: ${params.negativePrompt}`
          : params.prompt,
        n: params.n ?? 1,
        size: params.size ?? "1024x1024",
      },
      timeoutMs,
    );
    if (!res.ok) {
      const detail = await readError(res);
      throw new GatewayError(`image ${res.status}: ${detail}`, res.status, RETRYABLE_STATUS.has(res.status));
    }
    const data = (await res.json()) as {
      data?: { url?: string; b64_json?: string }[];
      images?: string[];
    };
    const images = (
      data.images ??
      (data.data ?? []).map((d) =>
        d.url ? d.url : d.b64_json ? `data:image/png;base64,${d.b64_json}` : "",
      )
    ).filter(Boolean);
    if (images.length === 0) throw new GatewayError("image response empty", 502, true);
    return images;
  });

  return { images: value, model: params.model, latencyMs: Date.now() - startedAt };
}

export type GatewaySpeechParams = {
  model: string;
  voice: string;
  input: string;
  format?: string;
  timeoutMs?: number;
};

/** TTS —— 走 OpenAI 兼容的 /v1/audio/speech，返回音频二进制。 */
export async function gatewaySpeech(params: GatewaySpeechParams): Promise<Buffer> {
  if (!isGatewayConfigured()) {
    throw new GatewayError("AI gateway 未配置", 0, false);
  }

  const timeoutMs = params.timeoutMs ?? Math.max(DEFAULT_TIMEOUT_MS, 45_000);

  const { value } = await withRetry(`speech ${params.model}`, async () => {
    const res = await gatewayFetch(
      "/v1/audio/speech",
      { Authorization: `Bearer ${API_KEY}` },
      {
        model: params.model,
        voice: params.voice,
        input: params.input,
        response_format: params.format ?? "mp3",
      },
      timeoutMs,
    );
    if (!res.ok) {
      const detail = await readError(res);
      throw new GatewayError(`speech ${res.status}: ${detail}`, res.status, RETRYABLE_STATUS.has(res.status));
    }
    return Buffer.from(await res.arrayBuffer());
  });

  return value;
}

export const GATEWAY_EMPTY_USAGE = EMPTY_USAGE;
