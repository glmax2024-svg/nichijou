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
  // 需要角色绑定了声线才能通话，所以不默认开放，必须在角色的 skillIds 里显式开启
  match: () => false,
};
