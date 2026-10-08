/**
 * 一次性清理演示数据：演示角色（葵、澪）及其全部互动、@demo.jp 演示账号、演示用分成活动。
 *
 *   npm run data:purge-demo -- --confirm
 *
 * 必须先运行 characters:assign-creators，把挂在演示账号下的真实角色转走；
 * 否则删除演示账号会连带删除这些角色，脚本会拒绝执行。
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_SLUGS = ["aoi", "mio"];
const DEMO_EMAIL_SUFFIX = "@demo.jp";

async function main() {
  const demoUsers = await prisma.user.findMany({ where: { email: { endsWith: DEMO_EMAIL_SUFFIX } }, select: { id: true, email: true } });
  const stranded = await prisma.character.findMany({
    where: { creatorId: { in: demoUsers.map((u) => u.id) }, slug: { notIn: DEMO_SLUGS } },
    select: { slug: true },
  });
  if (stranded.length) {
    throw new Error(`还有 ${stranded.length} 个真实角色挂在演示账号下（${stranded.map((s) => s.slug).join(", ")}），先运行 characters:assign-creators`);
  }

  console.log(`将删除：演示角色 ${DEMO_SLUGS.join("、")}；演示账号 ${demoUsers.map((u) => u.email).join(", ")}`);
  if (!process.argv.includes("--confirm")) {
    console.log("（预览模式，加 --confirm 执行）");
    return;
  }

  // 角色的动态、评论、聊天、订阅、订单、礼物、分成、记忆、训练记录都随角色级联删除
  const chars = await prisma.character.deleteMany({ where: { slug: { in: DEMO_SLUGS } } });
  // 账号的点赞、评论、消息、订阅等随账号级联删除
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_EMAIL_SUFFIX } } });
  const campaigns = await prisma.revenueCampaign.deleteMany({ where: { name: "デビュー応援" } });
  console.log(`✓ 删除角色 ${chars.count} 个、账号 ${users.count} 个、演示分成活动 ${campaigns.count} 个`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
