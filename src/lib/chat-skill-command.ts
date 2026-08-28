import type { CharacterSkill } from "@/lib/character-skills";

export const SKILL_CMD_PREFIX = "/skills ";

/** Build a skill command for the chat input, e.g. /skills tarot. */
export function buildSkillCommand(skill: CharacterSkill) {
  return `${SKILL_CMD_PREFIX}${skill.name}`;
}

/** Parse a skill command from user input. */
export function parseSkillCommand(
  text: string,
  skills: CharacterSkill[],
): CharacterSkill | null {
  const trimmed = text.trim();
  if (!/^\/skills(\s|$)/i.test(trimmed)) return null;

  const query = trimmed.replace(/^\/skills\s*/i, "").trim();
  if (!query) return null;

  const exact = skills.find(
    (s) => s.name === query || s.id === query || s.name.toLowerCase() === query.toLowerCase(),
  );
  if (exact) return exact;

  return skills.find((s) => s.name.includes(query) || query.includes(s.name)) ?? null;
}
