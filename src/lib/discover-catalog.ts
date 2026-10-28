/** 发现页的筛选项与分类规则（角色数据全部来自数据库） */

export type DiscoverCategoryId =
  | "all"
  | "recommend"
  | "anime"
  | "school"
  | "romance"
  | "healing"
  | "fantasy"
  | "game";

export type DiscoverGender = "female" | "male" | "other";

export const DISCOVER_GENDERS = [
  { id: "all" },
  { id: "female" },
  { id: "male" },
  { id: "other" },
] as const;

export const DISCOVER_CATEGORIES = [
  { id: "recommend" },
  { id: "anime" },
  { id: "school" },
  { id: "romance" },
  { id: "healing" },
  { id: "fantasy" },
  { id: "game" },
] as const;

/** 角色标签（中/日/英混写）到分类的关键词 */
const CATEGORY_KEYWORDS: Partial<Record<DiscoverCategoryId, RegExp>> = {
  school: /校园|学校|学園|高校|学生|school/i,
  romance: /恋爱|恋愛|romance/i,
  healing: /治愈|癒し|healing/i,
  fantasy: /奇幻|幻想|ファンタジー|魔法|fantasy/i,
  game: /游戏|ゲーム|game/i,
};

/** 库里的中文标签 → 字典 `tags` 键，便于日/英界面显示 */
export const TAG_DICT_KEY: Record<string, string> = {
  治愈: "healing",
  日常: "daily",
  校园: "school",
  学校: "school",
  奇幻: "fantasy",
  青春: "youth",
  都市: "city",
  喜剧: "comedy",
  搞笑: "comedy",
  音乐: "music",
  科幻: "scifi",
  美食: "food",
  连载: "serial",
  轻小说: "lightNovel",
  夜晚: "night",
  夜型: "night",
  游戏: "game",
  游戏制作: "game",
  恋爱: "romance",
  スポーツ: "sports",
};

/** 平台上的角色都是二次元角色，「推荐」「二次元」不做筛选 */
export function matchesCategory(tags: string[], category: DiscoverCategoryId): boolean {
  const re = CATEGORY_KEYWORDS[category];
  return re ? tags.some((t) => re.test(t)) : true;
}

export function collectTagCounts(tagLists: string[][]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags) {
      if (!tag) continue;
      map.set(tag, (map.get(tag) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
    .map(([tag, count]) => ({ tag, count }));
}

export function formatDiscoverCount(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
