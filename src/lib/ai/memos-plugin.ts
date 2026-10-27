/**
 * PostgreSQL 永久记忆插件。
 * 每次对话前查询 user × character 记忆，对话后写入去重后的新记忆。
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MemoryEntry } from "./types";
import { MEMOS_QUERY_TOP_K } from "./types";

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

export async function mandatoryMemosQuery(params: QueryParams): Promise<MemoryEntry[]> {
  return queryMemosLocal(params.userId, params.characterId, params.query);
}

export async function mandatoryMemosStore(params: StoreParams): Promise<boolean> {
  await storeMemosLocal(
    params.userId,
    params.characterId,
    params.userMessage,
    params.assistantReply,
  );
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
    const dedupeKey = createHash("sha256").update(fact.content).digest("hex");
    await prisma.characterMemory.upsert({
      where: {
        userId_characterId_dedupeKey: { userId, characterId, dedupeKey },
      },
      create: {
        userId,
        characterId,
        content: fact.content,
        category: fact.category,
        source: "local",
        importance: fact.importance,
        dedupeKey,
      },
      update: {},
    });
  }
}

/** Lightweight fact extraction without another model call. */
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
