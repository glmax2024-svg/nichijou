/**
 * @deprecated 请使用 @/lib/ai/pipeline — 此文件保留向后兼容 re-export
 */
export {
  runChatPipeline,
  generatePostDraft,
  generateVoiceText,
  synthesizeWithVoiceClone as synthesizeSpeech,
  enrollVoiceProfile,
  enqueueLoraTraining,
  mandatoryMemosQuery,
  mandatoryMemosStore,
} from "./ai/pipeline";

import { runChatPipeline } from "./ai/pipeline";
import type { CharacterPersona, ChatTurn } from "./ai/types";

/** @deprecated Use runChatPipeline. */
export async function generateCharacterReply(
  character: Pick<CharacterPersona, "id" | "name" | "personality" | "speechStyle" | "bio" | "loraAdapterId" | "loraStatus" | "voiceEmbeddingId">,
  history: ChatTurn[],
  userMessage: string,
  userId = "anonymous",
) {
  const result = await runChatPipeline({
    userId,
    character: { ...character, id: character.id ?? "unknown" },
    history,
    userMessage,
  });
  return result.reply;
}
