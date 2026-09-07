export type BondSnapshot = {
  intimacy: number;
  stage: string;
  turnCount: number;
  summary: string;
};

const STAGE_LABELS: Record<string, string> = {
  new: "はじめまして",
  acquaintance: "顔見知り",
  friend: "友達",
  close: "親しい",
  devoted: "特別",
};

export function bondStageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? STAGE_LABELS.new;
}

export function formatBondLabel(bond: Pick<BondSnapshot, "stage" | "intimacy"> | null): string | null {
  if (!bond) return null;
  return `${bondStageLabel(bond.stage)} · ${bond.intimacy}`;
}

export function affinityFromBond(bond: Pick<BondSnapshot, "stage" | "intimacy"> | null): {
  level: number;
  percent: number;
  label: string;
} {
  const intimacy = bond?.intimacy ?? 0;
  const stage = bond?.stage ?? "new";
  return {
    level: Math.max(1, Math.min(5, Math.floor(intimacy / 20) + 1)),
    percent: intimacy,
    label: `${bondStageLabel(stage)} · 親密度`,
  };
}
