/**
 * 种子数据：只放业务运行必需的配置，不生成任何演示账号、角色或互动。
 *
 * 账号用 npm run users:create 创建；角色用 npm run characters:import / characters:upsert 导入。
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 礼物目录（价格单位：金币）。管理员之后可在 /admin/gifts 调整，这里只在不存在时创建 */
const GIFT_CATALOG = [
  { slug: "flower", name: "花束", emoji: "💐", amount: 300, sortOrder: 10, accentColor: "#ffe1e6", intimacyDelta: 3 },
  { slug: "coffee", name: "コーヒー", emoji: "☕", amount: 500, sortOrder: 20, accentColor: "#eaf1fb", intimacyDelta: 3 },
  { slug: "cake", name: "ケーキ", emoji: "🎂", amount: 980, sortOrder: 30, accentColor: "#fff2e0", intimacyDelta: 4 },
  { slug: "star", name: "星", emoji: "⭐", amount: 1500, sortOrder: 40, accentColor: "#eafaf1", intimacyDelta: 5 },
];

async function main() {
  // 画师分成比例（万分比），已存在则不覆盖，避免冲掉后台改过的值
  await prisma.platformSetting.upsert({
    where: { key: "creator_share_bps" },
    update: {},
    create: { key: "creator_share_bps", value: "5000" },
  });

  for (const item of GIFT_CATALOG) {
    await prisma.giftItem.upsert({
      where: { slug: item.slug },
      update: {},
      create: { ...item, animationKind: "none", active: true },
    });
  }

  console.log(`✓ 平台设置 1 项，礼物目录 ${GIFT_CATALOG.length} 项（已存在的保持不变）`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
