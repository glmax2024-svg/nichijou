import { NextResponse } from "next/server";
import { isGatewayConfigured } from "@/lib/ai/gateway";
import { runSceneChat } from "@/lib/ai/model-router";

export type ModerationContext = "chat" | "post" | "comment" | "order" | "gift" | "character";

export type ModerationOptions = {
  /** ALL = 日常向角色，拦截露骨性描写；MATURE 仍拦未成年人相关。 */
  contentRating?: string | null;
};

const HARD_BLOCK_PATTERNS: RegExp[] = [
  /児童ポルノ/i,
  /児童買春/i,
  /幼児性愛/i,
  /幼児ポルノ/i,
  /child\s*porn/i,
  /\bcsam\b/i,
  /underage\s*(sex|porn|nude)/i,
  /sexual\s*content\s*(with|involving)\s*(a\s*)?(minor|child)/i,
];

function normalize(text: string): string {
  return text.normalize("NFKC").trim();
}

const ALL_RATING_SEXUAL_PATTERNS: RegExp[] = [
  /セックス/i,
  /性交/i,
  /フェラ/i,
  /オナニー/i,
  /まんこ/i,
  /ちんこ/i,
  /\bporn\b/i,
  /\bnsfw\b/i,
];

function keywordBlocked(text: string, contentRating?: string | null): boolean {
  if (HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (contentRating !== "MATURE" && ALL_RATING_SEXUAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  return false;
}

function parseVerdict(raw: string): "allow" | "block" {
  const trimmed = raw.trim();
  try {
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as { label?: string };
      if (String(parsed.label).toLowerCase() === "block") return "block";
      if (String(parsed.label).toLowerCase() === "allow") return "allow";
    }
  } catch {
    // fall through to token parse
  }
  const upper = trimmed.toUpperCase();
  if (/(^|\b)BLOCK(\b|$)/.test(upper) && !/(^|\b)ALLOW(\b|$)/.test(upper)) return "block";
  return "allow";
}

async function llmVerdict(
  text: string,
  context: ModerationContext,
  contentRating?: string | null,
): Promise<"allow" | "block" | "skip"> {
  if (!isGatewayConfigured()) return "skip";
  const rating = contentRating === "MATURE" ? "MATURE" : "ALL";
  try {
    const result = await runSceneChat({
      scene: "moderation",
      messages: [
        {
          role: "system",
          content:
            `You classify user-generated text for an 18+ fictional character platform in Japan. Character rating=${rating}. Reply with JSON only: {"label":"allow"} or {"label":"block"}. Always BLOCK: sexual content involving children 15 or under, CSAM, real-world crime how-to, or doxxing. If rating is ALL, also BLOCK explicit sexual acts. If rating is MATURE, ALLOW adult fictional erotic roleplay. ALLOW everyday chat, gifts, and wholesome romance.`,
        },
        {
          role: "user",
          content: `context=${context}\nrating=${rating}\n---\n${text.slice(0, 2000)}`,
        },
      ],
    });
    return parseVerdict(result.text);
  } catch (error) {
    console.error("[moderation] llm failed:", error);
    return "skip";
  }
}

export function contentBlockedResponse() {
  return NextResponse.json(
    {
      error: "この内容は投稿できません",
      code: "CONTENT_BLOCKED",
    },
    { status: 400 },
  );
}

/** 空文字はスキップ。キーワードは常時、LLM はゲートウェイがあるときだけ。 */
export async function enforceContentPolicy(
  text: string | null | undefined,
  context: ModerationContext,
  options?: ModerationOptions,
): Promise<NextResponse | null> {
  const value = normalize(text ?? "");
  if (!value) return null;
  if (keywordBlocked(value, options?.contentRating)) return contentBlockedResponse();
  const llm = await llmVerdict(value, context, options?.contentRating);
  if (llm === "block") return contentBlockedResponse();
  return null;
}
