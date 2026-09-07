/**
 * Memos 强制记忆插件
 *
 * 每次对话前 MUST query — 检索用户×角色的永久记忆
 * 每次对话后 MUST store — 写入新记忆供后续检索
 *
 * 生产环境对接 Memos API；未配置时降级到本地 CharacterMemory 表
 */

import { prisma } from "@/lib/prisma";
import type { MemoryEntry } from "./types";
import { MEMOS_QUERY_TOP_K } from "./types";

const MEMOS_API_URL = process.env.MEMOS_API_URL;
const MEMOS_API_KEY = process.env.MEMOS_API_KEY;

function memosHeaders(userId: string, characterId?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Nichijou-User-Id": userId,
  };
  if (characterId) headers["X-Nichijou-Character-Id"] = characterId;
  if (MEMOS_API_KEY) headers.Authorization = `Bearer ${MEMOS_API_KEY}`;
  return headers;
}

export class MemosQueryRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemosQueryRequiredError";
  }
}

type QueryParams = {
  userId: string;
  characterId: string;
  query: string;
};

type StoreParams = {
  userId: string;
  characterId: string;
  userMessage: string;
  assistantReply: string;
};

/** Required memory lookup — first pipeline step. */
export async function mandatoryMemosQuery(params: QueryParams): Promise<MemoryEntry[]> {
  const { userId, characterId, query } = params;

  if (MEMOS_API_URL && MEMOS_API_KEY) {
    try {
      return await queryMemosRemote(userId, characterId, query);
    } catch (err) {
      console.error("[memos] remote query failed, falling back to local:", err);
    }
  }

  return queryMemosLocal(userId, characterId, query);
}

/** Required memory write — final pipeline step. */
export async function mandatoryMemosStore(params: StoreParams): Promise<boolean> {
  const { userId, characterId, userMessage, assistantReply } = params;

  if (MEMOS_API_URL && MEMOS_API_KEY) {
    try {
      await storeMemosRemote(userId, characterId, userMessage, assistantReply);
      return true;
    } catch (err) {
      console.error("[memos] remote store failed, falling back to local:", err);
    }
  }

  await storeMemosLocal(userId, characterId, userMessage, assistantReply);
  return true;
}

async function queryMemosRemote(
  userId: string,
  characterId: string,
  query: string,
): Promise<MemoryEntry[]> {
  const res = await fetch(`${MEMOS_API_URL}/v1/memory/query`, {
    method: "POST",
    headers: memosHeaders(userId, characterId),
    body: JSON.stringify({
      user_id: userId,
      agent_id: characterId,
      query,
      top_k: MEMOS_QUERY_TOP_K,
    }),
  });

  if (!res.ok) {
    throw new MemosQueryRequiredError(`Memos query failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    memories: { id: string; content: string; category?: string; score?: number }[];
  };

  return (data.memories ?? []).map((m) => ({
    id: m.id,
    content: m.content,
    category: m.category ?? "general",
    importance: m.score ?? 0.5,
    source: "memos" as const,
  }));
}

async function storeMemosRemote(
  userId: string,
  characterId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  const res = await fetch(`${MEMOS_API_URL}/v1/memory/store`, {
    method: "POST",
    headers: memosHeaders(userId, characterId),
    body: JSON.stringify({
      user_id: userId,
      agent_id: characterId,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantReply },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Memos store failed: ${res.status}`);
  }
}

/** 删除远程记忆。未配置 Worker 时返回 false。characterId 为空则清该用户全部。 */
export async function deleteMemosRemote(userId: string, characterId?: string): Promise<boolean> {
  if (!MEMOS_API_URL || !MEMOS_API_KEY) return false;

  const res = await fetch(`${MEMOS_API_URL}/v1/memory/delete`, {
    method: "POST",
    headers: memosHeaders(userId, characterId),
    body: JSON.stringify({
      user_id: userId,
      agent_id: characterId ?? "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Memos delete failed: ${res.status}`);
  }
  return true;
}

async function queryMemosLocal(
  userId: string,
  characterId: string,
  query: string,
): Promise<MemoryEntry[]> {
  const keywords = query
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);

  const memories = await prisma.characterMemory.findMany({
    where: {
      userId,
      characterId,
      OR: keywords.length
        ? keywords.map((kw) => ({ content: { contains: kw } }))
        : undefined,
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: MEMOS_QUERY_TOP_K,
  });

  if (memories.length === 0) {
    return prisma.characterMemory.findMany({
      where: { userId, characterId },
      orderBy: { createdAt: "desc" },
      take: MEMOS_QUERY_TOP_K,
    }).then((rows) =>
      rows.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        importance: m.importance,
        source: "local" as const,
      })),
    );
  }

  return memories.map((m) => ({
    id: m.id,
    content: m.content,
    category: m.category,
    importance: m.importance,
    source: "local" as const,
  }));
}

async function storeMemosLocal(
  userId: string,
  characterId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  const extract = extractMemorableFacts(userMessage, assistantReply);

  for (const fact of extract) {
    await prisma.characterMemory.create({
      data: {
        userId,
        characterId,
        content: fact.content,
        category: fact.category,
        source: "local",
        importance: fact.importance,
      },
    });
  }
}

/** Lightweight fact extraction; Memos owns this in production. */
function extractMemorableFacts(
  userMessage: string,
  assistantReply: string,
): { content: string; category: string; importance: number }[] {
  const facts: { content: string; category: string; importance: number }[] = [];

  const preferencePatterns = [
    /(?:我喜欢|好き|愛して|嫌い|讨厌|生日|誕生日|名字|名前)/,
  ];
  if (preferencePatterns.some((p) => p.test(userMessage))) {
    facts.push({
      content: `用户说: ${userMessage.slice(0, 200)}`,
      category: "preference",
      importance: 0.8,
    });
  }

  if (userMessage.length > 10) {
    facts.push({
      content: `对话摘要 — 用户: "${userMessage.slice(0, 80)}" → ${assistantReply.slice(0, 80)}`,
      category: "conversation",
      importance: 0.4,
    });
  }

  return facts;
}

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) {
    return "（暂无历史记忆 — 这是新对话）";
  }

  return memories
    .map((m, i) => `${i + 1}. [${m.category}] ${m.content}`)
    .join("\n");
}
