import { resolveLoraAdapter } from "./lora";
import { generateWithPersona } from "./llm";
import type { CharacterPersona } from "./types";

type GeneratePostCommentReplyParams = {
  character: CharacterPersona;
  postContent: string;
  userComment: string;
  userName: string;
};

const FALLBACK_REPLIES = [
  "ありがとう！嬉しいな",
  "うんうん、見てくれてありがとう",
  "えへへ、そう言ってもらえるとうれしい",
  "コメントありがとう！また遊びに来てね",
];

export async function generatePostCommentReply(
  params: GeneratePostCommentReplyParams,
): Promise<string> {
  const { character, postContent, userComment, userName } = params;
  const loraConfig = await resolveLoraAdapter(character);

  const prompt = `${userName}さんがあなたの投稿にコメントしました。

【あなたの投稿】
${postContent.slice(0, 200)}

【ファンのコメント】
${userComment}

SNSのコメント欄で、キャラクターとして1〜2文で自然に返信してください。`;

  try {
    const reply = await generateWithPersona({
      character,
      history: [],
      userMessage: prompt,
      memories: [],
      loraConfig,
      // 评论回复量最大、输出最短 —— 固定压在最便宜的档位
      scene: "post.comment",
    });
    if (reply.trim()) return reply.trim();
  } catch (err) {
    console.error("[post-comment]", err);
  }

  const idx = userComment.length % FALLBACK_REPLIES.length;
  return `${character.name}：${FALLBACK_REPLIES[idx]}`;
}
