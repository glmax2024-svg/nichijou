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
import { FailClosedError, isDemoMode } from "@/lib/runtime";

const TTS_API_URL = process.env.TTS_CLONE_API_URL;
const TTS_API_KEY = process.env.TTS_CLONE_API_KEY;

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
    embeddingId = await enrollRemote(sampleAudioUrl, durationSec);
  } else if (isDemoMode()) {
    embeddingId = await enrollSimulated(characterId, sampleAudioUrl, durationSec);
  } else {
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

async function enrollRemote(sampleAudioUrl: string, durationSec: number): Promise<string> {
  const res = await fetch(`${TTS_API_URL}/v1/voice/enroll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TTS_API_KEY}`,
    },
    body: JSON.stringify({
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

async function enrollSimulated(
  characterId: string,
  sampleAudioUrl: string,
  durationSec: number,
): Promise<string> {
  const hash = Buffer.from(`${characterId}:${sampleAudioUrl}:${durationSec}`)
    .toString("base64url")
    .slice(0, 16);
  return `voice_emb_${hash}`;
}

/** Synthesize speech with a registered voiceprint. */
export async function synthesizeWithVoiceClone(
  text: string,
  embeddingId: string | null | undefined,
): Promise<Buffer | null> {
  if (embeddingId && TTS_API_URL && TTS_API_KEY) {
    try {
      const res = await fetch(`${TTS_API_URL}/v1/voice/synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TTS_API_KEY}`,
        },
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
