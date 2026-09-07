import { registerSkill } from "./registry";
import { artCritiquePlugin } from "./plugins/art-critique";
import { dailyChatPlugin } from "./plugins/daily-chat";
import { filmTipsPlugin } from "./plugins/film-tips";
import { loveAdvicePlugin } from "./plugins/love-advice";
import { tarotPlugin } from "./plugins/tarot";
import { voiceCallPlugin } from "./plugins/voice-call";

let loaded = false;

export function loadSkillCatalog() {
  if (loaded) return;
  loaded = true;
  registerSkill(dailyChatPlugin);
  registerSkill(voiceCallPlugin);
  registerSkill(tarotPlugin);
  registerSkill(loveAdvicePlugin);
  registerSkill(filmTipsPlugin);
  registerSkill(artCritiquePlugin);
}

loadSkillCatalog();
