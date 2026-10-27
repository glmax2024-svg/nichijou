import { Prisma, type Message } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const STALE_PROCESSING_MS = 10 * 60 * 1000;

export class ChatInteractionConflictError extends Error {
  constructor() {
    super("requestId 已用于其他聊天内容");
    this.name = "ChatInteractionConflictError";
  }
}

type ChatInteractionParams = {
  requestId: string;
  userId: string;
  characterId: string;
  message: string;
};

export type ChatInteractionResolution =
  | { kind: "new" }
  | { kind: "processing" }
  | { kind: "started"; userMessage: Message }
  | { kind: "completed"; userMessage: Message; assistantMessage: Message };

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function resolveChatInteraction(
  params: ChatInteractionParams,
  allowCreate: boolean,
  depth = 0,
): Promise<ChatInteractionResolution> {
  const { requestId, userId, characterId, message } = params;
  const existing = await prisma.chatInteraction.findUnique({ where: { id: requestId } });

  if (existing) {
    if (existing.userId !== userId || existing.characterId !== characterId) {
      throw new ChatInteractionConflictError();
    }

    const userMessage = await prisma.message.findUnique({ where: { id: existing.userMessageId } });
    if (!userMessage || userMessage.content !== message) {
      throw new ChatInteractionConflictError();
    }

    if (existing.status === "COMPLETED" && existing.assistantMessageId) {
      const assistantMessage = await prisma.message.findUnique({
        where: { id: existing.assistantMessageId },
      });
      if (!assistantMessage) throw new Error("Completed chat interaction is missing its reply");
      return { kind: "completed", userMessage, assistantMessage };
    }

    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const canResume =
      existing.status === "FAILED" ||
      (existing.status === "PROCESSING" && existing.updatedAt < staleBefore);

    if (!canResume) return { kind: "processing" };

    const resumed = await prisma.chatInteraction.updateMany({
      where: {
        id: requestId,
        status: existing.status,
        ...(existing.status === "PROCESSING" ? { updatedAt: { lt: staleBefore } } : {}),
      },
      data: { status: "PROCESSING" },
    });
    if (resumed.count === 1) return { kind: "started", userMessage };
  } else if (allowCreate) {
    try {
      const userMessage = await prisma.$transaction(async (tx) => {
        const createdMessage = await tx.message.create({
          data: {
            userId,
            characterId,
            role: "user",
            content: message,
          },
        });
        await tx.chatInteraction.create({
          data: {
            id: requestId,
            userId,
            characterId,
            userMessageId: createdMessage.id,
          },
        });
        return createdMessage;
      });
      return { kind: "started", userMessage };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  } else {
    return { kind: "new" };
  }

  if (depth >= 2) throw new Error("Unable to acquire chat interaction");
  return resolveChatInteraction(params, false, depth + 1);
}

export function resumeChatInteraction(params: ChatInteractionParams) {
  return resolveChatInteraction(params, false);
}

export function beginChatInteraction(params: ChatInteractionParams) {
  return resolveChatInteraction(params, true);
}

export async function completeChatInteraction(params: {
  requestId: string;
  userId: string;
  characterId: string;
  reply: string;
}): Promise<Message> {
  return prisma.$transaction(async (tx) => {
    const assistantMessage = await tx.message.create({
      data: {
        userId: params.userId,
        characterId: params.characterId,
        role: "assistant",
        content: params.reply,
        isAiGenerated: true,
      },
    });
    const completed = await tx.chatInteraction.updateMany({
      where: {
        id: params.requestId,
        userId: params.userId,
        characterId: params.characterId,
        status: "PROCESSING",
      },
      data: {
        status: "COMPLETED",
        assistantMessageId: assistantMessage.id,
      },
    });
    if (completed.count !== 1) throw new Error("Chat interaction is no longer processing");
    return assistantMessage;
  });
}

export async function failChatInteraction(requestId: string): Promise<void> {
  await prisma.chatInteraction.updateMany({
    where: { id: requestId, status: "PROCESSING" },
    data: { status: "FAILED" },
  });
}
