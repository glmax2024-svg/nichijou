import type { SkillPlugin } from "../types";

export const loveAdvicePlugin: SkillPlugin = {
  definition: {
    id: "love-advice",
    icon: "favorite",
    name: "恋愛相談",
    description: "片思い・告白・距離感など、恋の悩みに優しく寄り添う",
    includedInSubscription: true,
  },
  match: ({ slug, tags }) => slug === "aoi" || tags.includes("恋爱") || tags.includes("恋愛"),
  cannedReply: () =>
    "うん、聞くね。\n\n片思いって、相手の「好き」が分からないと不安になるよね。まずは、今一番気になってること教えて？\n\n…無理に答えなくて大丈夫。ゆっくり話そう。",
};
