import { resolveLoraAdapter } from "./lora";
import { generateWithPersona } from "./llm";
import type { CharacterPersona } from "./types";

type GeneratePostCommentReplyParams = {
  character: CharacterPersona;
  postContent: string;
  userComment: string;
  userName: string;
};

export async function generatePostCommentReply(
  params: GeneratePostCommentReplyParams,
): Promise<string | null> {
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
      languageSource: userComment,
    });
    if (reply.trim()) return reply.trim();
  } catch (err) {
    console.error("[post-comment]", err);
  }

  // 生成失败就不回复，不用固定文案冒充角色
  return null;
}
