import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FailClosedError } from "@/lib/runtime";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { purchaseErrorResponse, purchaseOrder } from "@/lib/purchases";
import { getCoinBalance } from "@/lib/coins";

const schema = z.object({
  characterId: z.string(),
  type: z.enum(["BIRTHDAY", "WAKE_UP", "CUSTOM"]),
  scheduledAt: z.string().datetime().optional(),
  customText: z.string().max(200).optional(),
});

/** 用金币下单：生成台词与语音成功后才扣金币 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "orders", { limit: 8, windowMs: 60_000 }, session.user.id);
  if (limited) return limited;

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;
    const blocked = await enforceContentPolicy(data.customText, "order");
    if (blocked) return blocked;

    const character = await prisma.character.findUnique({ where: { id: data.characterId } });
    if (!character || (!character.published && character.creatorId !== session.user.id)) {
      return NextResponse.json({ error: "キャラクターが見つかりません" }, { status: 404 });
    }

    const { order, voiceText } = await purchaseOrder({
      userId: session.user.id,
      character,
      type: data.type,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      customText: data.customText,
    });

    return NextResponse.json({
      order,
      voiceText,
      voiceCloned: Boolean(character.voiceEmbeddingId),
      balance: await getCoinBalance(session.user.id),
    });
  } catch (error) {
    const purchase = purchaseErrorResponse(error);
    if (purchase) return purchase;
    if (error instanceof FailClosedError) return failClosedResponse(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
    }
    console.error("[orders] failed:", error);
    return NextResponse.json({ error: "注文に失敗しました" }, { status: 500 });
  }
}
