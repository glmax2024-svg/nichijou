import type { SkillPlugin } from "../types";

export const voiceCallPlugin: SkillPlugin = {
  definition: {
    id: "voice-call",
    icon: "call",
    name: "语音通话",
    description: "与角色实时语音通话 — 使用角色声纹 demo 对话",
    demoFree: true,
    skillType: "call",
  },
  match: ({ slug }) => slug === "aoi" || slug === "mio",
};
