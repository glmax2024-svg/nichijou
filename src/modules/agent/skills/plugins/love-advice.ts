import type { SkillPlugin } from "../types";

export const loveAdvicePlugin: SkillPlugin = {
  definition: {
    id: "love-advice",
    icon: "favorite",
    name: "恋愛相談",
    description: "片思い・告白・距離感など、恋の悩みに優しく寄り添う",
    includedInSubscription: true,
  },
  match: ({ tags }) => tags.includes("恋爱") || tags.includes("恋愛"),
  prompt:
    "ユーザーが「恋愛相談」スキルを使いました。あなたのキャラクターのまま、否定せずに話を聞き、まず今いちばん気になっていることを尋ねてください。",
};
