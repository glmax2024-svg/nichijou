import { prisma } from "@/lib/prisma";
import { resolveMediaUrl, storeMediaAsset } from "@/lib/media";

/** TTS 各路径返回的格式不同（Zetta 是 WAV，网关是 MP3），按文件头判断 */
function sniffAudioType(audio: Buffer): string {
  if (audio.length >= 12 && audio.toString("ascii", 0, 4) === "RIFF") return "audio/wav";
  if (audio.length >= 3 && audio.toString("ascii", 0, 3) === "ID3") return "audio/mpeg";
  if (audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return "application/octet-stream";
}

/**
 * 把订单语音存为该用户的私有资产并挂到订单上。
 * 之前这里的音频生成完就丢了，用户付了钱拿不到文件。
 */
export async function persistOrderVoice(params: {
  orderId: string;
  userId: string;
  characterId: string;
  audio: Buffer | null;
}): Promise<string | null> {
  if (!params.audio || params.audio.length === 0) return null;

  const asset = await storeMediaAsset({
    kind: "AUDIO",
    visibility: "PRIVATE",
    body: params.audio,
    contentType: sniffAudioType(params.audio),
    source: "tts",
    characterId: params.characterId,
    userId: params.userId,
    sourceMeta: { orderId: params.orderId },
  });

  const voiceUrl = resolveMediaUrl(asset);
  await prisma.order.update({
    where: { id: params.orderId },
    data: { voiceAssetId: asset.id, voiceUrl },
  });
  return voiceUrl;
}
