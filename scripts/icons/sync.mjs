/**
 * 收集项目里用到的 Material Symbols 图标名，生成 src/components/ui/icon-names.ts。
 *
 * 图标字体只按这份清单下载（Google Fonts 的 icon_names 参数），
 * 从 364KB 的全量字体降到几十 KB。新增图标后跑一次：npm run icons:sync
 *
 * 来源有三种，都会被扫到：
 *   <MIcon name="home" />
 *   <MIcon name={open ? "expand_less" : "expand_more"} />
 *   { icon: "badge" } / <Row icon="payments" />（数据或上层组件传进来的）
 *
 * 候选名会用官方 codepoints 清单校验，非图标字符串自动剔除。
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "src/components/ui/icon-names.ts");
const CODEPOINTS_URL =
  "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mjs)$/.test(name) && full !== OUT) out.push(full);
  }
  return out;
}

const TOKEN = /["'`]([a-z][a-z0-9_]{1,50})["'`]/g;
const candidates = new Map(); // name -> 首次出现位置

function collect(text, file, line) {
  for (const m of text.matchAll(TOKEN)) {
    if (!candidates.has(m[1])) candidates.set(m[1], `${path.relative(ROOT, file)}:${line}`);
  }
}

for (const file of walk(path.join(ROOT, "src"))) {
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  lines.forEach((l, i) => {
    if (/icon/i.test(l)) collect(l, file, i + 1);
  });
  // <MIcon ...> 可能跨行
  for (const m of src.matchAll(/<MIcon\b[^>]*>/gs)) {
    const line = src.slice(0, m.index).split("\n").length;
    collect(m[0], file, line);
  }
}

async function loadOfficial() {
  const arg = process.argv.find((a) => a.startsWith("--codepoints="));
  const text = arg
    ? readFileSync(arg.split("=")[1], "utf8")
    : await fetch(CODEPOINTS_URL).then((r) => {
        if (!r.ok) throw new Error(`下载官方图标清单失败：${r.status}`);
        return r.text();
      });
  return new Set(text.split("\n").map((l) => l.split(" ")[0]).filter(Boolean));
}

const official = await loadOfficial();
const icons = [...candidates.keys()].filter((n) => official.has(n)).sort();

writeFileSync(
  OUT,
  `// 由 scripts/icons/sync.mjs 生成，请勿手改。新增图标后运行：npm run icons:sync
// 图标字体只下载这里列出的图标。

export const ICON_NAMES = ${JSON.stringify(icons, null, 2).replace(/"/g, '"')} as const;

/**
 * 只含上面这些图标的 Material Symbols Rounded。
 * FILL 轴开放 0..1，MIcon 的 filled 才会生效；display=block 让字体到达前不显示图标名文字。
 */
export const ICON_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0" +
  \`&icon_names=\${ICON_NAMES.join(",")}&display=block\`;
`,
);

console.log(`✓ ${icons.length} 个图标 → ${path.relative(ROOT, OUT)}`);
