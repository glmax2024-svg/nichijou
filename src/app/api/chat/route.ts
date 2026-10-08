import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canUseSkill, getSkillPrompt, runChatPipeline, skillsForCharacter } from "@/modules/agent";
import { getChatAccess } from "@/modules/billing";
import {
  enforceAdultUser,
  enforceContentPolicy,
  enforceRateLimit,
  failClosedResponse,
  FailClosedError,
} from "@/modules/governance";

const schema = z.object({
  characterId: z.string(),
  message: z.string().min(1).max(1000),
  /** 通过技能入口发送时带上技能 id */
  skillId: z.string().max(64).optional(),
});

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
    const { characterId, message, skillId } = schema.parse(body);

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

    const access = await getChatAccess(session.user.id, character);
    if (!access.canSend) {
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

    let skillPrompt: string | null = null;
    if (skillId) {
      const skill = skillsForCharacter(character).find((s) => s.id === skillId);
      skillPrompt = skill ? getSkillPrompt(skill.id) : null;
      if (!skill || !skillPrompt) {
        return NextResponse.json({ error: "このキャラクターでは使えないスキルです" }, { status: 400 });
      }
      if (!canUseSkill(skill, { isSubscribed: access.isSubscribed, isLoggedIn: true })) {
        return NextResponse.json({ error: "購読が必要なスキルです", code: "SKILL_LOCKED" }, { status: 403 });
      }
    }

    const userMessage = await prisma.message.create({
      data: {
        userId: session.user.id,
        characterId,
        role: "user",
        content: message,
      },
    });

    // 最近 20 条（不含刚存的这条，它作为 userMessage 单独传入，避免模型看到两遍）
    const history = (
      await prisma.message.findMany({
        where: { userId: session.user.id, characterId, id: { not: userMessage.id } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    ).reverse();

    let pipeline: Awaited<ReturnType<typeof runChatPipeline>>;
    try {
      pipeline = await runChatPipeline({
        userId: session.user.id,
        character,
        history: history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        userMessage: message,
        isSubscribed: access.isSubscribed,
        isCreator: access.isCreator,
        skillPrompt,
      });
    } catch (err) {
      // 没有回复就撤回这条用户消息，否则聊天记录里会留下一条没人回的孤儿消息
      await prisma.message.delete({ where: { id: userMessage.id } }).catch(() => {});
      throw err;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        userId: session.user.id,
        characterId,
        role: "assistant",
        content: pipeline.reply,
        isAiGenerated: true,
      },
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
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "メッセージを確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
