/**
 * 画师分成：默认 5:5，后台可改全局/画师/角色比例，限时活动给画师加成。
 *
 * 比例用 basis points：5000 = 50.00%。日元取整，零头归平台。
 */

export const DEFAULT_CREATOR_SHARE_BPS = 5000;
export const MAX_SHARE_BPS = 10_000;
export const CREATOR_SHARE_SETTING_KEY = "creator_share_bps";

export type RevenueKind = "SUBSCRIPTION" | "GIFT" | "ORDER";

export type CampaignCandidate = {
  id: string;
  name: string;
  bonusBps: number;
  scope: string;
  creatorId: string | null;
  characterId: string | null;
  active: boolean;
  startsAt: Date;
  endsAt: Date;
};

export function clampShareBps(bps: number) {
  if (!Number.isFinite(bps)) return DEFAULT_CREATOR_SHARE_BPS;
  return Math.min(MAX_SHARE_BPS, Math.max(0, Math.round(bps)));
}

export function applyShare(grossAmount: number, baseBps: number, bonusBps: number) {
  const gross = Math.max(0, Math.round(grossAmount));
  const creatorShareBps = clampShareBps(baseBps);
  const bonus = Math.max(0, Math.round(bonusBps));
  const finalShareBps = clampShareBps(creatorShareBps + bonus);
  const creatorAmount = Math.floor((gross * finalShareBps) / MAX_SHARE_BPS);
  return {
    creatorShareBps,
    bonusBps: bonus,
    finalShareBps,
    creatorAmount,
    platformAmount: gross - creatorAmount,
  };
}

export function pickCampaign(
  campaigns: CampaignCandidate[],
  params: { creatorId: string; characterId: string; now?: Date },
): CampaignCandidate | null {
  const now = params.now ?? new Date();
  const eligible = campaigns.filter((c) => {
    if (!c.active) return false;
    if (c.startsAt > now || c.endsAt < now) return false;
    if (c.scope === "CHARACTER") return c.characterId === params.characterId;
    if (c.scope === "CREATOR") return c.creatorId === params.creatorId;
    return c.scope === "GLOBAL";
  });
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    const spec = campaignSpecificity(b) - campaignSpecificity(a);
    if (spec !== 0) return spec;
    return b.bonusBps - a.bonusBps;
  });
  return eligible[0] ?? null;
}

function campaignSpecificity(campaign: CampaignCandidate) {
  if (campaign.scope === "CHARACTER") return 3;
  if (campaign.scope === "CREATOR") return 2;
  return 1;
}

export function formatSharePercent(bps: number) {
  const pct = clampShareBps(bps) / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function percentToBps(percent: number) {
  return clampShareBps(percent * 100);
}

export function bpsToPercent(bps: number) {
  return clampShareBps(bps) / 100;
}
