/**
 * 给每个角色补一段互不撞车的连载背景，并发布「今天这一话」日常帖（短文 + 配图）。
 *
 *   npm run characters:manga-day -- --only=wanting
 *   npm run characters:manga-day -- --limit=3
 *   npm run characters:manga-day
 *   npm run characters:manga-day -- --posts-only   # 只发新一话，不改人设
 *   npm run characters:manga-day -- --force   # 已发过也再发一话
 */
import { PrismaClient } from "@prisma/client";
import { runSceneChat } from "@/lib/ai/model-router";
import { generateAnimaImages, parseAnimaAdapter } from "@/lib/ai/providers/anima";
import { resolveMediaUrl, storeMediaAsset } from "@/lib/media";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name: string) => process.argv.includes(`--${name}`);

type Panel = { caption: string; prompt: string };
type Plan = {
  tagline: string;
  bio: string;
  identity: string;
  worldRules: string;
  brandVoice: string;
  episodeTitle: string;
  layout: "single" | "pages" | "lineart";
  panels: Panel[];
};

const NEGATIVE =
  "blurry, low quality, distorted face, extra fingers, watermark, text, letters, signature, photorealistic, 3d render, nsfw";

function layoutFor(slug: string): Plan["layout"] {
  const n = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (["single", "pages", "lineart"] as const)[n % 3];
}

function styleFor(layout: Plan["layout"]) {
  if (layout === "lineart") {
    return "manga page, monochrome, screentones, clean lineart, comic panel layout, anime manga, no letters, no text";
  }
  if (layout === "pages") {
    return "anime illustration, cinematic lighting, storyboard still, detailed background, no letters, no text";
  }
  return "anime illustration, soft lighting, slice of life, detailed background, no letters, no text";
}

function sizeFor(layout: Plan["layout"]) {
  if (layout === "lineart") return { width: 832, height: 1216 };
  if (layout === "pages") return { width: 896, height: 1152 };
  return { width: 1024, height: 1024 };
}

function extractJson(text: string): Plan {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!raw) throw new Error(`模型没有返回 JSON: ${text.slice(0, 180)}`);
  let parsed: Plan;
  try {
    parsed = JSON.parse(raw) as Plan;
  } catch {
    throw new Error(`JSON 不完整: ${raw.slice(-120)}`);
  }
  if (!parsed.tagline || !parsed.bio || !Array.isArray(parsed.panels) || parsed.panels.length === 0) {
    throw new Error("JSON 缺字段");
  }
  return parsed;
}

async function planEpisode(input: {
  slug: string;
  name: string;
  gender: string | null;
  sourceWork: string | null;
  personality: string;
  speechStyle: string;
  bio: string;
  identity: string;
  worldRules: string;
  used: string[];
  layout: Plan["layout"];
}): Promise<Plan> {
  const panelCount = input.layout === "pages" ? 2 : 1;
  const result = await runSceneChat({
    scene: "post.draft",
    characterId: null,
        maxTokens: 2500,
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content: [
          "あなたは日本向けキャラクターSNSの連載漫画編集者です。",
          "出力は JSON だけ。説明文やコードフェンスは不要。",
          "全年齢。性的表現・過度な暴力・未成年の恋愛は禁止。",
          "各キャラの舞台・仕事・今日の事件は、他キャラと重複させない。",
          "既存作品のキャラでも、大事件は起こさず日常の一話にする。",
          "caption はキャラの口調で1〜2文、40字以内。絵の説明は書かない。",
          "prompt は英語の視覚描写のみ。人物は一人、トリガーワードは書かない。",
          "bio は120字以内。JSON は短く、必ず最後まで閉じる。",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            name: input.name,
            slug: input.slug,
            gender: input.gender,
            sourceWork: input.sourceWork,
            personality: input.personality,
            speechStyle: input.speechStyle,
            currentBio: input.bio,
            currentIdentity: input.identity,
            currentWorld: input.worldRules,
            alreadyUsedSettings: input.used,
            layout: input.layout,
            panelCount,
            schema: {
              tagline: "一行紹介（身分 · 場所）",
              bio: "120〜200字の日本語プロフィール。他キャラと被らない生活圏",
              identity: "ユーザーとの関係を含む立ち位置",
              worldRules: "舞台とルール。日常寄り",
              brandVoice: "語り口のトーン一文",
              episodeTitle: "今日の話の題",
              layout: input.layout,
              panels: [{ caption: "短い日本語", prompt: "english scene" }],
            },
          },
          null,
          0,
        ),
      },
    ],
  });
  const plan = extractJson(result.text);
  plan.layout = input.layout;
  plan.panels = plan.panels.slice(0, panelCount).map((p) => ({
    caption: String(p.caption ?? "").trim().slice(0, 80),
    prompt: String(p.prompt ?? "").trim(),
  }));
  if (plan.panels.some((p) => !p.caption || !p.prompt)) throw new Error("分镜 caption/prompt 为空");
  return plan;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function renderPanel(params: {
  characterId: string;
  lora: string;
  triggerWord: string;
  layout: Plan["layout"];
  prompt: string;
}) {
  const size = sizeFor(params.layout);
  let lastErr: unknown;
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const [image] = await generateAnimaImages({
        lora: params.lora,
        prompt: `${params.triggerWord}, ${params.prompt}, ${styleFor(params.layout)}`,
        negativePrompt: NEGATIVE,
        strength: 0.85,
        steps: 28,
        batch: 1,
        width: size.width,
        height: size.height,
      });
      const asset = await storeMediaAsset({
        kind: "IMAGE",
        visibility: "PUBLIC",
        body: image.body,
        contentType: image.contentType,
        source: "anima",
        characterId: params.characterId,
        sourceMeta: { layout: params.layout, seed: image.seed, prompt: params.prompt },
      });
      return resolveMediaUrl(asset);
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/50[234]|GPU busy|fetch failed|timeout/.test(msg) || attempt === 14) throw err;
      const wait = Math.min(60_000, 8000 * 2 ** Math.min(attempt, 3));
      console.log(`  GPU busy, wait ${Math.round(wait / 1000)}s (try ${attempt + 1}/15)`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function main() {
  const only = arg("only");
  const limit = Number(arg("limit") || "0") || 0;
  const force = flag("force");
  const postsOnly = flag("posts-only");
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const where = only ? { slug: only } : {};
  const characters = await prisma.character.findMany({
    where,
    orderBy: { slug: "asc" },
    include: { _count: { select: { posts: true } } },
  });
  if (characters.length === 0) throw new Error(only ? `没有 slug=${only}` : "没有角色");

  const used: string[] = characters
    .filter((c) => c.tagline?.trim())
    .map((c) => `${c.name}: ${c.tagline!.trim()}`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const targets = limit > 0 ? characters.slice(0, limit) : characters;

  for (const c of targets) {
    const lora = parseAnimaAdapter(c.loraAdapterId);
    if (!lora || !c.triggerWord) {
      console.log(`[skip] ${c.slug} 没有 Anima LoRA / triggerWord`);
      skipped++;
      continue;
    }
    if (!force) {
      const today = await prisma.post.count({
        where: { characterId: c.id, isAiAssisted: true, publishedAt: { gte: startOfDay } },
      });
      if (today > 0) {
        console.log(`[skip] ${c.slug} 今天已经发过连载`);
        skipped++;
        continue;
      }
    }

    const layout = layoutFor(c.slug);
    console.log(`▸ ${c.slug} ${c.name} layout=${layout}`);
    try {
      let plan: Plan | null = null;
      for (let attempt = 0; attempt < 2 && !plan; attempt++) {
        try {
          plan = await planEpisode({
            slug: c.slug,
            name: c.name,
            gender: c.gender,
            sourceWork: c.ipSourceWork,
            personality: c.personality,
            speechStyle: c.speechStyle,
            bio: c.bio,
            identity: c.identity,
            worldRules: c.worldRules,
            used,
            layout,
          });
        } catch (err) {
          if (attempt === 1) throw err;
          console.log(`  文案 JSON 重试: ${err instanceof Error ? err.message : err}`);
        }
      }
      if (!plan) throw new Error("文案生成失败");
      used.push(`${c.name}: ${plan.tagline}`);

      if (!postsOnly) {
        await prisma.character.update({
          where: { id: c.id },
          data: {
            tagline: plan.tagline.slice(0, 80),
            bio: plan.bio.slice(0, 2000),
            identity: plan.identity.slice(0, 2000),
            worldRules: plan.worldRules.slice(0, 2000),
            brandVoice: plan.brandVoice.slice(0, 400),
            personaVersion: { increment: 1 },
            published: true,
          },
        });
      } else {
        await prisma.character.update({
          where: { id: c.id },
          data: { published: true },
        });
      }

      let page = 1;
      for (const panel of plan.panels) {
        const imageUrl = await renderPanel({
          characterId: c.id,
          lora,
          triggerWord: c.triggerWord,
          layout,
          prompt: panel.prompt,
        });
        const prefix = plan.panels.length > 1 ? `【${plan.episodeTitle} ${page}/${plan.panels.length}】\n` : `【${plan.episodeTitle}】\n`;
        await prisma.post.create({
          data: {
            characterId: c.id,
            content: `${prefix}${panel.caption}`,
            imageUrl,
            isAiAssisted: true,
          },
        });
        console.log(`  page ${page} ${imageUrl}`);
        page++;
      }
      ok++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${c.slug}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(JSON.stringify({ ok, skipped, failed, total: targets.length }));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
