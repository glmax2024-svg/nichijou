import "@/modules/agent/skills/catalog";

export { buildPersonaSystemPrompt } from "@/lib/agent/prompt";
export { savePersonaUpdate, recordPersonaRevision, toPersonaSnapshot } from "@/lib/agent/persona";
export { DEFAULT_BOUNDARIES, normalizeBoundaries } from "@/lib/agent/defaults";
export {
  loadBond,
  recordBondInteraction,
  formatBondForPrompt,
  stageFromIntimacy,
} from "@/lib/agent/relationship";
export {
  formatBondLabel,
  bondStageLabel,
  affinityFromBond,
  type BondSnapshot,
} from "@/lib/agent/bond-display";
export { runChatPipeline } from "@/lib/ai/pipeline";
export {
  registerSkill,
  getCharacterSkills,
  skillsForCharacter,
  canUseSkill,
  listSkillCatalog,
  getSkillReply,
  getSkillReplyOrFallback,
} from "@/modules/agent/skills/registry";
export type { CharacterSkill, SkillPlugin, SkillMatchContext } from "@/modules/agent/skills/types";
