/**
 * Zetta TTS 适配（日语语音合成）
 *
 * 服务目前只有一个固定声线、没有声纹登记接口，
 * 所以用 Character.voiceEmbeddingId = "zetta:<voice>" 标记该角色走 Zetta。
 * <voice> 暂时只做占位（服务端不认），等服务支持多声线后透传。
 */

const ZETTA_API_URL = process.env.ZETTA_API_URL?.replace(/\/$/, "");
const ZETTA_API_KEY = process.env.ZETTA_API_KEY;

const VOICE_PREFIX = "zetta:";
const TIMEOUT_MS = 60_000;
/** 服务端 SpeechRequest.text 上限 */
const MAX_TEXT_CHARS = 2000;

export function isZettaTtsConfigured(): boolean {
  return Boolean(ZETTA_API_URL && ZETTA_API_KEY);
}

export function isZettaVoice(embeddingId: string | null | undefined): boolean {
  return Boolean(embeddingId?.startsWith(VOICE_PREFIX));
}

/** 返回 WAV（32kHz / 16bit / mono）。 */
export async function synthesizeZetta(
  text: string,
  opts: { speed?: number } = {},
): Promise<Buffer> {
  if (!ZETTA_API_URL || !ZETTA_API_KEY) throw new Error("ZETTA_API_URL / ZETTA_API_KEY not configured");
  if (process.env.NODE_ENV === "production" && !/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(ZETTA_API_URL)) {
    throw new Error("ZETTA_API_URL must use HTTPS in production");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ZETTA_API_KEY) headers.Authorization = `Bearer ${ZETTA_API_KEY}`;

  const res = await fetch(`${ZETTA_API_URL}/api/tts`, {
    method: "POST",
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      text: text.slice(0, MAX_TEXT_CHARS),
      ...(opts.speed !== undefined ? { speed: opts.speed } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Zetta TTS error: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
