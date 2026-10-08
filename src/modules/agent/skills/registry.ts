import type { CharacterSkill, SkillMatchContext, SkillPlugin } from "./types";

const plugins = new Map<string, SkillPlugin>();

export function registerSkill(plugin: SkillPlugin) {
  plugins.set(plugin.definition.id, plugin);
}

export function getSkillPlugin(id: string): SkillPlugin | undefined {
  return plugins.get(id);
}

export function listSkillCatalog(): CharacterSkill[] {
  return [...plugins.values()].map((plugin) => plugin.definition);
}

function parseSkillIds(raw?: string | string[] | null): string[] {
  if (Array.isArray(raw)) return raw.map((id) => id.trim()).filter(Boolean);
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getCharacterSkills(opts?: {
  tags?: string;
  enabledIds?: string | string[] | null;
}): CharacterSkill[] {
  const ctx: SkillMatchContext = { tags: opts?.tags ?? "" };
  const enabled = parseSkillIds(opts?.enabledIds ?? null);
  const selected = enabled.length > 0 ? new Set(enabled) : null;

  return [...plugins.values()]
    .filter((plugin) => {
      if (selected) {
        return selected.has(plugin.definition.id) || plugin.definition.id === "daily-chat";
      }
      return plugin.match(ctx);
    })
    .map((plugin) => plugin.definition);
}

export function skillsForCharacter(character: { tags?: string | null; skillIds?: string | null }) {
  return getCharacterSkills({
    tags: character.tags ?? "",
    enabledIds: character.skillIds,
  });
}

export function canUseSkill(
  skill: CharacterSkill,
  opts: { isSubscribed: boolean; isLoggedIn: boolean },
) {
  if (skill.demoFree) return opts.isLoggedIn;
  if (skill.includedInSubscription) return opts.isSubscribed;
  return opts.isLoggedIn;
}

/** 使用技能时追加给模型的指令；纯界面型技能（塔罗、通话）没有 */
export function getSkillPrompt(skillId: string): string | null {
  return getSkillPlugin(skillId)?.prompt ?? null;
}
