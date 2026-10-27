const CJK_RUN_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;
const LATIN_PATTERN = /[a-z0-9]+/g;

const LOW_SIGNAL_TOKENS = new Set([
  "これ",
  "それ",
  "あれ",
  "こと",
  "です",
  "ます",
  "する",
  "いる",
  "ある",
  "ない",
  "我们",
  "你们",
  "知道",
  "可以",
  "什么",
  "怎么",
  "现在",
  "还是",
  "因为",
  "所以",
  "一个",
  "没有",
  "就是",
]);

export function sanitizeMemoryText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMemoryText(text: string): string {
  return sanitizeMemoryText(text).toLowerCase();
}

function retrievalTokens(text: string): string[] {
  const normalized = normalizeMemoryText(text);
  const tokens = new Set<string>();

  for (const match of normalized.matchAll(LATIN_PATTERN)) {
    if (match[0].length > 1) tokens.add(match[0]);
  }

  for (const match of normalized.matchAll(CJK_RUN_PATTERN)) {
    const run = match[0];
    if (run.length <= 4 && !LOW_SIGNAL_TOKENS.has(run)) tokens.add(run);
    for (let index = 0; index < run.length - 1; index += 1) {
      const bigram = run.slice(index, index + 2);
      if (!LOW_SIGNAL_TOKENS.has(bigram)) tokens.add(bigram);
    }
  }

  return [...tokens];
}

export function scoreMemoryRelevance(query: string, content: string): number {
  const tokens = retrievalTokens(query);
  if (tokens.length === 0) return 0;

  const normalizedContent = normalizeMemoryText(content);
  const matched = tokens.filter((token) => normalizedContent.includes(token));
  if (matched.length === 0) return 0;

  const coverage = matched.length / tokens.length;
  const longestMatch = Math.max(...matched.map((token) => token.length));
  const compactQuery = normalizeMemoryText(query).replace(/\s+/g, "");
  const compactContent = normalizedContent.replace(/\s+/g, "");
  const exactBoost = compactQuery && compactContent.includes(compactQuery) ? 0.25 : 0;

  return Math.min(1, coverage * 0.75 + Math.min(longestMatch, 8) / 8 * 0.25 + exactBoost);
}

export const MEMORY_RELEVANCE_THRESHOLD = 0.25;
