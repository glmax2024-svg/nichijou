import type { Character, LoraStatus } from "@prisma/client";
import type { BondSnapshot } from "@/lib/agent/bond-display";

export type ChatRole = "user" | "assistant" | "system";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type CharacterPersona = Pick<
  Character,
  "id" | "name" | "personality" | "speechStyle" | "bio" | "loraAdapterId" | "loraStatus" | "voiceEmbeddingId"
> & {
  loraVersion?: number;
  tagline?: string | null;
  identity?: string | null;
  worldRules?: string | null;
  brandVoice?: string | null;
  boundaries?: string | null;
  contentRating?: string | null;
  triggerWord?: string | null;
};

export type MemoryEntry = {
  id: string;
  content: string;
  category: string;
  importance: number;
  source: "memos" | "local";
};

export type LoraAdapterConfig = {
  adapterId: string;
  version: number;
  status: LoraStatus;
  /** Weight hint passed to the LoRA service at inference. */
  weightHint: number;
  triggerWord?: string | null;
};

export type ChatPipelineInput = {
  userId: string;
  character: CharacterPersona;
  history: ChatTurn[];
  userMessage: string;
  /** 成本分档依据 —— 不传按免费用户处理（最省档）。 */
  isSubscribed?: boolean;
  isCreator?: boolean;
};

export type ChatPipelineOutput = {
  reply: string;
  memoriesQueried: MemoryEntry[];
  loraAdapterId: string | null;
  memoryStored: boolean;
  bond: BondSnapshot | null;
};

export type VoiceEnrollInput = {
  characterId: string;
  sampleAudioUrl: string;
  durationSec: number;
};

export type VoiceEnrollResult = {
  embeddingId: string;
  status: "READY" | "ENROLLING";
};

export type LoraTrainInput = {
  characterId: string;
  personality: string;
  speechStyle: string;
  bio: string;
  referenceImageUrls?: string[];
  datasetImages?: { url: string; caption: string }[];
  triggerWord?: string;
  baseModel?: string;
  recipe?: {
    epochs?: number;
    repeats?: number;
    resolution?: number;
    networkDim?: number;
    alpha?: number;
    optimizer?: string;
  };
};

export type LoraTrainResult = {
  jobId: string;
  status: LoraStatus;
  adapterId?: string;
  progress?: number;
};

export type LoraGenerateInput = {
  characterId: string;
  prompt: string;
  negativePrompt?: string;
  weight?: number;
  steps?: number;
  batch?: number;
  /** Studio demo: allow images before READY (cover / asset fallback). */
  allowDemo?: boolean;
  coverUrl?: string;
};

export type LoraGenerateResult = {
  adapterId: string;
  triggerWord: string | null;
  items: Array<{
    id: string;
    imageUrl: string | null;
    textContent: string | null;
    prompt: string;
  }>;
};

export const VOICE_MIN_SAMPLE_SEC = 5;
export const VOICE_MAX_SAMPLE_SEC = 15;
export const MEMOS_QUERY_TOP_K = 8;
