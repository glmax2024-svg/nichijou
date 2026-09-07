export type CharacterSkill = {
  id: string;
  icon: string;
  name: string;
  description: string;
  priceFrom?: number;
  includedInSubscription?: boolean;
  demoFree?: boolean;
  skillType?: "tarot" | "call" | "default";
};

export type SkillMatchContext = {
  slug: string;
  tags: string;
};

export type SkillPlugin = {
  definition: CharacterSkill;
  /** 未在角色上显式挂载 skillIds 时，用这个决定默认是否出现。 */
  match: (ctx: SkillMatchContext) => boolean;
  cannedReply?: (characterName: string) => string;
};
