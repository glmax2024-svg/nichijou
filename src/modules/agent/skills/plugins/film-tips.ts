import type { SkillPlugin } from "../types";

export const filmTipsPlugin: SkillPlugin = {
  definition: {
    id: "film-tips",
    icon: "photo_camera",
    name: "フィルム写真のコツ",
    description: "光・構図・現像の選び方など、撮影アドバイス",
    includedInSubscription: true,
  },
  match: ({ slug, tags }) => slug === "mio" || tags.includes("艺术") || tags.includes("写真"),
  cannedReply: () =>
    "フィルム、いいよね。\n\n窓際の自然光＋被写体との距離を少し詰めると、日常が一気に「作品」っぽくなる。ISO は 400 前後、シャッター 1/125 くらいから試してみて。\n\n今撮りたいシーン、ある？",
};
