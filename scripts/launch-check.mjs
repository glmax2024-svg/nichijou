#!/usr/bin/env node
/**
 * 上线前环境检查：只报告是否配置，不打印密钥。
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotenv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function status(ok) {
  return ok ? "ok" : "missing";
}

loadDotenv();

const storage =
  present("S3_ENDPOINT") &&
  present("S3_BUCKET") &&
  present("S3_ACCESS_KEY_ID") &&
  present("S3_SECRET_ACCESS_KEY");

const stripe = present("STRIPE_SECRET_KEY") && present("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
const webhook = present("STRIPE_WEBHOOK_SECRET");
const db = present("DATABASE_URL");
const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL).hostname;
  } catch {
    return "";
  }
})();
const hostedDb = db && dbHost && dbHost !== "localhost" && dbHost !== "127.0.0.1";
const demoExplicit = process.env.NICHJOU_DEMO_MODE?.trim() ?? "";
const authUrl = process.env.AUTH_URL?.trim() ?? "";
const localAuth = /localhost|127\.0\.0\.1/.test(authUrl);
const legal = present("LEGAL_OPERATOR_NAME") && present("LEGAL_OPERATOR_ADDRESS");
const weakSecret = /change-me|nichijou|demo|secret/i.test(process.env.AUTH_SECRET ?? "");

const rows = [
  ["对象存储 R2/S3", status(storage), storage ? "putUpload 会走 bucket" : "Demo 写本地 public/uploads"],
  ["Stripe 测试钥", status(stripe), stripe ? "Checkout 可建会话" : "Demo 会假装开通"],
  ["Stripe Webhook", status(webhook), webhook ? "/api/webhooks/stripe" : "支付完成无法入账"],
  ["数据库", status(db), hostedDb ? `托管 ${dbHost}` : db ? `本机 ${dbHost || "unknown"}` : "未配置"],
  ["AUTH_URL", authUrl ? "ok" : "missing", localAuth ? "仍是 localhost，部署后要改域名" : authUrl || "未配置"],
  [
    "AUTH_SECRET",
    present("AUTH_SECRET") ? (weakSecret ? "weak" : "ok") : "missing",
    weakSecret ? "生产请换成 openssl rand -base64 32" : "已设置",
  ],
  [
    "NICHJOU_DEMO_MODE",
    demoExplicit === "false" ? "ok" : demoExplicit === "true" ? "demo" : "unset",
    demoExplicit === "false" ? "生产 fail-closed" : "本地默认 Demo；上线必须 false",
  ],
  ["法律实名", status(legal), legal ? "特定商取引法可公示" : "页面仍显示準備中"],
];

let failed = 0;
console.log("Nichijou launch check\n");
for (const [name, st, note] of rows) {
  if (st === "missing" || st === "weak") failed += 1;
  console.log(`${st.padEnd(8)} ${name.padEnd(22)} ${note}`);
}

console.log("\n下一步：");
if (!storage) {
  console.log("1. Cloudflare R2 建 bucket + API token，填 S3_* 后运行 npm run storage:smoke");
} else {
  console.log("1. 对象存储已配，运行 npm run storage:smoke 验证 PUT");
}
if (!stripe) {
  console.log("2. Stripe Dashboard 测试钥填 STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
} else if (!webhook) {
  console.log("2. 配 STRIPE_WEBHOOK_SECRET（本地可用 stripe listen）");
} else {
  console.log("2. Stripe 已配");
}
if (!hostedDb) {
  console.log("3. 上线前把 DATABASE_URL 换成托管 Postgres（Neon / RDS）");
} else {
  console.log("3. 数据库已是远程实例");
}
console.log("4. 部署后 AUTH_URL 改正式域名，NICHJOU_DEMO_MODE=false");

process.exit(0);
