const SKILL_REPLIES: Record<string, Record<string, string>> = {
  aoi: {
    "love-advice":
      "うん、聞くね。\n\n片思いって、相手の「好き」が分からないと不安になるよね。まずは、今一番気になってること教えて？\n\n…無理に答えなくて大丈夫。ゆっくり話そう。",
  },
  mio: {
    "film-tips":
      "フィルム、いいよね。\n\n窓際の自然光＋被写体との距離を少し詰めると、日常が一気に「作品」っぽくなる。ISO は 400 前後、シャッター 1/125 くらいから試してみて。\n\n今撮りたいシーン、ある？",
    "art-critique":
      "添削、いいよ。\n\n構図は「視線の入口」を意識してみて。左下から入って、主役に止まるラインがあると見やすい。\n\n画像があれば送って。具体的にフィードバックするね。",
  },
};

export function getSkillReply(slug: string, skillId: string, characterName: string): string | null {
  const reply = SKILL_REPLIES[slug]?.[skillId];
  if (reply) return reply;
  return null;
}

export function getSkillReplyOrFallback(
  slug: string,
  skillId: string,
  skillName: string,
  characterName: string,
): string {
  return (
    getSkillReply(slug, skillId, characterName) ??
    `「${skillName}」を準備しています… もう少しだけ待ってね。`
  );
}
