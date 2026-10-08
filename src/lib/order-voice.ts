import type { MediaAsset } from "@prisma/client";
import { deleteMediaAsset, storeMediaAsset } from "@/lib/media";

/** TTS 各路径返回的格式不同（Zetta 是 WAV，网关是 MP3），按文件头判断 */
function sniffAudioType(audio: Buffer): string {
  if (audio.length >= 12 && audio.toString("ascii", 0, 4) === "RIFF") return "audio/wav";
  if (audio.length >= 3 && audio.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
  if (audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return "application/octet-stream";
}

/**
 * 订单语音存为该用户的私有资产。在建单之前调用：
 * 先存好音频再扣款建单，保证不会出现「付了钱拿不到语音」。
 */
export function storeOrderVoice(params: { userId: string; characterId: string; audio: Buffer }): Promise<MediaAsset> {
  return storeMediaAsset({
    kind: "AUDIO",
    visibility: "PRIVATE",
    body: params.audio,
    contentType: sniffAudioType(params.audio),
    source: "tts",
    characterId: params.characterId,
    userId: params.userId,
    sourceMeta: { purpose: "order" },
  });
}

/** 建单失败时清掉已经上传的音频 */
export async function discardOrderVoice(assetId: string) {
  await deleteMediaAsset(assetId).catch((err) => console.error("[order-voice] cleanup failed:", err));
}
