/**
 * Nichijou AI Pipeline — 对话推理主链路
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  1. Memos Query (强制)  →  检索用户×角色永久记忆         │
 * │  2. LoRA Resolve        →  加载角色人设 adapter          │
 * │  3. LLM Generate        →  记忆+LoRA 注入后生成回复     │
 * │  4. Memos Store (强制)  →  写入新记忆                    │
 * └─────────────────────────────────────────────────────────┘
 */

import type { ChatPipelineInput, ChatPipelineOutput } from "./types";
import { mandatoryMemosQuery, mandatoryMemosStore } from "./memos-plugin";
import { resolveLoraAdapter } from "./lora";
import { generateWithPersona } from "./llm";
import { pickChatScene } from "./model-router";
import { loadBond, recordBondInteraction } from "@/lib/agent/relationship";

export async function runChatPipeline(input: ChatPipelineInput): Promise<ChatPipelineOutput> {
  const { userId, character, history, userMessage } = input;

  // 成本档位：付费用户走中档且不降级，免费用户走低档且可被预算守卫继续降档
  const scene = pickChatScene({
    isSubscribed: input.isSubscribed,
    isCreator: input.isCreator,
  });

  // Step 1: required Memos memory lookup
  const memoriesQueried = await mandatoryMemosQuery({
    userId,
    characterId: character.id,
    query: userMessage,
  });

  // Step 2: resolve LoRA adapter
  const loraConfig = await resolveLoraAdapter(character);
  const bond = await loadBond(userId, character.id);

  // Step 3: LLM inference (memory + LoRA + persona/bond)
  const reply = await generateWithPersona({
    character,
    history,
    userMessage,
    memories: memoriesQueried,
    loraConfig,
    scene,
    userId,
    bond,
  });

  // Step 4: required Memos memory write
  const memoryStored = await mandatoryMemosStore({
    userId,
    characterId: character.id,
    userMessage,
    assistantReply: reply,
  });

  const nextBond = await recordBondInteraction({
    userId,
    characterId: character.id,
    type: "chat",
    summary: userMessage,
    delta: 1,
  });

  return {
    reply,
    memoriesQueried,
    loraAdapterId: loraConfig?.adapterId ?? null,
    memoryStored,
    bond: nextBond,
  };
}

export { mandatoryMemosQuery, mandatoryMemosStore } from "./memos-plugin";
export { resolveLoraAdapter, enqueueLoraTraining, getLoraJobStatus, tickLoraJobProgress, generateWithLora } from "./lora";
export { enrollVoiceProfile, synthesizeWithVoiceClone, getVoiceProfile, validateSampleDuration } from "./tts-voice-clone";
export { generatePostDraft, generateVoiceText } from "./llm";
export type * from "./types";
export {
  runSceneChat,
  getSceneConfig,
  pickChatScene,
  pickTarotScene,
  getBudgetState,
  SCENE_CONFIG,
  TIER_MODELS,
} from "./model-router";
export { isGatewayConfigured } from "./gateway";
export { getUsageSummary } from "./usage";
