import type { SkillPlugin } from "../types";

export const artCritiquePlugin: SkillPlugin = {
  definition: {
    id: "art-critique",
    icon: "palette",
    name: "イラスト添削",
    description: "構図・色味・雰囲気について具体的なフィードバック",
    includedInSubscription: true,
  },
  match: ({ slug, tags }) => slug === "mio" || tags.includes("艺术") || tags.includes("イラスト"),
  cannedReply: () =>
    "添削、いいよ。\n\n構図は「視線の入口」を意識してみて。左下から入って、主役に止まるラインがあると見やすい。\n\n画像があれば送って。具体的にフィードバックするね。",
};
