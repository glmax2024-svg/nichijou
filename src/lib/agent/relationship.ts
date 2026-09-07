import { prisma } from "@/lib/prisma";
import { bondStageLabel, type BondSnapshot } from "@/lib/agent/bond-display";

export type { BondSnapshot } from "@/lib/agent/bond-display";
export { affinityFromBond, bondStageLabel, formatBondLabel } from "@/lib/agent/bond-display";

export type BondEventType = "chat" | "gift" | "order";

export function stageFromIntimacy(intimacy: number): string {
  if (intimacy >= 60) return "devoted";
  if (intimacy >= 35) return "close";
  if (intimacy >= 15) return "friend";
  if (intimacy >= 5) return "acquaintance";
  return "new";
}

export async function loadBond(userId: string, characterId: string): Promise<BondSnapshot | null> {
  const bond = await prisma.characterBond.findUnique({
    where: { userId_characterId: { userId, characterId } },
    select: { intimacy: true, stage: true, turnCount: true, summary: true },
  });
  return bond;
}

export async function recordBondInteraction(input: {
  userId: string;
  characterId: string;
  type: BondEventType;
  summary: string;
  delta: number;
}): Promise<BondSnapshot> {
  const summary = input.summary.replace(/\s+/g, " ").trim().slice(0, 180);
  const existing = await prisma.characterBond.findUnique({
    where: { userId_characterId: { userId: input.userId, characterId: input.characterId } },
  });

  const intimacy = Math.max(0, Math.min(100, (existing?.intimacy ?? 0) + input.delta));
  const stage = stageFromIntimacy(intimacy);
  const turnCount = (existing?.turnCount ?? 0) + (input.type === "chat" ? 1 : 0);
  const rolled = [summary, existing?.summary].filter(Boolean).join(" / ").slice(0, 280);

  const bond = await prisma.characterBond.upsert({
    where: { userId_characterId: { userId: input.userId, characterId: input.characterId } },
    create: {
      userId: input.userId,
      characterId: input.characterId,
      intimacy,
      stage,
      turnCount,
      summary: rolled,
      lastUserMessage: input.type === "chat" ? summary : "",
      events: {
        create: { type: input.type, summary, deltaIntimacy: input.delta },
      },
    },
    update: {
      intimacy,
      stage,
      turnCount,
      summary: rolled,
      lastUserMessage: input.type === "chat" ? summary : existing?.lastUserMessage,
      events: {
        create: { type: input.type, summary, deltaIntimacy: input.delta },
      },
    },
  });

  return {
    intimacy: bond.intimacy,
    stage: bond.stage,
    turnCount: bond.turnCount,
    summary: bond.summary,
  };
}

export function formatBondForPrompt(bond: BondSnapshot | null): string {
  if (!bond) {
    return "まだ関係の記録はありません。初対面として丁寧に接する。";
  }
  return `段階: ${bondStageLabel(bond.stage)}（${bond.stage}）
親密度: ${bond.intimacy}/100
会話回数: ${bond.turnCount}
最近: ${bond.summary || "（なし）"}`;
}
