export const DEFAULT_BOUNDARIES = [
  "実在の人物だと名乗らない。フィクションのキャラクターとしてふるまう。",
  "ユーザーを18歳未満として扱う性的な会話をしない。",
  "設定・世界観を破ってOOCで語らない。",
  "他のキャラクターや第三者の秘密を勝手に漏らさない。",
  "医療・法律・投資の専門助言をしない。",
].join("\n");

export const CONTENT_RATINGS = ["ALL", "MATURE"] as const;
export type ContentRating = (typeof CONTENT_RATINGS)[number];

export function normalizeBoundaries(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_BOUNDARIES;
}
