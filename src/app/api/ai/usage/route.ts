import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsageSummary, getTodayOutputTokens } from "@/lib/ai/usage";
import { getBudgetState, SCENE_CONFIG, TIER_MODELS } from "@/lib/ai/model-router";
import { isGatewayConfigured } from "@/lib/ai/gateway";

/** 成本看板 —— 按 scene / model 聚合用量。仅 ADMIN 可见。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 7)));

  const [summary, todayOutput, budget] = await Promise.all([
    getUsageSummary(days),
    getTodayOutputTokens(),
    getBudgetState(),
  ]);

  return NextResponse.json({
    gatewayConfigured: isGatewayConfigured(),
    tierModels: TIER_MODELS,
    scenes: Object.fromEntries(
      Object.entries(SCENE_CONFIG).map(([scene, cfg]) => [
        scene,
        { tier: cfg.tier, maxTokens: cfg.maxTokens, downgradable: cfg.downgradable, label: cfg.label },
      ]),
    ),
    budget: { state: budget, todayOutputTokens: todayOutput },
    ...summary,
  });
}
