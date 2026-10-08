import type { SkillPlugin } from "../types";

export const artCritiquePlugin: SkillPlugin = {
  definition: {
    id: "art-critique",
    icon: "palette",
    name: "イラスト添削",
    description: "構図・色味・雰囲気について具体的なフィードバック",
    includedInSubscription: true,
  },
  match: ({ tags }) => tags.includes("艺术") || tags.includes("イラスト") || tags.includes("绘画"),
  prompt:
    "ユーザーが「イラスト添削」スキルを使いました。あなたのキャラクターのまま、絵の構図・色・視線誘導などを具体的にアドバイスしてください。画像がまだなければ、どんな絵か聞いてください。",
};
