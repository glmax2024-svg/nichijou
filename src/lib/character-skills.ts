export type CharacterSkill = {
  id: string;
  icon: string;
  name: string;
  description: string;
  /** Upsell price hint (JPY); 0 means included in subscription. */
  priceFrom?: number;
  /** Available inside an active subscription. */
  includedInSubscription?: boolean;
  /** Demo skill usable after login. */
  demoFree?: boolean;
  skillType?: "tarot" | "call" | "default";
};

const DEFAULT_SKILLS: CharacterSkill[] = [
  {
    id: "daily-chat",
    icon: "chat",
    name: "日常会話",
    description: "キャラクター設定に沿った自然な日常チャット",
    includedInSubscription: true,
  },
];

/** Character agent skills creators can attach as paid extras. */
export const CHARACTER_SKILLS: Record<string, CharacterSkill[]> = {
  aoi: [
    {
      id: "voice-call",
      icon: "call",
      name: "语音通话",
      description: "与角色实时语音通话 — 使用角色声纹 demo 对话",
      demoFree: true,
      skillType: "call",
    },
    {
      id: "tarot",
      icon: "style",
      name: "塔罗占卜",
      description: "时间流三张牌阵 — 解读过去、现在与未来。静心抽牌，由角色为你读解",
      demoFree: true,
      skillType: "tarot",
    },
    {
      id: "love-advice",
      icon: "favorite",
      name: "恋愛相談",
      description: "片思い・告白・距離感など、恋の悩みに優しく寄り添う",
      includedInSubscription: true,
    },
  ],
  mio: [
    {
      id: "voice-call",
      icon: "call",
      name: "语音通话",
      description: "与角色实时语音通话",
      demoFree: true,
      skillType: "call",
    },
    {
      id: "film-tips",
      icon: "photo_camera",
      name: "フィルム写真のコツ",
      description: "光・構図・現像の選び方など、撮影アドバイス",
      includedInSubscription: true,
    },
    {
      id: "art-critique",
      icon: "palette",
      name: "イラスト添削",
      description: "構図・色味・雰囲気について具体的なフィードバック",
      includedInSubscription: true,
    },
  ],
};

export function getCharacterSkills(slug: string): CharacterSkill[] {
  return CHARACTER_SKILLS[slug] ?? DEFAULT_SKILLS;
}

export function canUseSkill(
  skill: CharacterSkill,
  opts: { isSubscribed: boolean; isLoggedIn: boolean },
) {
  if (skill.demoFree) return opts.isLoggedIn;
  if (skill.includedInSubscription) return opts.isSubscribed;
  return opts.isLoggedIn;
}
