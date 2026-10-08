/**
 * 金币。余额只能通过这里变更：余额与流水在同一个事务里写，保证随时可以对账。
 *
 * 目前没有充值，每个账号注册时发放 SIGNUP_BONUS。
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SIGNUP_BONUS = 10_000;

type Db = PrismaClient | Prisma.TransactionClient;

export class InsufficientCoinsError extends Error {
  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super("金币不足");
    this.name = "InsufficientCoinsError";
  }
}

export type CoinChange = {
  userId: string;
  /** 正数收入，负数支出 */
  delta: number;
  reason: string;
  /** 关联对象。同一 reason + refType + refId 只会记一次账（幂等） */
  refType?: string;
  refId?: string;
};

/**
 * 增减金币。支出时余额不足抛 InsufficientCoinsError；
 * 同一笔（reason + refType + refId）重复调用直接返回已有记录，不会重复扣款。
 */
async function applyChange(db: Prisma.TransactionClient, change: CoinChange) {
  if (!Number.isInteger(change.delta) || change.delta === 0) throw new Error("delta 必须是非零整数");

  if (change.refType && change.refId) {
    const existing = await db.coinTransaction.findUnique({
      where: { reason_refType_refId: { reason: change.reason, refType: change.refType, refId: change.refId } },
    });
    if (existing) return existing;
  }

  // 条件更新：支出时要求余额足够，避免并发扣成负数
  const updated = await db.user.updateMany({
    where: { id: change.userId, ...(change.delta < 0 ? { coinBalance: { gte: -change.delta } } : {}) },
    data: { coinBalance: { increment: change.delta } },
  });
  if (updated.count !== 1) {
    const user = await db.user.findUnique({ where: { id: change.userId }, select: { coinBalance: true } });
    if (!user) throw new Error("用户不存在");
    throw new InsufficientCoinsError(user.coinBalance, -change.delta);
  }

  const { coinBalance } = await db.user.findUniqueOrThrow({ where: { id: change.userId }, select: { coinBalance: true } });
  return db.coinTransaction.create({
    data: {
      userId: change.userId,
      delta: change.delta,
      balanceAfter: coinBalance,
      reason: change.reason,
      refType: change.refType ?? null,
      refId: change.refId ?? null,
    },
  });
}

/** 在调用方已有的事务里执行（例如扣金币与创建礼物记录必须同成同败） */
export function changeCoinsInTx(tx: Prisma.TransactionClient, change: CoinChange) {
  return applyChange(tx, change);
}

export function changeCoins(change: CoinChange) {
  return prisma.$transaction((tx) => applyChange(tx, change));
}

/** 注册赠送。按用户 id 幂等，重复调用不会多发 */
export function grantSignupBonus(db: Db, userId: string) {
  const change = { userId, delta: SIGNUP_BONUS, reason: "signup_bonus", refType: "user", refId: userId };
  return "$transaction" in db ? (db as PrismaClient).$transaction((tx) => applyChange(tx, change)) : applyChange(db, change);
}

export async function getCoinBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true } });
  return user?.coinBalance ?? 0;
}

