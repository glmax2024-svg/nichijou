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
  tags: string;
};

export type SkillPlugin = {
  definition: CharacterSkill;
  /** 未在角色上显式挂载 skillIds 时，用这个决定默认是否出现。 */
  match: (ctx: SkillMatchContext) => boolean;
  /**
   * 使用技能时追加给模型的系统指令。回复仍由角色用自己的口吻生成，
   * 并像普通消息一样存进聊天记录。
   */
  prompt?: string;
};
