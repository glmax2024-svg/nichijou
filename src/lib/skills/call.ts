export const CALL_SKILL_ID = "voice-call";

export function isCallSkill(skillId?: string | null) {
  return skillId === CALL_SKILL_ID;
}

export function formatCallDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
