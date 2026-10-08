import type { CharacterPersona } from "@/lib/ai/types";
import type { DrawnTarotCard } from "@/lib/skills/tarot";
import { formatDrawnCards } from "@/lib/skills/tarot";
import { runSceneChat, pickTarotScene } from "@/lib/ai/model-router";
import { FailClosedError } from "@/lib/runtime";
import { NO_ACTION_RULE, REPLY_LANGUAGE_RULE, replyLanguageInstruction } from "@/lib/agent/prompt";
import { stripStageDirections } from "@/lib/agent/stage-directions";

export async function generateTarotReading(
  character: CharacterPersona,
  cards: DrawnTarotCard[],
  userQuestion?: string,
  /** 订阅用户走旗舰档（长文展示性强）；demo free 走中档。 */
  isSubscribed = false,
): Promise<string> {
  const spread = formatDrawnCards(cards);
  const questionLine = userQuestion?.trim()
    ? `ユーザーの質問・悩み：${userQuestion.trim()}`
    : "ユーザーは具体的な質問をしていません。恋愛・日常全般として読み解いてください。";

  try {
    const result = await runSceneChat({
      scene: pickTarotScene(isSubscribed),
      characterId: character.id || null,
      messages: [
      {
        role: "system",
        content: `あなたは「${character.name}」というキャラクターです。タロット占い師として、引かれたカードをもとに温かく具体的に読み解きます。

性格: ${character.personality}
話し方: ${character.speechStyle}
背景: ${character.bio}
${character.identity ? `身分: ${character.identity}` : ""}
${character.boundaries ? `社交境界:\n${character.boundaries}` : ""}

## ルール
- ${REPLY_LANGUAGE_RULE}（質問がなければ日本語）
- ${NO_ACTION_RULE}
- 3枚のスプレッド（過去・現在・未来）を順に解釈し、最後に総合メッセージ
- 各カードの正位置/逆位置の意味を反映する
- 400字程度、親しみやすく、前向きに締める
- 占い結果の後、ユーザーにひとつ質問を返す${replyLanguageInstruction(userQuestion ?? "")}`,
      },
      {
        role: "user",
        content: `${questionLine}

## 引かれたカード
${spread}`,
      },
      ],
    });
    if (result.text) return stripStageDirections(result.text);
  } catch (err) {
    console.error("[tarot] reading generation failed:", err);
  }
  // 不再用固定文案冒充占卜结果：生成失败就如实报错
  throw new FailClosedError("いまは占えません。少し時間をおいて試してください", "AI_GATEWAY_UNAVAILABLE");
}

export function buildTarotUserMessage(cards: DrawnTarotCard[], userQuestion?: string): string {
  const q = userQuestion?.trim() ? `（質問：${userQuestion.trim()}）` : "";
  const summary = cards
    .map((c) => `${c.position}/${c.name}${c.isReversed ? "/逆" : ""}`)
    .join(" · ");
  return `タロット占いをお願いします ${q}\n${summary}`;
}
