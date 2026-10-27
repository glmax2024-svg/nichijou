/**
 * Zetta / nichijou-v1 角色聊天。
 * OpenAI 兼容 POST /v1/chat/completions；传入 system 时服务端不再注入内置角色。
 */

import type { GatewayMessage, GatewayUsage } from "@/lib/ai/gateway";

const ZETTA_API_URL = process.env.ZETTA_API_URL?.replace(/\/$/, "");
const ZETTA_API_KEY = process.env.ZETTA_API_KEY;
const CHAT_MODEL = process.env.ZETTA_CHAT_MODEL || "nichijou-v1";
const TIMEOUT_MS = toPositiveInt(process.env.ZETTA_CHAT_TIMEOUT_MS, 90_000);
const MAX_RETRIES = 2;
const MAX_MESSAGES = 64;
const MAX_TOKENS = 8192;

export function isZettaChatConfigured(): boolean {
  return Boolean(ZETTA_API_URL && ZETTA_API_KEY);
}

export function zettaChatModel(): string {
  return CHAT_MODEL;
}

export type ZettaChatResult = {
  text: string;
  model: string;
  usage: GatewayUsage;
  latencyMs: number;
};

export async function chatZetta(input: {
  messages: GatewayMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ZettaChatResult> {
  if (!ZETTA_API_URL || !ZETTA_API_KEY) {
    throw new Error("ZETTA_API_URL / ZETTA_API_KEY not configured");
  }
  if (
    process.env.NODE_ENV === "production" &&
    !/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(ZETTA_API_URL)
  ) {
    throw new Error("ZETTA_API_URL must use HTTPS in production");
  }

  const messages = trimMessages(input.messages);
  if (!messages.some((m) => m.role === "user")) {
    throw new Error("Zetta chat requires a user message");
  }

  const payload = {
    model: CHAT_MODEL,
    messages,
    max_tokens: clampTokens(input.maxTokens ?? 500),
    temperature: input.temperature ?? 0.8,
    stream: false,
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ZETTA_API_KEY) headers.Authorization = `Bearer ${ZETTA_API_KEY}`;

  let lastErr: Error | null = null;
  const started = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${ZETTA_API_URL}/v1/chat/completions`, {
        method: "POST",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify(payload),
      });

      if (res.status === 503 && attempt < MAX_RETRIES) {
        await sleep(800 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Zetta chat error: ${res.status} ${detail.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        model?: string;
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Zetta chat returned empty content");

      return {
        text,
        model: data.model || CHAT_MODEL,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          cachedInputTokens: 0,
        },
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const retryable =
        lastErr.name === "TimeoutError" ||
        lastErr.name === "AbortError" ||
        /Zetta chat error: 50[234]/.test(lastErr.message);
      if (!retryable || attempt >= MAX_RETRIES) break;
      await sleep(800 * (attempt + 1));
    }
  }

  throw lastErr ?? new Error("Zetta chat failed");
}

function trimMessages(messages: GatewayMessage[]): GatewayMessage[] {
  const cleaned = messages.filter((m) => m.content?.trim());
  if (cleaned.length <= MAX_MESSAGES) return cleaned;
  const systems = cleaned.filter((m) => m.role === "system").slice(0, 4);
  const rest = cleaned.filter((m) => m.role !== "system");
  const budget = Math.max(1, MAX_MESSAGES - systems.length);
  return [...systems, ...rest.slice(-budget)];
}

function clampTokens(n: number) {
  if (!Number.isFinite(n)) return 500;
  return Math.min(MAX_TOKENS, Math.max(1, Math.floor(n)));
}

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
