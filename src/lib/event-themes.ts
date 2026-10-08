/** 活动横幅的配色预设（前后端共用） */
export const EVENT_THEMES = {
  sakura: { label: "桜", background: "linear-gradient(135deg,#ffd9e0,#ffc9d6 50%,#d9c7f0)", ink: "#5a2a3a", accent: "#c0417a" },
  sky: { label: "青空", background: "linear-gradient(135deg,#cfe8ff,#bfe0ff 50%,#e6f7d8)", ink: "#23405e", accent: "#3f7fc4" },
  night: { label: "夜", background: "linear-gradient(135deg,#2a2a5c,#4c3c7e 55%,#c86a9a)", ink: "#ffffff", accent: "#ffcf6e" },
  sunset: { label: "夕焼け", background: "linear-gradient(135deg,#ffd7a0,#ff9d7e 55%,#ec7ba6)", ink: "#5a2a1a", accent: "#d0502a" },
} as const;

export type EventThemeId = keyof typeof EVENT_THEMES;

export const EVENT_THEME_IDS = Object.keys(EVENT_THEMES) as EventThemeId[];

export function eventTheme(id: string) {
  return EVENT_THEMES[id as EventThemeId] ?? EVENT_THEMES.sakura;
}

/** 前台展示需要的字段 */
export type PublicEvent = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  theme: string;
  imageUrl: string | null;
  linkHref: string | null;
  ctaLabel: string;
  startsAt: string;
  endsAt: string;
};
