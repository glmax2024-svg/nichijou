/**
 * 从 Anima 生图目录批量导入角色（全部为未发布草稿）。
 *
 *   npm run characters:import -- --owner-email=official@demo.jp --dry-run     # 只看计划
 *   npm run characters:import -- --owner-email=official@demo.jp --only=cirno # 只导一个
 *   npm run characters:import -- --owner-email=official@demo.jp               # 全部
 *
 * 每个角色基名（emilia_re_zero）导入一次，绑定编号最大的固定版本；
 * 已被其他角色绑定的基名（如婉婷的 laiwanting）跳过。可以重复运行，只补新增的。
 *
 * 人设由 LLM 根据名字、作品和外观标签生成草稿，需要人工审改后才能发布。
 */

import { createHash } from "crypto";
import { z } from "zod";
import { PrismaClient, type Prisma } from "@prisma/client";
import { gatewayChat } from "@/lib/ai/gateway";
import { generateAnimaImages, getAnimaManifest, listAnimaLoras, type AnimaManifestEntry } from "@/lib/ai/providers/anima";
import { deleteMediaAsset, resolveMediaUrl, storeMediaAsset } from "@/lib/media";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const flag = (name: string) => process.argv.includes(`--${name}`);

const STANDARD_BOUNDARIES = [
  "実在の人物だと名乗らない。",
  "ユーザーを18歳未満として扱う性的な会話をしない。",
  "設定を破ってOOCで語らない。",
];
const MINOR_BOUNDARY = "未成年のキャラクターとして、恋愛関係・性的な関係を演じない。";
const NEGATIVE = "blurry, low quality, distorted face, watermark, text, signature";

const personaSchema = z.object({
  name: z.string().min(1).max(40),
  tagline: z.string().min(1).max(60),
  bio: z.string().min(20).max(400),
  personality: z.string().min(10).max(300),
  speechStyle: z.string().min(10).max(300),
  identity: z.string().min(10).max(300),
  worldRules: z.string().min(10).max(300),
  brandVoice: z.string().min(5).max(200),
  tags: z.string().min(1).max(60),
  coverScene: z.string().min(5).max(300),
  isMinor: z.boolean(),
});
type Persona = z.infer<typeof personaSchema>;

function promptFor(entry: AnimaManifestEntry, prefix: string) {
  const origin =
    entry.origin === "existing"
      ? `既存作品「${entry.source_work}」のキャラクター「${entry.name}」です。原作の性格・口調・人間関係を尊重してください。原作の台詞をそのまま引用しないこと。`
      : `オリジナルキャラクター「${entry.name}」です。${entry.notes ?? ""}`;
  return [
    {
      role: "system" as const,
      content: [
        "あなたは日本向け AI キャラクターコンパニオンアプリの企画担当です。",
        "ユーザーはファンとしてキャラクターと日常会話をします。全年齢向け（露骨な性的表現・暴力の詳細は書かない）。",
        "次のキャラクターのペルソナ草稿を作り、JSON だけを出力してください。説明文やコードブロックは不要です。",
        "",
        "フィールド（文章はすべて日本語。tags だけ中国語）：",
        '- name: 日本語の表示名（公式の日本語表記があればそれ）',
        "- tagline: 一行紹介（30字以内、「身分 · 状況」の形）",
        "- bio: プロフィール（100〜200字、日常の様子が浮かぶように）",
        "- personality: 性格（50〜120字）",
        "- speechStyle: 話し方・口癖・一人称（50〜120字）",
        "- identity: ユーザーとの関係（ユーザーはファン・友人の立場。原作の恋人などをユーザーに置き換えない）",
        "- worldRules: 舞台と世界のルール（原作の世界観を日常寄りに。大事件は起きない前提）",
        "- brandVoice: 語り口のトーン（一文）",
        "- tags: 中国語のタグを 3〜5 個、カンマ区切り（例：校园,治愈,奇幻）",
        "- coverScene: 背景画像用の英語タグ（人物なし。キャラクターの世界を表す場所。例：school rooftop, sunset, cherry blossoms）",
        "- isMinor: 原作で18歳未満なら true",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `${origin}\n性別: ${entry.gender}\n外見タグ: ${prefix}`,
    },
  ];
}

async function draftPersona(entry: AnimaManifestEntry, prefix: string): Promise<Persona> {
  const model = process.env.AI_MODEL_BALANCED || process.env.AI_MODEL_FAST;
  if (!model) throw new Error("AI_MODEL_BALANCED / AI_MODEL_FAST 未配置");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await gatewayChat({ model, messages: promptFor(entry, prefix), maxTokens: 2400, temperature: 0.7, timeoutMs: 120_000 });
      const json = res.text.slice(res.text.indexOf("{"), res.text.lastIndexOf("}") + 1);
      return personaSchema.parse(JSON.parse(json));
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("persona 生成失败");
}

/** 同一角色每次导入用同一个 seed，重跑生成的形象一致 */
const seedFor = (s: string) => createHash("md5").update(s).digest().readUInt32BE(0);

async function render(params: {
  loraId: string;
  characterId: string;
  prompt: string;
  withCharacter: boolean;
  width: number;
  height: number;
}) {
  const seed = seedFor(`${params.loraId}:${params.withCharacter ? "avatar" : "cover"}`);
  const [image] = await generateAnimaImages({
    lora: params.loraId,
    prompt: params.prompt,
    negativePrompt: params.withCharacter ? NEGATIVE : `${NEGATIVE}, 1girl, 1boy, person, people, character`,
    strength: params.withCharacter ? 0.9 : 0,
    steps: 28,
    batch: 1,
    width: params.width,
    height: params.height,
    seed,
  });
  const asset = await storeMediaAsset({
    kind: "IMAGE",
    visibility: "PUBLIC",
    body: image.body,
    contentType: image.contentType,
    source: "anima",
    characterId: params.characterId,
    sourceMeta: { lora: params.loraId, prompt: params.prompt, seed: image.seed ?? seed, import: true },
  });
  return resolveMediaUrl(asset);
}

async function uniqueSlug(base: string) {
  const root = base.replace(/_/g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "character";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    if (!(await prisma.character.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

async function main() {
  const ownerEmail = arg("owner-email");
  if (!ownerEmail) throw new Error("缺少 --owner-email=");
  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) throw new Error(`找不到账号 ${ownerEmail}（先用 npm run users:create 创建）`);

  const [loras, manifest] = await Promise.all([listAnimaLoras(), getAnimaManifest()]);
  const byId = new Map(manifest.map((m) => [m.lora_id, m]));

  // 按角色基名分组，取编号最大的固定版本
  const latest = new Map<string, { id: string; revision: number; prefix: string }>();
  for (const l of loras) {
    const [base, v] = l.id.split("__v");
    if (!v) continue;
    const revision = Number(v);
    const cur = latest.get(base);
    if (!cur || revision > cur.revision) latest.set(base, { id: l.id, revision, prefix: l.recommendedPromptPrefix ?? "" });
  }

  const bound = await prisma.character.findMany({
    where: { OR: [{ loraAdapterId: { startsWith: "anima:" } }, { catalogLoraBase: { not: null } }] },
    select: { slug: true, loraAdapterId: true, catalogLoraBase: true },
  });
  const takenBase = (base: string) =>
    bound.find((c) => c.catalogLoraBase === base || c.loraAdapterId?.startsWith(`anima:${base}__v`) || c.loraAdapterId === `anima:${base}`);

  const only = arg("only");
  const limit = Number(arg("limit") ?? Infinity);
  const plan = [...latest.entries()]
    .filter(([base]) => !only || base === only)
    .map(([base, lora]) => ({ base, lora, entry: byId.get(lora.id), existing: takenBase(base) }));

  const todo = plan.filter((p) => !p.existing && p.entry).slice(0, limit);
  console.log(`目录 ${latest.size} 个角色 · 已存在 ${plan.filter((p) => p.existing).length} · 待导入 ${todo.length}`);
  for (const p of plan.filter((x) => x.existing)) console.log(`  跳过 ${p.base}（已绑定到 ${p.existing!.slug}）`);
  for (const p of plan.filter((x) => !x.entry)) console.log(`  跳过 ${p.base}（清单里没有 ${p.lora.id}）`);
  if (flag("dry-run")) {
    for (const p of todo) console.log(`  导入 ${p.lora.id.padEnd(28)} ${p.entry!.name} · ${p.entry!.origin ?? "未确认"} · ${p.entry!.source_work ?? "-"}`);
    return;
  }

  let ok = 0;
  const failed: string[] = [];
  for (const [i, p] of todo.entries()) {
    const tag = `[${i + 1}/${todo.length}] ${p.lora.id}`;
    let createdId: string | null = null;
    try {
      const entry = p.entry!;
      const persona = await draftPersona(entry, p.lora.prefix);
      const boundaries = [...STANDARD_BOUNDARIES, ...(persona.isMinor ? [MINOR_BOUNDARY] : [])].join("\n");

      // 先以草稿写入，图片生成失败也不会出现公开的半成品
      const character = await prisma.character.create({
        data: {
          slug: await uniqueSlug(p.base),
          name: persona.name,
          tagline: persona.tagline,
          bio: persona.bio,
          personality: persona.personality,
          speechStyle: persona.speechStyle,
          identity: persona.identity,
          worldRules: persona.worldRules,
          brandVoice: persona.brandVoice,
          boundaries,
          tags: persona.tags,
          contentRating: "ALL",
          skillIds: "daily-chat",
          avatarUrl: "",
          published: false,
          triggerWord: p.lora.prefix,
          loraAdapterId: `anima:${p.lora.id}`,
          loraStatus: "READY",
          loraVersion: p.lora.revision,
          catalogLoraBase: p.base,
          gender: entry.gender === "male" || entry.gender === "female" ? entry.gender : "other",
          ipOrigin: entry.origin,
          ipSourceWork: entry.source_work,
          creatorId: owner.id,
        },
      });
      createdId = character.id;

      const avatarUrl = await render({
        loraId: p.lora.id,
        characterId: character.id,
        prompt: `${p.lora.prefix}, upper body, looking at viewer, gentle smile, soft lighting, simple background, detailed anime illustration`,
        withCharacter: true,
        width: 1024,
        height: 1024,
      });
      const coverUrl = await render({
        loraId: p.lora.id,
        characterId: character.id,
        prompt: `no humans, scenery, ${persona.coverScene}, cinematic lighting, detailed anime background`,
        withCharacter: false,
        width: 1344,
        height: 768,
      });
      await prisma.character.update({ where: { id: character.id }, data: { avatarUrl, coverUrl } });
      await prisma.personaRevision.create({
        data: {
          characterId: character.id,
          version: 1,
          payload: { ...persona, source: "catalog-import", loraId: p.lora.id } as unknown as Prisma.InputJsonValue,
        },
      });
      ok++;
      console.log(`${tag} ✓ ${persona.name}${persona.isMinor ? "（未成年）" : ""} → ${character.slug}`);
    } catch (err) {
      // 半成品删掉：否则下次运行会把它当成「已导入」跳过
      if (createdId) {
        for (const a of await prisma.mediaAsset.findMany({ where: { characterId: createdId }, select: { id: true } })) {
          await deleteMediaAsset(a.id).catch(() => {});
        }
        await prisma.character.delete({ where: { id: createdId } }).catch(() => {});
      }
      failed.push(p.lora.id);
      console.error(`${tag} ✗ ${err instanceof Error ? err.message.slice(0, 200) : err}`);
    }
  }
  if (ok > 0) console.log("提示：运行 npm run characters:greetings 为新角色生成开场白");
  console.log(`\n完成：成功 ${ok}，失败 ${failed.length}${failed.length ? `（${failed.join(", ")}）—— 重新运行会自动补上` : ""}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
