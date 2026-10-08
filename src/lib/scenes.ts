/** 卡片顶部的装饰渐变，按 key 稳定取一个 */
const COVER_GRADIENTS = [
  "linear-gradient(160deg,#ffd7a0,#ff9d7e 52%,#ec7ba6)",
  "linear-gradient(160deg,#5f5fb0,#9a7fc6 58%,#f0b48a)",
  "linear-gradient(160deg,#ffd0e0,#ffe0ec 58%,#f2d9ff)",
  "linear-gradient(160deg,#8ad2ff,#bfe8ff 58%,#dff7c0)",
  "linear-gradient(160deg,#8fd0ff,#c8e8ff 62%,#e6fff0)",
  "linear-gradient(160deg,#2a2a5c,#4c3c7e 58%,#c86a9a)",
  "linear-gradient(160deg,#ffcf9a,#ffb090 55%,#e79ac0)",
];

export function getCoverGradient(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[hash]!;
}

export const RING_COLORS = [
  "linear-gradient(135deg,#f79aa8,#ef7488,#f6b26b)",
  "linear-gradient(135deg,#8fb8e8,#b6a6e8)",
  "linear-gradient(135deg,#b6a6e8,#e0a5d8)",
  "linear-gradient(135deg,#f6cf8f,#f79aa8)",
  "linear-gradient(135deg,#7bd3a0,#8fb8e8)",
  "linear-gradient(135deg,#e0a5d8,#b6a6e8)",
];

export const AVATAR_RING_COLORS = ["#ffdbe1", "#d8e6f8", "#e7d8f8", "#fbe7b8", "#d8f0e8"];

export const RANK_COLORS = ["#e0a93a", "#9aa6b8", "#c58a5a", "#b0a099"];

export function getCharacterBadge(tag: string | null | undefined, slug: string) {
  const label = tag?.split(",")[0]?.replace(/^#/, "") ?? slug.slice(0, 2);
  const palettes = [
    { bg: "#ffeef1", color: "#e0607a" },
    { bg: "#eaf1fb", color: "#5b7fc4" },
    { bg: "#f2ecff", color: "#8b76d4" },
    { bg: "#fff5e0", color: "#c99530" },
  ];
  const idx = slug.length % palettes.length;
  return { label, ...palettes[idx]! };
}
