/**
 * PostgreSQL 永久记忆插件。
 * 每次对话前查询 user × character 记忆，对话后写入去重后的新记忆。
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MemoryEntry } from "./types";
import { MEMOS_QUERY_TOP_K } from "./types";
import {
  MEMORY_RELEVANCE_THRESHOLD,
  sanitizeMemoryText,
  scoreMemoryRelevance,
} from "./memory-retrieval";

const MEMORY_CANDIDATE_LIMIT = 200;
const CONVERSATION_RETENTION_DAYS = 30;

function conversationRetentionCutoff(): Date {
  return new Date(Date.now() - CONVERSATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
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
  const candidates = await prisma.characterMemory.findMany({
    where: {
      userId,
      characterId,
      OR: [
        { category: { not: "conversation" } },
        { createdAt: { gte: conversationRetentionCutoff() } },
      ],
    },
    orderBy: [{ importance: "desc" }, { createdAt: "desc" }],
    take: MEMORY_CANDIDATE_LIMIT,
  });

  return candidates
    .map((memory) => ({
      ...memory,
      relevance: scoreMemoryRelevance(query, memory.content),
    }))
    .filter((memory) => memory.relevance >= MEMORY_RELEVANCE_THRESHOLD)
    .sort(
      (a, b) =>
        b.relevance - a.relevance ||
        b.importance - a.importance ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, MEMOS_QUERY_TOP_K)
    .map((memory) => ({
      id: memory.id,
      content: memory.content,
      category: memory.category,
      importance: memory.importance,
      source: "local" as const,
    }));
}

async function storeMemosLocal(
  userId: string,
  characterId: string,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  const cleanUserMessage = sanitizeMemoryText(userMessage);
  const cleanAssistantReply = sanitizeMemoryText(assistantReply);
  const extract = extractMemorableFacts(cleanUserMessage, cleanAssistantReply);

  await prisma.characterMemory.deleteMany({
    where: {
      userId,
      characterId,
      category: "conversation",
      createdAt: { lt: conversationRetentionCutoff() },
    },
  });

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
  return JSON.stringify(
    memories.map((memory) => ({
      category: memory.category,
      content: memory.content,
    })),
  );
}
