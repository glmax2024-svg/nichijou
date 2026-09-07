import type { SkillPlugin } from "../types";

export const tarotPlugin: SkillPlugin = {
  definition: {
    id: "tarot",
    icon: "style",
    name: "塔罗占卜",
    description: "时间流三张牌阵 — 解读过去、现在与未来。静心抽牌，由角色为你读解",
    demoFree: true,
    skillType: "tarot",
  },
  match: ({ slug, tags }) => slug === "aoi" || tags.includes("占い") || tags.includes("塔罗"),
};
