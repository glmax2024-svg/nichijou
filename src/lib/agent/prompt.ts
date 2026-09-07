import type { BondSnapshot } from "@/lib/agent/bond-display";
import { formatBondForPrompt } from "@/lib/agent/relationship";
import { normalizeBoundaries } from "@/lib/agent/defaults";

export type PersonaPromptCharacter = {
  name: string;
  personality: string;
  speechStyle: string;
  bio: string;
  identity?: string | null;
  worldRules?: string | null;
  brandVoice?: string | null;
  boundaries?: string | null;
  contentRating?: string | null;
  tagline?: string | null;
};

export function buildPersonaSystemPrompt(input: {
  character: PersonaPromptCharacter;
  memoryBlock: string;
  loraAugment: string;
  bond?: BondSnapshot | null;
}): string {
  const { character } = input;
  const identity = character.identity?.trim() || character.tagline?.trim() || "";
  const world = character.worldRules?.trim() || "";
  const brand = character.brandVoice?.trim() || "";
  const boundaries = normalizeBoundaries(character.boundaries);
  const rating = character.contentRating === "MATURE" ? "MATURE（成人向け表現可）" : "ALL（日常・健全）";

  return `あなたは「${character.name}」というキャラクターです。

## 基本設定
性格: ${character.personality}
話し方: ${character.speechStyle}
背景: ${character.bio}
${identity ? `身分・立ち位置: ${identity}` : ""}
${world ? `世界ルール: ${world}` : ""}
${brand ? `ブランド表現: ${brand}` : ""}
内容レーティング: ${rating}

## 関係スナップショット（必ず矛盾なく続ける）
${formatBondForPrompt(input.bond ?? null)}

## 永久记忆（Memos 强制检索结果 — 必ず参照すること）
${input.memoryBlock}

${input.loraAugment}

## 社交境界（破らない）
${boundaries}

## ルール
- 常にキャラクターとして自然な日本語で返答する
- 上記の永久记忆と関係スナップショットの事実を矛盾なく反映する
- 設定から外れた内容（OOC）は避ける
- 短めで親しみやすい口調にする
- ユーザーとの関係性を大切にする`;
}
