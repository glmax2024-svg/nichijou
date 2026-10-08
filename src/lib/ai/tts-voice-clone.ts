/**
 * TTS 声纹克隆 — 5 秒音频精准采集
 *
 * 仅需 5–15 秒参考音频即可提取 embedding，用于后续所有语音合成。
 */

import { prisma } from "@/lib/prisma";
import type { VoiceEnrollInput, VoiceEnrollResult } from "./types";
import { VOICE_MIN_SAMPLE_SEC, VOICE_MAX_SAMPLE_SEC } from "./types";
import { gatewaySpeech, isGatewayConfigured } from "./gateway";
import { TTS_MODEL, TTS_VOICE } from "./model-router";
import { FailClosedError } from "@/lib/runtime";
import { isZettaTtsConfigured, isZettaVoice, synthesizeZetta } from "./providers/zetta-tts";

const TTS_API_URL = process.env.TTS_CLONE_API_URL;
const TTS_API_KEY = process.env.TTS_CLONE_API_KEY;

function voiceWorkerHeaders(characterId: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Nichijou-Character-Id": characterId,
  };
  if (TTS_API_KEY) headers.Authorization = `Bearer ${TTS_API_KEY}`;
  return headers;
}

export function validateSampleDuration(durationSec: number): string | null {
  if (durationSec < VOICE_MIN_SAMPLE_SEC) {
    return `参考音频至少需要 ${VOICE_MIN_SAMPLE_SEC} 秒，当前 ${durationSec.toFixed(1)} 秒`;
  }
  if (durationSec > VOICE_MAX_SAMPLE_SEC) {
    return `参考音频建议不超过 ${VOICE_MAX_SAMPLE_SEC} 秒`;
  }
  return null;
}

/** 5s voiceprint enrollment — extract a voice embedding. */
export async function enrollVoiceProfile(input: VoiceEnrollInput): Promise<VoiceEnrollResult> {
  const { characterId, sampleAudioUrl, durationSec } = input;

  const err = validateSampleDuration(durationSec);
  if (err) throw new Error(err);

  const profile = await prisma.voiceProfile.upsert({
    where: { characterId },
    create: {
      characterId,
      sampleAudioUrl,
      durationSec,
      status: "ENROLLING",
    },
    update: {
      sampleAudioUrl,
      durationSec,
      status: "ENROLLING",
      embeddingId: null,
    },
  });

  let embeddingId: string;

  if (TTS_API_URL && TTS_API_KEY) {
    embeddingId = await enrollRemote(characterId, sampleAudioUrl, durationSec);
  } else {
    // 不再伪造声纹 id：没有声纹服务就如实报错
    await prisma.voiceProfile.update({ where: { id: profile.id }, data: { status: "FAILED" } });
    throw new FailClosedError("声纹克隆服务未配置", "TTS_CLONE_UNAVAILABLE");
  }

  await prisma.voiceProfile.update({
    where: { id: profile.id },
    data: {
      embeddingId,
      status: "READY",
      enrolledAt: new Date(),
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: { voiceEmbeddingId: embeddingId },
  });

  return { embeddingId, status: "READY" };
}

async function enrollRemote(
  characterId: string,
  sampleAudioUrl: string,
  durationSec: number,
): Promise<string> {
  const res = await fetch(`${TTS_API_URL}/v1/voice/enroll`, {
    method: "POST",
    headers: voiceWorkerHeaders(characterId),
    body: JSON.stringify({
      character_id: characterId,
      audio_url: sampleAudioUrl,
      duration_sec: durationSec,
      min_sample_sec: VOICE_MIN_SAMPLE_SEC,
      // Fast 5s voiceprint capture mode
      mode: "fast_fingerprint",
    }),
  });

  if (!res.ok) throw new Error(`TTS enroll failed: ${res.status}`);

  const data = (await res.json()) as { embedding_id: string };
  return data.embedding_id;
}

/** Synthesize speech with a registered voiceprint. */
export async function synthesizeWithVoiceClone(
  text: string,
  embeddingId: string | null | undefined,
  characterId?: string,
): Promise<Buffer | null> {
  // Zetta 日语 TTS（角色通过 voiceEmbeddingId = "zetta:<voice>" 绑定）
  if (isZettaVoice(embeddingId) && isZettaTtsConfigured()) {
    try {
      return await synthesizeZetta(text);
    } catch (err) {
      console.error("[tts] zetta synthesis failed, falling back:", err);
    }
  }

  if (embeddingId && !isZettaVoice(embeddingId) && TTS_API_URL && TTS_API_KEY && characterId) {
    try {
      const res = await fetch(`${TTS_API_URL}/v1/voice/synthesize`, {
        method: "POST",
        headers: voiceWorkerHeaders(characterId),
        body: JSON.stringify({
          embedding_id: embeddingId,
          text,
          language: "ja",
        }),
      });

      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch (err) {
      console.error("[tts] clone synthesis failed, falling back:", err);
    }
  }

  // 声纹克隆不可用时降级到网关通用 TTS（丢角色声线，但不至于没有语音）
  if (!isGatewayConfigured()) return null;

  try {
    return await gatewaySpeech({ model: TTS_MODEL, voice: TTS_VOICE, input: text });
  } catch (err) {
    console.error("[tts] gateway speech failed:", err);
    return null;
  }
}

export async function getVoiceProfile(characterId: string) {
  return prisma.voiceProfile.findUnique({ where: { characterId } });
}
