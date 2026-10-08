/**
 * 给每个 LoRA 角色（OC）建一个专属画师账号，并把角色转到该账号名下。
 *
 *   npm run characters:assign-creators              # 全部
 *   npm run characters:assign-creators -- --dry-run
 *
 * 账号邮箱为 <slug>@<域名>（默认 creators.nichijou.test，可用 --email-domain 指定），
 * 随机密码写入 .env.accounts.local，不打印。可重复运行，已有专属账号的角色跳过。
 */

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { grantSignupBonus } from "@/lib/coins";
import { saveCredential } from "../lib/credentials";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function main() {
  const domain = arg("email-domain") ?? "creators.nichijou.test";
  const dryRun = process.argv.includes("--dry-run");

  const characters = await prisma.character.findMany({
    where: { loraAdapterId: { startsWith: "anima:" } },
    select: { id: true, slug: true, name: true, creator: { select: { email: true } } },
    orderBy: { slug: "asc" },
  });

  let created = 0;
  let moved = 0;
  for (const c of characters) {
    const email = `${c.slug}@${domain}`;
    if (c.creator.email === email) continue;
    if (dryRun) {
      console.log(`  ${c.slug.padEnd(22)} ${c.creator.email} → ${email}`);
      continue;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const password = randomBytes(12).toString("base64url");
      const now = new Date();
      user = await prisma.user.create({
        data: {
          email,
          name: `${c.name} 公式`,
          role: "CREATOR",
          passwordHash: await bcrypt.hash(password, 10),
          ageVerifiedAt: now,
          termsAcceptedAt: now,
        },
      });
      await grantSignupBonus(prisma, user.id);
      saveCredential(email, password, `画师账号 · ${c.name}`);
      created++;
    }
    await prisma.character.update({ where: { id: c.id }, data: { creatorId: user.id } });
    moved++;
  }
  console.log(dryRun ? `（预览）共 ${characters.length} 个 LoRA 角色` : `✓ 新建画师账号 ${created} 个，转移角色 ${moved} 个；密码已写入 .env.accounts.local`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
