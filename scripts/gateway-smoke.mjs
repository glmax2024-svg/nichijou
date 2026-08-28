#!/usr/bin/env node
/**
 * 中转站连通性自检 —— 三协议各打一发，顺便列出可用模型。
 *
 *   node scripts/gateway-smoke.mjs
 *
 * 读取 .env 里的 AI_GATEWAY_BASE_URL / AI_GATEWAY_API_KEY / AI_MODEL_*。
 */

import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!(m[1] in process.env) || !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* .env 可选 */
  }
}
loadEnv();

const BASE = (process.env.AI_GATEWAY_BASE_URL ?? "").replace(/\/+$/, "");
const KEY = process.env.AI_GATEWAY_API_KEY ?? "";

if (!BASE || !KEY) {
  console.error("✗ 缺 AI_GATEWAY_BASE_URL / AI_GATEWAY_API_KEY");
  process.exit(1);
}

const TIERS = {
  nano: process.env.AI_MODEL_NANO || process.env.AI_MODEL_FAST,
  fast: process.env.AI_MODEL_FAST,
  balanced: process.env.AI_MODEL_BALANCED,
  flagship: process.env.AI_MODEL_FLAGSHIP,
};

function protocolFor(model) {
  const forced = process.env.AI_GATEWAY_PROTOCOL;
  if (forced) return forced;
  const m = model.toLowerCase();
  if (m.startsWith("gemini")) return "gemini";
  if (m.startsWith("claude")) return "anthropic";
  return "openai";
}

async function listModels() {
  const res = await fetch(`${BASE}/v1/models`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) return console.log(`  /v1/models → ${res.status}`);
  const json = await res.json();
  const ids = (json.data ?? json.models ?? []).map((m) => m.id ?? m.name).filter(Boolean);
  console.log(`  可用模型 ${ids.length} 个:`);
  for (const id of ids) console.log(`    ${id}`);
}

async function ping(tier, model) {
  const proto = protocolFor(model);
  const started = Date.now();

  let path, headers, body;
  if (proto === "anthropic") {
    path = "/v1/messages";
    headers = { "x-api-key": KEY, "anthropic-version": "2023-06-01" };
    body = { model, max_tokens: 32, messages: [{ role: "user", content: "ping" }] };
  } else if (proto === "gemini") {
    path = `/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "x-goog-api-key": KEY };
    body = { contents: [{ role: "user", parts: [{ text: "ping" }] }] };
  } else {
    path = "/v1/chat/completions";
    headers = { Authorization: `Bearer ${KEY}` };
    body = { model, max_tokens: 32, messages: [{ role: "user", content: "ping" }] };
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      console.log(`  ✗ ${tier.padEnd(9)} ${model} [${proto}] → ${res.status} ${(await res.text()).slice(0, 160)}`);
      return;
    }
    const json = await res.json();
    const text =
      json.choices?.[0]?.message?.content ??
      json.content?.map((c) => c.text).join("") ??
      json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ??
      "";
    const usage = json.usage ?? json.usageMetadata ?? {};
    console.log(
      `  ✓ ${tier.padEnd(9)} ${model} [${proto}] ${ms}ms  "${String(text).replace(/\s+/g, " ").slice(0, 40)}"  usage=${JSON.stringify(usage)}`,
    );
  } catch (err) {
    console.log(`  ✗ ${tier.padEnd(9)} ${model} [${proto}] → ${err.message}`);
  }
}

console.log(`\n中转站: ${BASE}\n`);
console.log("模型清单:");
await listModels();
console.log("\n分档连通性:");
for (const [tier, model] of Object.entries(TIERS)) {
  if (!model) {
    console.log(`  - ${tier.padEnd(9)} 未配置`);
    continue;
  }
  await ping(tier, model);
}

if (process.env.AI_MODEL_IMAGE) {
  console.log("\n生图:");
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/v1/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: process.env.AI_MODEL_IMAGE, prompt: "a small blue cube", n: 1 }),
    });
    console.log(
      res.ok
        ? `  ✓ ${process.env.AI_MODEL_IMAGE} ${Date.now() - started}ms`
        : `  ✗ ${process.env.AI_MODEL_IMAGE} → ${res.status} ${(await res.text()).slice(0, 160)}`,
    );
  } catch (err) {
    console.log(`  ✗ ${process.env.AI_MODEL_IMAGE} → ${err.message}`);
  }
}
console.log("");
