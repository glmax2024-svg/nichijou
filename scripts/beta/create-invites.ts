/**
 * 批量发邀请码（后台界面也能发，这个用于上线前准备或一次发很多）。
 *
 *   npm run invites:create -- --count=10 --role=CREATOR --days=30 --note="提携絵師"
 *   npm run invites:create -- --email=someone@example.com --role=FAN
 *   npm run invites:create -- --uses=50 --days=7 --note="イベント配布"     # 一码多用
 */

import { PrismaClient, type UserRole } from "@prisma/client";
import { generateInviteCode } from "@/lib/beta/invite";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function main() {
  const count = Number(arg("count") ?? 1);
  const maxUses = Number(arg("uses") ?? 1);
  const days = arg("days") === "0" ? null : Number(arg("days") ?? 14);
  const role = (arg("role") ?? "FAN").toUpperCase() as UserRole;
  const email = arg("email")?.trim().toLowerCase() || null;
  const note = arg("note") ?? null;

  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error("--count 要在 1–500 之间");
  if (!Number.isInteger(maxUses) || maxUses < 1) throw new Error("--uses 至少为 1");
  if (!["FAN", "CREATOR"].includes(role)) throw new Error("--role 只能是 FAN / CREATOR（管理员请用 users:create）");
  if (email && count > 1) throw new Error("指定 --email 时只能发 1 个");

  const expiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;
  const base = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";

  for (let i = 0; i < count; i++) {
    const invite = await prisma.inviteCode.create({
      data: { code: generateInviteCode(), grantRole: role, email, maxUses, expiresAt, note },
    });
    console.log(`${invite.code}\t${base}/login?invite=${invite.code}`);
  }
  console.error(
    `✓ 发放 ${count} 个 · ${role} · 每个 ${maxUses} 次 · ${expiresAt ? `${expiresAt.toLocaleDateString("ja-JP")} 到期` : "无期限"}${email ? ` · 限 ${email}` : ""}`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
