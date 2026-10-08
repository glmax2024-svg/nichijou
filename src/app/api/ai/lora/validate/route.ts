import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requireCharacterOwner } from "@/lib/ai/lora-access";
import { TrainingError, validateTrainingDataset } from "@/lib/ai/lora-training";

const schema = z.object({ characterId: z.string(), imageUrls: z.array(z.string()).min(1).max(100) });

/** 提交训练前的真实校验：数量、格式、去重。不占 GPU，不消耗额度。 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });

  const { error, actor } = await requireCharacterOwner(parsed.data.characterId);
  if (error) return error;

  const limited = enforceRateLimit(request, "lora-validate", { limit: 20, windowMs: 10 * 60_000 }, actor.id);
  if (limited) return limited;

  try {
    const result = await validateTrainingDataset(parsed.data.characterId, parsed.data.imageUrls);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TrainingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[lora/validate]", err);
    return NextResponse.json({ error: "校验失败，请稍后再试" }, { status: 500 });
  }
}
