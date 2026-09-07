/**
 * LLM 推理层 — 整合 LoRA 人设 + Memos 记忆注入 system prompt
 *
 * 调用优先级（成本从低到高）：
 *   1. 自建 LoRA 推理服务（自有算力，且能保人设）—— 角色 adapter READY 且配置了 URL
 *   2. 中转站网关，按场景分档（见 model-router.ts）
 *   3. 仅 Demo：静态兜底文案。生产环境网关失败则抛错。
 */

import type { CharacterPersona, ChatTurn, LoraAdapterConfig, MemoryEntry } from "./types";
import { buildLoraSystemAugment, loraWorkerHeaders } from "./lora";
import { formatMemoriesForPrompt } from "./memos-plugin";
import { runSceneChat, getSceneConfig, type AiScene } from "./model-router";
import type { GatewayMessage } from "./gateway";
import { FailClosedError, isDemoMode } from "@/lib/runtime";
import { buildPersonaSystemPrompt } from "@/lib/agent/prompt";
import type { BondSnapshot } from "@/lib/agent/bond-display";

const LORA_INFERENCE_URL = process.env.LORA_INFERENCE_API_URL;
const LORA_INFERENCE_API_KEY = process.env.LORA_INFERENCE_API_KEY;

type GenerateParams = {
  character: CharacterPersona;
  history: ChatTurn[];
  userMessage: string;
  memories: MemoryEntry[];
  loraConfig: LoraAdapterConfig | null;
  /** 决定档位 / 上下文预算，默认按免费用户处理（最省）。 */
  scene?: AiScene;
  userId?: string | null;
  bond?: BondSnapshot | null;
};

export async function generateWithPersona(params: GenerateParams): Promise<string> {
  const scene = params.scene ?? "chat.free";
  const config = getSceneConfig(scene);
  const messages = buildMessages(params, scene);

  // 1. 自建 LoRA 推理优先 —— 自有算力，且人设一致性最好
  if (params.loraConfig && LORA_INFERENCE_URL) {
    try {
      return await generateViaLoraInference(params, messages, config.maxTokens);
    } catch (err) {
      console.error("[llm] LoRA inference failed, falling back to gateway:", err);
    }
  }

  // 2. 中转站网关（按场景分档 + 预算守卫 + 失败降档）
  try {
    const result = await runSceneChat({
      scene,
      messages,
      userId: params.userId,
      characterId: params.character.id,
    });
    return result.text;
  } catch (err) {
    console.error("[llm] gateway failed:", err);
    if (!isDemoMode()) {
      throw err instanceof FailClosedError
        ? err
        : new FailClosedError("AI 网关不可用", "AI_GATEWAY_UNAVAILABLE");
    }
  }

  const memoryHint =
    params.memories.length > 0 ? `\n（記憶: ${params.memories[0].content.slice(0, 40)}…）` : "";
  return `${params.character.name}：うん、聞いてるよ！${memoryHint}（AI_GATEWAY_API_KEY を設定すると AI 返信が有効になります）`;
}

async function generateViaLoraInference(
  params: GenerateParams,
  messages: GatewayMessage[],
  maxTokens: number,
): Promise<string> {
  const { loraConfig } = params;

  const headers = loraWorkerHeaders(LORA_INFERENCE_API_KEY, params.character.id);

  const res = await fetch(`${LORA_INFERENCE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      adapter_id: loraConfig!.adapterId,
      weight: loraConfig!.weightHint,
      messages,
      max_tokens: maxTokens,
      temperature: 0.75,
    }),
  });

  if (!res.ok) throw new Error(`LoRA inference error: ${res.status}`);

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = data.choices[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("LoRA inference returned empty content");
  return text;
}

/**
 * 组装 prompt。
 *
 * 省钱要点：历史轮数和记忆条数都按场景裁剪 —— 输入 token 往往比输出更贵，
 * 免费用户只给 8 条历史 / 4 条记忆，订阅用户才给全量。
 */
function buildMessages(params: GenerateParams, scene: AiScene): GatewayMessage[] {
  const { character, history, userMessage, memories, loraConfig } = params;
  const config = getSceneConfig(scene);

  const trimmedMemories = memories.slice(0, config.memoryTopK).map((m) => ({
    ...m,
    content:
      m.content.length > config.memoryCharCap
        ? `${m.content.slice(0, config.memoryCharCap)}…`
        : m.content,
  }));

  const loraAugment = buildLoraSystemAugment(loraConfig);
  const memoryBlock = formatMemoriesForPrompt(trimmedMemories);

  const systemPrompt = buildPersonaSystemPrompt({
    character,
    memoryBlock,
    loraAugment,
    bond: params.bond,
  });

  const recentHistory =
    config.historyMessages > 0
      ? history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-config.historyMessages)
      : [];

  return [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];
}

export async function generatePostDraft(
  character: CharacterPersona,
  loraConfig: LoraAdapterConfig | null,
  scene: AiScene = "post.draft",
): Promise<string> {
  const loraAugment = buildLoraSystemAugment(loraConfig);

  try {
    const result = await runSceneChat({
      scene,
      characterId: character.id || null,
      messages: [
        {
          role: "system",
          content: `あなたは「${character.name}」の日常を SNS に投稿するアシスタントです。
${buildPersonaSystemPrompt({ character, memoryBlock: "（なし）", loraAugment })}
140字以内で、今日の出来事風の投稿を1つ書いてください。`,
        },
        { role: "user", content: "今日の日常投稿を書いて" },
      ],
    });
    if (result.text) return result.text;
  } catch (err) {
    console.error("[llm] post draft failed:", err);
  }

  return "今日もいい天気。放課後、友達とカフェに行く予定✨";
}

export async function generateVoiceText(
  character: CharacterPersona,
  orderType: "BIRTHDAY" | "WAKE_UP" | "CUSTOM",
  customText?: string,
): Promise<string> {
  if (orderType === "CUSTOM" && customText) return customText;

  const prompts: Record<string, string> = {
    BIRTHDAY: "誕生日を祝う、温かくてキャラらしい短いメッセージ（50字以内）",
    WAKE_UP: "朝起こす、元気で優しい短いメッセージ（50字以内）",
    CUSTOM: "ファンへの感謝メッセージ（50字以内）",
  };

  try {
    const result = await runSceneChat({
      scene: "order.voiceText",
      characterId: character.id || null,
      messages: [
        {
          role: "system",
          content: `キャラクター「${character.name}」として。性格: ${character.personality}。話し方: ${character.speechStyle}`,
        },
        { role: "user", content: prompts[orderType] },
      ],
    });
    if (result.text) return result.text;
  } catch (err) {
    console.error("[llm] voice text failed:", err);
  }

  return orderType === "WAKE_UP"
    ? "おはよう！今日も一緒に頑張ろうね。"
    : "誕生日おめでとう！いつも応援してくれてありがとう。";
}
