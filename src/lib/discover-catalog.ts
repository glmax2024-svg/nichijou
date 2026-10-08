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

/** 平台上的角色都是二次元角色，「推荐」「二次元」不做筛选 */
export function matchesCategory(tags: string[], category: DiscoverCategoryId): boolean {
  const re = CATEGORY_KEYWORDS[category];
  return re ? tags.some((t) => re.test(t)) : true;
}

export function formatDiscoverCount(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
