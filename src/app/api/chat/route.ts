import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { runChatPipeline } from "@/modules/agent";
import { getChatAccess } from "@/modules/billing";
import {
  enforceAdultUser,
  enforceContentPolicy,
  enforceRateLimit,
  failClosedResponse,
  FailClosedError,
} from "@/modules/governance";
import {
  beginChatInteraction,
  ChatInteractionConflictError,
  completeChatInteraction,
  failChatInteraction,
  resumeChatInteraction,
  type ChatInteractionResolution,
} from "@/lib/chat-interaction";

const schema = z.object({
  characterId: z.string(),
  message: z.string().min(1).max(1000),
  requestId: z.string().uuid(),
});

function resolutionResponse(resolution: ChatInteractionResolution) {
  if (resolution.kind === "completed") {
    return NextResponse.json({
      userMessage: resolution.userMessage,
      assistantMessage: resolution.assistantMessage,
    });
  }
  if (resolution.kind === "processing") {
    return NextResponse.json(
      { error: "返信を処理しています。しばらくしてからもう一度お試しください", code: "CHAT_IN_PROGRESS" },
      { status: 409 },
    );
  }
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "chat",
    { limit: 40, windowMs: 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const { characterId, message, requestId } = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }
    const blocked = await enforceContentPolicy(message, "chat", {
      contentRating: character.contentRating,
    });
    if (blocked) return blocked;

    const interactionParams = { requestId, userId: session.user.id, characterId, message };
    let resolution = await resumeChatInteraction(interactionParams);
    let response = resolutionResponse(resolution);
    if (response) return response;

    const access = await getChatAccess(session.user.id, character);
    if (resolution.kind === "new" && !access.canSend) {
      return NextResponse.json(
        {
          error: "本日の無料メッセージ上限に達しました",
          code: "DAILY_LIMIT",
          used: access.used,
          limit: access.limit,
          remaining: 0,
        },
        { status: 403 },
      );
    }

    if (resolution.kind === "new") {
      resolution = await beginChatInteraction(interactionParams);
      response = resolutionResponse(resolution);
      if (response) return response;
    }
    if (resolution.kind !== "started") throw new Error("Unable to start chat interaction");

    const { userMessage } = resolution;
    const history = await prisma.message.findMany({
      where: { userId: session.user.id, characterId, id: { not: userMessage.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    try {
      const pipeline = await runChatPipeline({
        userId: session.user.id,
        character,
        history: history.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        userMessage: message,
        requestId,
        isSubscribed: access.isSubscribed,
        isCreator: access.isCreator,
      });

      const assistantMessage = await completeChatInteraction({
        requestId,
        userId: session.user.id,
        characterId,
        reply: pipeline.reply,
      });

      return NextResponse.json({
        userMessage,
        assistantMessage,
        ai: {
          memoriesUsed: pipeline.memoriesQueried.length,
          loraAdapterId: pipeline.loraAdapterId,
          memoryStored: pipeline.memoryStored,
          bond: pipeline.bond,
        },
      });
    } catch (error) {
      try {
        await failChatInteraction(requestId);
      } catch (statusError) {
        console.error("[chat] failed to mark interaction as failed:", statusError);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof ChatInteractionConflictError) {
      return NextResponse.json(
        { error: error.message, code: "CHAT_REQUEST_CONFLICT" },
        { status: 409 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "メッセージを確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
