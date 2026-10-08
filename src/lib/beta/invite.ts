import { randomInt } from "node:crypto";
import type { InviteCode, Prisma, UserRole } from "@prisma/client";

/** 内测期默认开启；显式设为 "false" 才开放自由注册。 */
export function isInviteOnly(): boolean {
  return process.env.NICHIJOU_INVITE_ONLY?.trim().toLowerCase() !== "false";
}

// 去掉容易看错的 0/O、1/I/L
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** NJ-XXXX-XXXX，31^8 ≈ 8.5e11 种组合 */
export function generateInviteCode(): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `NJ-${pick(4)}-${pick(4)}`;
}

/** 用户手输时容忍小写、空格、漏掉连字符 */
export function normalizeInviteCode(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = compact.startsWith("NJ") ? compact.slice(2) : compact;
  return body.length === 8 ? `NJ-${body.slice(0, 4)}-${body.slice(4)}` : raw.trim().toUpperCase();
}

export class InviteCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteCodeError";
  }
}

function assertUsable(invite: InviteCode | null, email: string): asserts invite is InviteCode {
  if (!invite || invite.revokedAt) throw new InviteCodeError("招待コードが無効です");
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    throw new InviteCodeError("招待コードの有効期限が切れています");
  }
  if (invite.usedCount >= invite.maxUses) throw new InviteCodeError("招待コードは使用済みです");
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new InviteCodeError("この招待コードは別のメールアドレス用です");
  }
}

/**
 * 在注册事务里占用一次邀请码，返回注册后应授予的身份。
 * 用条件更新防并发：两个人同时用最后一次名额，只有一个会成功。
 */
export async function redeemInviteCode(
  tx: Prisma.TransactionClient,
  rawCode: string,
  email: string,
): Promise<{ inviteCodeId: string; grantRole: UserRole }> {
  const code = normalizeInviteCode(rawCode);
  const invite = await tx.inviteCode.findUnique({ where: { code } });
  assertUsable(invite, email);

  const claimed = await tx.inviteCode.updateMany({
    where: { id: invite.id, usedCount: { lt: invite.maxUses }, revokedAt: null },
    data: { usedCount: { increment: 1 } },
  });
  if (claimed.count !== 1) throw new InviteCodeError("招待コードは使用済みです");

  return { inviteCodeId: invite.id, grantRole: invite.grantRole };
}
