import { prisma } from "@/lib/prisma";
import {
  CREATOR_SHARE_SETTING_KEY,
  DEFAULT_CREATOR_SHARE_BPS,
  applyShare,
  clampShareBps,
  pickCampaign,
  type RevenueKind,
} from "./split";

export { applyShare, clampShareBps, formatSharePercent, pickCampaign, percentToBps, bpsToPercent } from "./split";
export { DEFAULT_CREATOR_SHARE_BPS, MAX_SHARE_BPS, CREATOR_SHARE_SETTING_KEY } from "./split";

export async function getGlobalCreatorShareBps() {
  const row = await prisma.platformSetting.findUnique({
    where: { key: CREATOR_SHARE_SETTING_KEY },
  });
  if (!row) return DEFAULT_CREATOR_SHARE_BPS;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? clampShareBps(parsed) : DEFAULT_CREATOR_SHARE_BPS;
}

export async function setGlobalCreatorShareBps(bps: number) {
  const value = String(clampShareBps(bps));
  await prisma.platformSetting.upsert({
    where: { key: CREATOR_SHARE_SETTING_KEY },
    create: { key: CREATOR_SHARE_SETTING_KEY, value },
    update: { value },
  });
  return clampShareBps(bps);
}

export async function resolveCreatorShare(params: {
  creatorId: string;
  characterId: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const [globalBps, creator, character, campaigns] = await Promise.all([
    getGlobalCreatorShareBps(),
    prisma.user.findUnique({
      where: { id: params.creatorId },
      select: { creatorShareBps: true },
    }),
    prisma.character.findUnique({
      where: { id: params.characterId },
      select: { creatorShareBps: true },
    }),
    prisma.revenueCampaign.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { scope: "GLOBAL" },
          { scope: "CREATOR", creatorId: params.creatorId },
          { scope: "CHARACTER", characterId: params.characterId },
        ],
      },
    }),
  ]);

  const baseBps =
    character?.creatorShareBps ?? creator?.creatorShareBps ?? globalBps;
  const campaign = pickCampaign(campaigns, params);
  const split = applyShare(0, baseBps, campaign?.bonusBps ?? 0);
  return {
    baseBps: split.creatorShareBps,
    bonusBps: split.bonusBps,
    finalShareBps: split.finalShareBps,
    campaign: campaign
      ? { id: campaign.id, name: campaign.name, bonusBps: campaign.bonusBps }
      : null,
  };
}

export async function recordRevenueShare(input: {
  characterId: string;
  kind: RevenueKind;
  sourceId: string;
  grossAmount: number;
}) {
  const gross = Math.max(0, Math.round(input.grossAmount));
  if (!gross || !input.sourceId) return null;

  const existing = await prisma.creatorEarning.findUnique({
    where: { sourceId: input.sourceId },
  });
  if (existing) return existing;

  const character = await prisma.character.findUnique({
    where: { id: input.characterId },
    select: { id: true, creatorId: true },
  });
  if (!character) return null;

  const resolved = await resolveCreatorShare({
    creatorId: character.creatorId,
    characterId: character.id,
  });
  const split = applyShare(gross, resolved.baseBps, resolved.bonusBps);

  return prisma.creatorEarning.create({
    data: {
      creatorId: character.creatorId,
      characterId: character.id,
      kind: input.kind,
      sourceId: input.sourceId,
      grossAmount: gross,
      creatorShareBps: split.creatorShareBps,
      bonusBps: split.bonusBps,
      finalShareBps: split.finalShareBps,
      creatorAmount: split.creatorAmount,
      platformAmount: split.platformAmount,
      campaignId: resolved.campaign?.id ?? null,
      campaignName: resolved.campaign?.name ?? null,
      status: "PENDING",
    },
  });
}
