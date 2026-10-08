export type PostContext = {
  id: string;
  excerpt: string;
};

/** 把记忆条目转成界面上「她记得」的短提示 */
export function formatMemoryHints(raw: string[]): string[] {
  return raw.slice(0, 3).map((m) => {
    const quoted = m.match(/「([^」]+)」/);
    if (quoted) return quoted[1];
    return m.length > 18 ? `${m.slice(0, 16)}…` : m;
  });
}

/**
 * 第一次打开聊天时角色的开场白。
 * 优先使用角色自己的开场白（按人设撰写）；从动态进入时围绕那条动态开口。
 */
export function buildFirstGreeting(
  character: { name: string; greeting?: string | null },
  postContext?: PostContext | null,
): string {
  if (postContext) {
    const snippet =
      postContext.excerpt.length > 48 ? `${postContext.excerpt.slice(0, 46)}…` : postContext.excerpt;
    return `${snippet}\n\nこの投稿のこと、話したい？`;
  }
  return character.greeting?.trim() || `${character.name}だよ。来てくれて嬉しい。何か話そう？`;
}

export function buildPostContextBanner(post: PostContext, characterName: string): string {
  const snippet = post.excerpt.length > 36 ? `${post.excerpt.slice(0, 34)}…` : post.excerpt;
  return `来自 ${characterName} 的投稿：${snippet}`;
}
