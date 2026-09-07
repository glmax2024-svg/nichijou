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

export function getCharacterSkills(
  slug: string,
  opts?: { tags?: string; enabledIds?: string | string[] | null },
): CharacterSkill[] {
  const ctx: SkillMatchContext = { slug, tags: opts?.tags ?? "" };
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

export function skillsForCharacter(character: {
  slug: string;
  tags?: string | null;
  skillIds?: string | null;
}) {
  return getCharacterSkills(character.slug, {
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

export function getSkillReply(slug: string, skillId: string, characterName: string): string | null {
  void slug;
  return getSkillPlugin(skillId)?.cannedReply?.(characterName) ?? null;
}

export function getSkillReplyOrFallback(
  slug: string,
  skillId: string,
  skillName: string,
  characterName: string,
): string {
  return (
    getSkillReply(slug, skillId, characterName) ??
    `「${skillName}」を準備しています… もう少しだけ待ってね。`
  );
}
