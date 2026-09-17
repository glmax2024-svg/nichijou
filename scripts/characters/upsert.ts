/**
 * 按 roster.ts 创建 / 更新角色，并用角色自己的 LoRA 生成头像和封面。
 *
 *   npm run characters:upsert -- --creator-email=creator@demo.jp
 *   npm run characters:upsert -- --creator-email=... --only=wanting --regen-media
 *
 * 可重复执行：人设字段每次覆盖；头像/封面已存在时跳过，除非传 --regen-media。
 */

import { PrismaClient } from "@prisma/client";
import { putUpload } from "@/lib/storage";
import { generateAnimaImages, parseAnimaAdapter } from "@/lib/ai/providers/anima";
import { ROSTER, type RosterCharacter, type RosterMedia } from "./roster";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function renderMedia(c: RosterCharacter, characterId: string, media: RosterMedia) {
  const lora = parseAnimaAdapter(c.loraAdapterId);
  if (!lora) throw new Error(`${c.slug}: loraAdapterId 不是 anima 绑定，无法生成形象图`);

  const [image] = await generateAnimaImages({
    lora,
    prompt: media.withCharacter ? `${c.triggerWord}, ${media.prompt}` : media.prompt,
    negativePrompt: media.withCharacter
      ? c.negativePrompt
      : `${c.negativePrompt}, 1girl, person, people, character`,
    strength: media.withCharacter ? 0.85 : 0,
    steps: 28,
    batch: 1,
    width: media.width,
    height: media.height,
    seed: media.seed,
  });
  const stored = await putUpload({
    kind: "generated",
    characterId,
    body: image.body,
    contentType: image.contentType,
  });
  return { url: stored.url, seed: image.seed };
}

async function main() {
  const creatorEmail = arg("creator-email");
  if (!creatorEmail) throw new Error("缺少 --creator-email=<创作者账号邮箱>");
  const creator = await prisma.user.findUnique({ where: { email: creatorEmail } });
  if (!creator) throw new Error(`找不到用户 ${creatorEmail}`);

  const only = arg("only");
  const targets = only ? ROSTER.filter((c) => c.slug === only) : ROSTER;
  if (targets.length === 0) throw new Error(`roster 里没有 slug=${only}`);

  for (const c of targets) {
    const persona = {
      name: c.name,
      tagline: c.tagline,
      bio: c.bio,
      personality: c.personality,
      speechStyle: c.speechStyle,
      identity: c.identity,
      worldRules: c.worldRules,
      brandVoice: c.brandVoice,
      boundaries: c.boundaries,
      tags: c.tags,
      contentRating: c.contentRating,
      skillIds: c.skillIds,
      subscriptionPrice: c.subscriptionPrice,
      triggerWord: c.triggerWord,
      loraAdapterId: c.loraAdapterId,
      loraStatus: "READY" as const,
      loraVersion: 1,
      voiceEmbeddingId: c.voiceEmbeddingId,
    };

    // 先不发布：形象图生成失败时不会出现一个没有头像的公开角色
    const row = await prisma.character.upsert({
      where: { slug: c.slug },
      update: persona,
      create: { ...persona, slug: c.slug, avatarUrl: "", published: false, creatorId: creator.id },
    });
    console.log(`[${c.slug}] 人设已写入 (${row.id})`);

    const needMedia = flag("regen-media") || !row.avatarUrl || !row.coverUrl;
    let avatarUrl = row.avatarUrl;
    let coverUrl = row.coverUrl;
    if (needMedia) {
      console.log(`[${c.slug}] 生成头像…（服务冷启动时单张可能超过 1 分钟）`);
      const avatar = await renderMedia(c, row.id, c.avatar);
      console.log(`[${c.slug}] 头像 ${avatar.url} seed=${avatar.seed}`);
      console.log(`[${c.slug}] 生成封面…`);
      const cover = await renderMedia(c, row.id, c.cover);
      console.log(`[${c.slug}] 封面 ${cover.url} seed=${cover.seed}`);
      avatarUrl = avatar.url;
      coverUrl = cover.url;
    } else {
      console.log(`[${c.slug}] 头像/封面已存在，跳过（--regen-media 可重新生成）`);
    }

    await prisma.character.update({
      where: { id: row.id },
      data: { avatarUrl, coverUrl, published: c.published },
    });
    console.log(`[${c.slug}] 完成 published=${c.published}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
