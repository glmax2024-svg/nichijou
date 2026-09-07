import type { SkillPlugin } from "../types";

export const dailyChatPlugin: SkillPlugin = {
  definition: {
    id: "daily-chat",
    icon: "chat",
    name: "日常会話",
    description: "キャラクター設定に沿った自然な日常チャット",
    includedInSubscription: true,
  },
  match: () => true,
};
