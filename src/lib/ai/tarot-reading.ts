import type { CharacterPersona } from "@/lib/ai/types";
import type { DrawnTarotCard } from "@/lib/skills/tarot";
import { formatDrawnCards } from "@/lib/skills/tarot";
import { runSceneChat, pickTarotScene } from "@/lib/ai/model-router";

function fallbackReading(character: CharacterPersona, cards: DrawnTarotCard[]): string {
  const lines = cards.map((c) => {
    const meaning = c.isReversed ? c.reversed : c.upright;
    return `【${c.position} · ${c.name}${c.isReversed ? " · 逆位置" : ""}】\n${meaning}`;
  });

  return `${character.name}：牌が教えてくれるの…

${lines.join("\n\n")}

総合すると、今のあなたは「${cards[1]?.name ?? "現在"}」のエネルギーの真っ最中。過去の${cards[0]?.name ?? "経験"}が土台になって、未来の${cards[2]?.name ?? "可能性"}へ向かっているの。

気になることがあれば、もう少し詳しく聞かせて？`;
}

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

## ルール
- 日本語で、キャラクターの口調を保つ
- 3枚のスプレッド（過去・現在・未来）を順に解釈し、最後に総合メッセージ
- 各カードの正位置/逆位置の意味を反映する
- 400字程度、親しみやすく、前向きに締める
- 占い結果の後、ユーザーにひとつ質問を返す`,
      },
      {
        role: "user",
        content: `${questionLine}

## 引かれたカード
${spread}`,
      },
      ],
    });
    if (result.text) return result.text;
  } catch (err) {
    console.error("[tarot] reading generation failed:", err);
  }

  return fallbackReading(character, cards);
}

export function buildTarotUserMessage(cards: DrawnTarotCard[], userQuestion?: string): string {
  const q = userQuestion?.trim() ? `（質問：${userQuestion.trim()}）` : "";
  const summary = cards
    .map((c) => `${c.position}/${c.name}${c.isReversed ? "/逆" : ""}`)
    .join(" · ");
  return `タロット占いをお願いします ${q}\n${summary}`;
}
