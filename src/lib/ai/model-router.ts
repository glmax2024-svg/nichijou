/**
 * 模型路由 & 成本控制
 *
 * 原则：**按「谁在付钱 / 输出多显眼 / 调用多频繁」三个维度分档**。
 *   - 付费用户的核心体验 → 高档，不降级
 *   - 免费用户 / 高频后台任务 → 低档，可被预算守卫继续降档
 *   - 输出越短、越模板化 → 越往下压
 *
 * 除了「换模型」，这里还统一控制三个同样重要的省钱旋钮：
 *   maxTokens（输出上限）、historyTurns（上下文轮数）、memoryTopK（记忆条数）。
 * 输入 token 往往比输出更烧钱 —— 截历史比换模型更有效。
 */

import {
  gatewayChat,
  isGatewayConfigured,
  type GatewayMessage,
  type GatewayUsage,
} from "./gateway";
import { getTodayOutputTokens, recordUsage } from "./usage";

export type ModelTier = "nano" | "fast" | "balanced" | "flagship";

/** 由贵到便宜的降档链。 */
export const TIER_CHAIN: ModelTier[] = ["flagship", "balanced", "fast", "nano"];

export const TIER_MODELS: Record<ModelTier, string> = {
  nano: process.env.AI_MODEL_NANO || process.env.AI_MODEL_FAST || "gpt-5.5",
  fast: process.env.AI_MODEL_FAST || "gpt-5.5",
  balanced: process.env.AI_MODEL_BALANCED || "gpt-5.5",
  flagship: process.env.AI_MODEL_FLAGSHIP || "claude-opus-4-8",
};

export const IMAGE_MODEL = process.env.AI_MODEL_IMAGE || "";
export const TTS_MODEL = process.env.AI_MODEL_TTS || "tts-1";
export const TTS_VOICE = process.env.AI_TTS_VOICE || "nova";

export function resolveModel(tier: ModelTier): string {
  return TIER_MODELS[tier];
}

export type AiScene =
  | "chat.free"
  | "chat.subscribed"
  | "chat.creator"
  | "skill.tarot.free"
  | "skill.tarot.paid"
  | "post.comment"
  | "post.draft"
  | "lora.caption"
  | "order.voiceText"
  | "moderation";

export type SceneConfig = {
  tier: ModelTier;
  maxTokens: number;
  temperature: number;
  /** 送进 prompt 的历史消息条数上限（不是轮数）。 */
  historyMessages: number;
  /** 送进 prompt 的记忆条数上限。 */
  memoryTopK: number;
  /** 单条记忆截断长度（字符）。 */
  memoryCharCap: number;
  /** 预算吃紧时是否允许自动降档。付费体验设 false。 */
  downgradable: boolean;
  /** Anthropic 协议下缓存 system 段（人设 prompt 稳定时开）。 */
  cacheSystem: boolean;
  label: string;
};

export const SCENE_CONFIG: Record<AiScene, SceneConfig> = {
  // ── 1:1 聊天 ──
  "chat.subscribed": {
    tier: "balanced",
    maxTokens: 320,
    temperature: 0.78,
    historyMessages: 20,
    memoryTopK: 8,
    memoryCharCap: 200,
    downgradable: false, // 付费核心体验，预算再紧也不降
    cacheSystem: true,
    label: "订阅用户 1:1 聊天",
  },
  "chat.free": {
    tier: "fast",
    maxTokens: 200,
    temperature: 0.8,
    historyMessages: 8,
    memoryTopK: 4,
    memoryCharCap: 120,
    downgradable: true,
    cacheSystem: true,
    label: "免费用户 1:1 聊天（每日 10 条）",
  },
  "chat.creator": {
    tier: "fast",
    maxTokens: 260,
    temperature: 0.8,
    historyMessages: 10,
    memoryTopK: 4,
    memoryCharCap: 150,
    downgradable: true,
    cacheSystem: true,
    label: "画师自测自己的角色",
  },

  // ── 角色技能 ──
  "skill.tarot.paid": {
    tier: "flagship",
    maxTokens: 700,
    temperature: 0.85,
    historyMessages: 0,
    memoryTopK: 4,
    memoryCharCap: 150,
    downgradable: false,
    cacheSystem: true,
    label: "塔罗解读（订阅用户）",
  },
  "skill.tarot.free": {
    tier: "balanced",
    maxTokens: 480,
    temperature: 0.85,
    historyMessages: 0,
    memoryTopK: 2,
    memoryCharCap: 120,
    downgradable: true,
    cacheSystem: true,
    label: "塔罗解读（demo free）",
  },

  // ── 内容生产 ──
  "post.comment": {
    tier: "nano",
    maxTokens: 100,
    temperature: 0.85,
    historyMessages: 0,
    memoryTopK: 0,
    memoryCharCap: 80,
    downgradable: true,
    cacheSystem: false,
    label: "帖子评论自动回复（1–2 句，量最大）",
  },
  "post.draft": {
    tier: "balanced",
    maxTokens: 220,
    temperature: 0.9,
    historyMessages: 0,
    memoryTopK: 0,
    memoryCharCap: 80,
    downgradable: true,
    cacheSystem: false,
    label: "画师 SNS 日常文案草稿",
  },
  "lora.caption": {
    tier: "fast",
    maxTokens: 200,
    temperature: 0.9,
    historyMessages: 0,
    memoryTopK: 0,
    memoryCharCap: 80,
    downgradable: true,
    cacheSystem: false,
    label: "LoRA 出图配套文案（批量）",
  },
  "order.voiceText": {
    tier: "flagship",
    maxTokens: 160,
    temperature: 0.8,
    historyMessages: 0,
    memoryTopK: 0,
    memoryCharCap: 80,
    downgradable: false, // 单次付费订单，字少钱多
    cacheSystem: false,
    label: "生日 / 叫醒 / 定制语音文案",
  },
  "moderation": {
    tier: "nano",
    maxTokens: 16,
    temperature: 0,
    historyMessages: 0,
    memoryTopK: 0,
    memoryCharCap: 0,
    downgradable: true,
    cacheSystem: false,
    label: "内容审核判定",
  },
};

/** AI_SCENE_TIER_OVERRIDES='{"chat.free":"nano","post.draft":"fast"}' */
const TIER_OVERRIDES: Partial<Record<AiScene, ModelTier>> = (() => {
  const raw = process.env.AI_SCENE_TIER_OVERRIDES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Partial<Record<AiScene, ModelTier>> = {};
    for (const [scene, tier] of Object.entries(parsed)) {
      if (scene in SCENE_CONFIG && TIER_CHAIN.includes(tier as ModelTier)) {
        out[scene as AiScene] = tier as ModelTier;
      }
    }
    return out;
  } catch {
    console.warn("[model-router] AI_SCENE_TIER_OVERRIDES 不是合法 JSON，已忽略");
    return {};
  }
})();

export function getSceneConfig(scene: AiScene): SceneConfig {
  const base = SCENE_CONFIG[scene];
  const override = TIER_OVERRIDES[scene];
  return override ? { ...base, tier: override } : base;
}

/** 根据用户身份选聊天场景。 */
export function pickChatScene(opts: { isSubscribed?: boolean; isCreator?: boolean }): AiScene {
  if (opts.isCreator) return "chat.creator";
  return opts.isSubscribed ? "chat.subscribed" : "chat.free";
}

export function pickTarotScene(isSubscribed?: boolean): AiScene {
  return isSubscribed ? "skill.tarot.paid" : "skill.tarot.free";
}

// ── 预算守卫 ────────────────────────────────────────────────

const DAILY_OUTPUT_BUDGET = Number(process.env.AI_DAILY_OUTPUT_TOKEN_BUDGET ?? 0);
const SOFT_RATIO = 0.8;

export type BudgetState = "ok" | "soft" | "hard";

export async function getBudgetState(): Promise<BudgetState> {
  if (!Number.isFinite(DAILY_OUTPUT_BUDGET) || DAILY_OUTPUT_BUDGET <= 0) return "ok";
  const used = await getTodayOutputTokens();
  if (used >= DAILY_OUTPUT_BUDGET) return "hard";
  if (used >= DAILY_OUTPUT_BUDGET * SOFT_RATIO) return "soft";
  return "ok";
}

function stepDown(tier: ModelTier, steps: number): ModelTier {
  const idx = TIER_CHAIN.indexOf(tier);
  return TIER_CHAIN[Math.min(TIER_CHAIN.length - 1, idx + steps)];
}

/** 预算吃紧时对「可降档」场景下调档位。 */
export async function applyBudgetGuard(
  scene: AiScene,
  config: SceneConfig,
): Promise<SceneConfig> {
  if (!config.downgradable) return config;
  const state = await getBudgetState();
  if (state === "ok") return config;

  const tier = state === "hard" ? "nano" : stepDown(config.tier, 1);
  if (tier === config.tier) return config;

  console.warn(`[model-router] 预算 ${state}，${scene} 降档 ${config.tier} → ${tier}`);
  return {
    ...config,
    tier,
    maxTokens: state === "hard" ? Math.min(config.maxTokens, 160) : config.maxTokens,
  };
}

// ── 统一执行入口 ────────────────────────────────────────────

export type RunSceneParams = {
  scene: AiScene;
  messages: GatewayMessage[];
  userId?: string | null;
  characterId?: string | null;
  /** 覆盖场景默认值（少用；优先改 SCENE_CONFIG）。 */
  maxTokens?: number;
  temperature?: number;
};

export type RunSceneResult = {
  text: string;
  scene: AiScene;
  tier: ModelTier;
  model: string;
  usage: GatewayUsage;
  /** 是否因为失败而落到了更便宜的档位。 */
  degraded: boolean;
};

/**
 * 按场景执行一次对话调用：
 *   选档 → 预算守卫 → 调网关 → 记账；失败沿降档链重试更便宜的模型。
 */
export async function runSceneChat(params: RunSceneParams): Promise<RunSceneResult> {
  const { scene, messages, userId, characterId } = params;

  if (!isGatewayConfigured()) {
    throw new Error("AI gateway 未配置");
  }

  const base = await applyBudgetGuard(scene, getSceneConfig(scene));
  const startIdx = TIER_CHAIN.indexOf(base.tier);
  const chain = TIER_CHAIN.slice(startIdx);
  const seen = new Set<string>();

  let lastErr: unknown;

  for (let i = 0; i < chain.length; i++) {
    const tier = chain[i];
    const model = resolveModel(tier);
    // 不同档位配了同一个模型时不必重复尝试
    if (seen.has(model)) continue;
    seen.add(model);

    try {
      const result = await gatewayChat({
        model,
        messages,
        maxTokens: params.maxTokens ?? base.maxTokens,
        temperature: params.temperature ?? base.temperature,
        cacheSystem: base.cacheSystem,
      });

      recordUsage({
        scene,
        tier,
        model,
        protocol: result.protocol,
        usage: result.usage,
        latencyMs: result.latencyMs,
        ok: true,
        userId,
        characterId,
      });

      if (!result.text) throw new Error("empty completion");

      return {
        text: result.text,
        scene,
        tier,
        model,
        usage: result.usage,
        degraded: i > 0,
      };
    } catch (err) {
      lastErr = err;
      recordUsage({
        scene,
        tier,
        model,
        protocol: "openai",
        usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
        latencyMs: 0,
        ok: false,
        userId,
        characterId,
        errorMsg: err instanceof Error ? err.message : String(err),
      });
      console.error(`[model-router] ${scene} @${tier}(${model}) 失败，尝试降档:`, err);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(`[model-router] ${scene} 全部档位失败`);
}
