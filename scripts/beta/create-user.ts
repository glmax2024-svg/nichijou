/**
 * 直接创建账号（不走邀请码），用于上线时建第一个管理员 / 合作画师。
 *
 *   NEW_USER_PASSWORD='...' npm run users:create -- --email=you@example.com --name=运营 --role=ADMIN
 *
 * 不传 NEW_USER_PASSWORD 时自动生成一个强密码并打印一次。
 * 邮箱已存在时只更新身份，不改密码。
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || null;
  const role = (arg("role") ?? "FAN").toUpperCase() as UserRole;
  if (!email) throw new Error("缺少 --email=");
  if (!["FAN", "CREATOR", "ADMIN"].includes(role)) throw new Error("--role 只能是 FAN / CREATOR / ADMIN");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role, ...(name ? { name } : {}) } });
    console.log(`✓ 已存在，身份更新为 ${role}：${email}（密码未改动）`);
    return;
  }

  const generated = !process.env.NEW_USER_PASSWORD;
  const password = process.env.NEW_USER_PASSWORD || randomBytes(12).toString("base64url");
  if (password.length < 10) throw new Error("NEW_USER_PASSWORD 至少 10 位");

  const now = new Date();
  await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      // 运营直接创建的账号视为已完成年龄确认与条款同意
      ageVerifiedAt: now,
      termsAcceptedAt: now,
    },
  });
  console.log(`✓ 已创建 ${role}：${email}`);
  if (generated) console.log(`  初始密码（只显示这一次）：${password}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
