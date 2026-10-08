import type { BondSnapshot } from "@/lib/agent/bond-display";
import { formatBondForPrompt } from "@/lib/agent/relationship";
import { normalizeBoundaries } from "@/lib/agent/defaults";

/** 回复语言跟随用户；设定文是日语也不强制日语 */
export const REPLY_LANGUAGE_RULE =
  "ユーザーの最新メッセージと同じ言語で返答する（日本語なら日本語、中文なら中文、English なら English）。一つの返答の中で言語を混ぜず、どの言語でもキャラクターの性格・口調を保つ";

/** 不要舞台说明式的动作描写，只输出角色说出口的话 */
export const NO_ACTION_RULE =
  "セリフだけを書く。*照れる* や（目をそらす）のような動作・表情・情景の描写は書かない";

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
- 常にキャラクターとして返答する
- ${REPLY_LANGUAGE_RULE}
- ${NO_ACTION_RULE}
- 上記の永久记忆と関係スナップショットの事実を矛盾なく反映する
- 設定から外れた内容（OOC）は避ける
- 短めで親しみやすい口調にする
- ユーザーとの関係性を大切にする`;
}

const KANA = /[぀-ヿ]/;
const HANGUL = /[가-힯]/;
const HAN = /[一-鿿]/g;
const LATIN = /[A-Za-z]/g;
/** 简体特有的常用字；出现则按简体中文回复，否则按繁体 */
const SIMPLIFIED_HINT = /[谢话请认识欢迎爱乐书试语晚饭喜欢觉得们这个来说没对吗么还让过时会为们们见点问发经样学买东车门开关长头边进实现钱]/;

/** 繁体特有的常用字 */
const TRADITIONAL_HINT = /[們這個來說沒對嗎麼還讓過時會為見點問發經樣學買東車門開關長頭邊進實現錢謝話請認識歡迎愛樂書試語飯歡覺妳嗎麼裡]/;

/**
 * 判断用户这句话用的语言，给提示词末尾加一条明确指令（埋在长篇日语设定里的规则模型常常忽略）。
 * 判断不了（太短、纯汉字可能是日语等）就返回 null，交给通用规则。
 */
export function detectReplyLanguage(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (KANA.test(t)) return "日本語";
  if (HANGUL.test(t)) return "한국어";
  const han = t.match(HAN)?.length ?? 0;
  const latin = t.match(LATIN)?.length ?? 0;
  if (han >= 2 && han >= latin) {
    // 纯汉字的短句（「了解」「本当」之类）可能是日语，不强行判定
    if (han < 4 && !/[吗呢吧啊呀嘛哦么你我他她们]/.test(t)) return null;
    if (SIMPLIFIED_HINT.test(t)) return "简体中文";
    if (TRADITIONAL_HINT.test(t)) return "繁體中文";
    return "中文（ユーザーと同じ字体）";
  }
  if (latin >= 3) return "English";
  return null;
}

export function replyLanguageInstruction(userMessage: string): string {
  const lang = detectReplyLanguage(userMessage);
  if (!lang) return "";
  return `\n\n## 返答言語（最優先）\n今回のユーザーは${lang}で話している。設定文が日本語でも、返答は必ず${lang}だけで書く。キャラクターの性格・口調はそのまま保つ。`;
}
