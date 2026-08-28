export type PostContext = {
  id: string;
  excerpt: string;
};

/** Turn DB memories into user-visible “she remembers” chips. */
export function formatMemoryHints(raw: string[]): string[] {
  return raw.slice(0, 3).map((m) => {
    if (m.includes("ゆいちゃん")) return "ゆいちゃん";
    if (m.includes("考试") || m.includes("試験")) return "下周的考试";
    const quoted = m.match(/「([^」]+)」/);
    if (quoted) return quoted[1];
    return m.length > 18 ? `${m.slice(0, 16)}…` : m;
  });
}

export function buildFirstGreeting(
  slug: string,
  name: string,
  memoryHints: string[],
  postContext?: PostContext | null,
): string {
  if (postContext) {
    const snippet =
      postContext.excerpt.length > 48
        ? `${postContext.excerpt.slice(0, 46)}…`
        : postContext.excerpt;
    if (slug === "aoi") {
      return `あ、${snippet} の投稿、見てくれたんだね。\n\n返事、聞かせて？ どう思った？`;
    }
    if (slug === "mio") {
      return `その投稿（${snippet}）、気になって DM してくれたの？\n\n続き、話してみない？`;
    }
    return `${snippet} について話したい？ 聞かせて。`;
  }

  const hints = formatMemoryHints(memoryHints);
  if (slug === "aoi" && hints.length > 0) {
    const parts = hints.map((h) => `「${h}」`).join("、");
    return `${hints.includes("ゆいちゃん") ? "ゆいちゃん、" : ""}久しぶり。\n\n${parts} のこと、覚えてるよ。最近どう？`;
  }
  if (slug === "mio") {
    return "やあ。今日はどんな一日だった？ 写真の話でも、日常でも、なんでも。";
  }
  return `${name}だよ。来てくれて嬉しい。何か話そう？`;
}

export function buildPostContextBanner(post: PostContext, characterName: string): string {
  const snippet =
    post.excerpt.length > 36 ? `${post.excerpt.slice(0, 34)}…` : post.excerpt;
  return `来自 ${characterName} 的投稿：${snippet}`;
}
