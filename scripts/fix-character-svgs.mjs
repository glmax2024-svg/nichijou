import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const outDir = join(process.cwd(), "public/characters");

function svg(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${content}\n`;
}

const assets = {
  "aoi/avatar.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <defs>
    <linearGradient id="a-bg" x1="0" y1="0" x2="400" y2="400">
      <stop offset="0%" stop-color="#ffd7e8"/>
      <stop offset="55%" stop-color="#ffeef3"/>
      <stop offset="100%" stop-color="#eef1ff"/>
    </linearGradient>
    <linearGradient id="a-hair" x1="200" y1="80" x2="200" y2="280">
      <stop offset="0%" stop-color="#5c4030"/>
      <stop offset="100%" stop-color="#3d2817"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#a-bg)"/>
  <path d="M78 175c12-88 62-138 122-138s110 50 122 138c-28-18-68-28-122-28s-94 10-122 28z" fill="url(#a-hair)"/>
  <ellipse cx="200" cy="235" rx="88" ry="98" fill="#fde8d8"/>
  <ellipse cx="162" cy="225" rx="14" ry="18" fill="#6b4423"/>
  <ellipse cx="238" cy="225" rx="14" ry="18" fill="#6b4423"/>
  <ellipse cx="166" cy="219" rx="5" ry="6" fill="#fff"/>
  <ellipse cx="242" cy="219" rx="5" ry="6" fill="#fff"/>
  <path d="M188 258c8 8 16 8 24 0" stroke="#e89aa8" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="138" cy="252" rx="18" ry="10" fill="#ffb8c8" opacity="0.45"/>
  <ellipse cx="262" cy="252" rx="18" ry="10" fill="#ffb8c8" opacity="0.45"/>
</svg>`),

  "aoi/gallery-1.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="a1-bg" x1="0" y1="0" x2="0" y2="800">
      <stop offset="0%" stop-color="#ffd0a8"/>
      <stop offset="45%" stop-color="#ffb8c8"/>
      <stop offset="100%" stop-color="#f9ece7"/>
    </linearGradient>
    <linearGradient id="a1-hair" x1="300" y1="120" x2="300" y2="420">
      <stop offset="0%" stop-color="#5c4030"/>
      <stop offset="100%" stop-color="#3d2817"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#a1-bg)"/>
  <circle cx="480" cy="120" r="60" fill="#fff6c8" opacity="0.85"/>
  <rect x="80" y="560" width="440" height="180" rx="24" fill="#fff" opacity="0.55"/>
  <path d="M140 380c20-120 80-190 160-190s140 70 160 190c-35-25-85-40-160-40s-125 15-160 40z" fill="url(#a1-hair)"/>
  <ellipse cx="300" cy="430" rx="95" ry="110" fill="#fde8d8"/>
  <ellipse cx="255" cy="420" rx="18" ry="22" fill="#fff"/>
  <ellipse cx="345" cy="420" rx="18" ry="22" fill="#fff"/>
  <ellipse cx="258" cy="424" rx="11" ry="14" fill="#6b4423"/>
  <ellipse cx="348" cy="424" rx="11" ry="14" fill="#6b4423"/>
  <path d="M285 470c10 10 20 10 30 0" stroke="#e89aa8" stroke-width="3" stroke-linecap="round"/>
</svg>`),

  "aoi/gallery-2.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="a2-bg" x1="0" y1="0" x2="600" y2="800">
      <stop offset="0%" stop-color="#ffd0e0"/>
      <stop offset="50%" stop-color="#ffe6ea"/>
      <stop offset="100%" stop-color="#eef1ff"/>
    </linearGradient>
    <linearGradient id="a2-hair" x1="300" y1="100" x2="300" y2="350">
      <stop offset="0%" stop-color="#5c4030"/>
      <stop offset="100%" stop-color="#3d2817"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#a2-bg)"/>
  <path d="M160 360c25-130 95-200 140-200s115 70 140 200c-40-30-95-48-140-48s-100 18-140 48z" fill="url(#a2-hair)"/>
  <ellipse cx="300" cy="420" rx="100" ry="115" fill="#fde8d8"/>
  <ellipse cx="250" cy="405" rx="20" ry="24" fill="#fff"/>
  <ellipse cx="350" cy="405" rx="20" ry="24" fill="#fff"/>
  <ellipse cx="254" cy="410" rx="12" ry="15" fill="#6b4423"/>
  <ellipse cx="354" cy="410" rx="12" ry="15" fill="#6b4423"/>
  <path d="M278 458c12 12 32 12 44 0" stroke="#ef7488" stroke-width="4" stroke-linecap="round"/>
</svg>`),

  "aoi/gallery-3.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="a3-bg" x1="0" y1="0" x2="0" y2="800">
      <stop offset="0%" stop-color="#8fd0ff"/>
      <stop offset="60%" stop-color="#c8e8ff"/>
      <stop offset="100%" stop-color="#f9ece7"/>
    </linearGradient>
    <linearGradient id="a3-hair" x1="300" y1="130" x2="300" y2="380">
      <stop offset="0%" stop-color="#5c4030"/>
      <stop offset="100%" stop-color="#3d2817"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#a3-bg)"/>
  <circle cx="500" cy="100" r="50" fill="#fff6c8"/>
  <path d="M175 370c22-115 85-175 125-175s103 60 125 175c-32-22-78-36-125-36s-93 14-125 36z" fill="url(#a3-hair)"/>
  <ellipse cx="300" cy="430" rx="105" ry="120" fill="#fde8d8"/>
  <ellipse cx="252" cy="418" rx="19" ry="23" fill="#fff"/>
  <ellipse cx="348" cy="418" rx="19" ry="23" fill="#fff"/>
  <ellipse cx="256" cy="423" rx="11" ry="14" fill="#6b4423"/>
  <ellipse cx="352" cy="423" rx="11" ry="14" fill="#6b4423"/>
</svg>`),

  "mio/avatar.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <defs>
    <linearGradient id="m-bg" x1="0" y1="0" x2="400" y2="400">
      <stop offset="0%" stop-color="#dde8ff"/>
      <stop offset="55%" stop-color="#eef1ff"/>
      <stop offset="100%" stop-color="#ffe6ea"/>
    </linearGradient>
    <linearGradient id="m-hair" x1="200" y1="70" x2="200" y2="260">
      <stop offset="0%" stop-color="#2a2a4a"/>
      <stop offset="100%" stop-color="#1a1a30"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#m-bg)"/>
  <path d="M70 180c15-95 70-145 130-145s115 50 130 145c-30-20-72-32-130-32s-100 12-130 32z" fill="url(#m-hair)"/>
  <path d="M130 155 L170 145 L230 145 L270 155 L270 190 Q200 210 130 190 Z" fill="#2a2a4a"/>
  <ellipse cx="200" cy="235" rx="88" ry="98" fill="#fde8d8"/>
  <ellipse cx="162" cy="225" rx="14" ry="18" fill="#4a6080"/>
  <ellipse cx="238" cy="225" rx="14" ry="18" fill="#4a6080"/>
  <ellipse cx="166" cy="219" rx="5" ry="6" fill="#fff"/>
  <ellipse cx="242" cy="219" rx="5" ry="6" fill="#fff"/>
  <path d="M192 258c6 6 10 6 16 0" stroke="#c9a89a" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="138" cy="252" rx="16" ry="8" fill="#ffb8c8" opacity="0.35"/>
  <ellipse cx="262" cy="252" rx="16" ry="8" fill="#ffb8c8" opacity="0.35"/>
</svg>`),

  "mio/gallery-1.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="m1-bg" x1="0" y1="0" x2="0" y2="800">
      <stop offset="0%" stop-color="#c8d8f0"/>
      <stop offset="50%" stop-color="#eef1ff"/>
      <stop offset="100%" stop-color="#f9ece7"/>
    </linearGradient>
    <linearGradient id="m1-hair" x1="300" y1="100" x2="300" y2="380">
      <stop offset="0%" stop-color="#2a2a4a"/>
      <stop offset="100%" stop-color="#1a1a30"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#m1-bg)"/>
  <rect x="60" y="500" width="480" height="220" rx="28" fill="#fff" opacity="0.5"/>
  <path d="M150 370c25-125 90-195 150-195s125 70 150 195c-38-28-92-45-150-45s-112 17-150 45z" fill="url(#m1-hair)"/>
  <ellipse cx="300" cy="430" rx="100" ry="115" fill="#fde8d8"/>
  <ellipse cx="252" cy="415" rx="19" ry="23" fill="#fff"/>
  <ellipse cx="348" cy="415" rx="19" ry="23" fill="#fff"/>
  <ellipse cx="256" cy="420" rx="11" ry="14" fill="#4a6080"/>
  <ellipse cx="352" cy="420" rx="11" ry="14" fill="#4a6080"/>
</svg>`),

  "mio/gallery-2.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="m2-bg" x1="0" y1="0" x2="600" y2="800">
      <stop offset="0%" stop-color="#ffd0e0"/>
      <stop offset="40%" stop-color="#ffe6ea"/>
      <stop offset="100%" stop-color="#dde8ff"/>
    </linearGradient>
    <linearGradient id="m2-hair" x1="300" y1="110" x2="300" y2="360">
      <stop offset="0%" stop-color="#2a2a4a"/>
      <stop offset="100%" stop-color="#1a1a30"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#m2-bg)"/>
  <path d="M165 365c22-120 88-185 135-185s113 65 135 185c-35-25-85-40-135-40s-100 15-135 40z" fill="url(#m2-hair)"/>
  <ellipse cx="300" cy="425" rx="102" ry="118" fill="#fde8d8"/>
  <ellipse cx="252" cy="410" rx="19" ry="23" fill="#fff"/>
  <ellipse cx="348" cy="410" rx="19" ry="23" fill="#fff"/>
  <path d="M282 462c10 8 26 8 36 0" stroke="#c9a89a" stroke-width="3" stroke-linecap="round"/>
</svg>`),

  "mio/gallery-3.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" fill="none">
  <defs>
    <linearGradient id="m3-bg" x1="0" y1="0" x2="0" y2="800">
      <stop offset="0%" stop-color="#5f5fb0"/>
      <stop offset="55%" stop-color="#9a7fc6"/>
      <stop offset="100%" stop-color="#f0b48a"/>
    </linearGradient>
    <linearGradient id="m3-hair" x1="300" y1="120" x2="300" y2="370">
      <stop offset="0%" stop-color="#2a2a4a"/>
      <stop offset="100%" stop-color="#1a1a30"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#m3-bg)"/>
  <rect x="100" y="120" width="400" height="280" rx="16" fill="#fff" opacity="0.15"/>
  <path d="M170 380c20-115 80-180 130-180s110 65 130 180c-32-22-78-36-130-36s-98 14-130 36z" fill="url(#m3-hair)"/>
  <ellipse cx="300" cy="440" rx="98" ry="112" fill="#fde8d8"/>
  <ellipse cx="254" cy="425" rx="18" ry="22" fill="#fff"/>
  <ellipse cx="346" cy="425" rx="18" ry="22" fill="#fff"/>
</svg>`),

  "default-avatar.svg": svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
  <defs>
    <linearGradient id="d-bg" x1="0" y1="0" x2="400" y2="400">
      <stop offset="0%" stop-color="#ffe4e8"/>
      <stop offset="100%" stop-color="#eef1ff"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#d-bg)"/>
  <circle cx="200" cy="170" r="70" fill="#fde8d8"/>
  <ellipse cx="200" cy="320" rx="90" ry="70" fill="#fde8d8"/>
  <circle cx="175" cy="160" r="8" fill="#6b4423"/>
  <circle cx="225" cy="160" r="8" fill="#6b4423"/>
  <path d="M185 185c10 8 20 8 30 0" stroke="#e89aa8" stroke-width="3" stroke-linecap="round"/>
</svg>`),
};

for (const [rel, content] of Object.entries(assets)) {
  const dir = join(outDir, rel.split("/").slice(0, -1).join("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(outDir, rel), content, "utf8");
  console.log("wrote", rel);
}
