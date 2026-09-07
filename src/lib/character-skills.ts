import "@/modules/agent/skills/catalog";

export type { CharacterSkill } from "@/modules/agent/skills/types";
export {
  getCharacterSkills,
  skillsForCharacter,
  canUseSkill,
  listSkillCatalog,
} from "@/modules/agent/skills/registry";
