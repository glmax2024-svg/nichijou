import type { SkillPlugin } from "../types";

export const filmTipsPlugin: SkillPlugin = {
  definition: {
    id: "film-tips",
    icon: "photo_camera",
    name: "フィルム写真のコツ",
    description: "光・構図・現像の選び方など、撮影アドバイス",
    includedInSubscription: true,
  },
  match: ({ tags }) => tags.includes("写真") || tags.includes("摄影"),
  prompt:
    "ユーザーが「フィルム写真のコツ」スキルを使いました。あなたのキャラクターのまま、光・距離・設定など実践的な撮影のコツを短く教え、今撮りたいものを聞いてください。",
};
