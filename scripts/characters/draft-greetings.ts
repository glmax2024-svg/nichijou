/**
 * 为还没有开场白的角色，按人设与口吻生成第一句话（草稿，画师可在 Studio 修改）。
 *
 *   npm run characters:greetings                 # 只补空的
 *   npm run characters:greetings -- --only=cirno
 *   npm run characters:greetings -- --force      # 全部重写
 */

import { PrismaClient } from "@prisma/client";
import { gatewayChat } from "@/lib/ai/gateway";

const prisma = new PrismaClient();
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function draft(c: {
  name: string;
  personality: string;
  speechStyle: string;
  identity: string;
  worldRules: string;
  boundaries: string;
}) {
  const model = process.env.AI_MODEL_BALANCED || process.env.AI_MODEL_FAST;
  if (!model) throw new Error("AI_MODEL_BALANCED / AI_MODEL_FAST 未配置");
  const res = await gatewayChat({
    model,
    maxTokens: 600,
    temperature: 0.8,
    timeoutMs: 120_000,
    messages: [
      {
        role: "system",
        content: [
          "あなたはキャラクターの台詞を書く担当です。",
          "ユーザーが初めてこのキャラクターとのチャットを開いたとき、キャラクターが最初に送るメッセージを1つ書いてください。",
          "条件：日本語、キャラクターの口調そのもの、2〜3文、80字以内、状況が少し伝わる一言を入れる、ユーザーに話しかけて会話を始める。",
          "地の文・括弧・説明・引用符は書かない。台詞だけを出力。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `名前: ${c.name}`,
          `性格: ${c.personality}`,
          `話し方: ${c.speechStyle}`,
          `ユーザーとの関係: ${c.identity}`,
          `世界: ${c.worldRules}`,
          `守ること: ${c.boundaries}`,
        ].join("\n"),
      },
    ],
  });
  const text = res.text.trim().replace(/^「|」$/g, "");
  if (!text || text.length > 200) throw new Error(`生成结果不合适（${text.length} 字）`);
  return text;
}

async function main() {
  const only = arg("only");
  const force = process.argv.includes("--force");
  const characters = await prisma.character.findMany({
    where: { ...(only ? { slug: only } : {}), ...(force ? {} : { greeting: "" }) },
    orderBy: { slug: "asc" },
  });
  console.log(`待生成 ${characters.length} 个`);
  let ok = 0;
  const failed: string[] = [];
  for (const [i, c] of characters.entries()) {
    try {
      const greeting = await draft(c);
      await prisma.character.update({ where: { id: c.id }, data: { greeting } });
      ok++;
      console.log(`[${i + 1}/${characters.length}] ✓ ${c.name}: ${greeting.replace(/\n/g, " ")}`);
    } catch (err) {
      failed.push(c.slug);
      console.error(`[${i + 1}/${characters.length}] ✗ ${c.slug}: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
    }
  }
  console.log(`\n完成：成功 ${ok}，失败 ${failed.length}${failed.length ? `（${failed.join(", ")}）—— 重新运行会补上` : ""}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
