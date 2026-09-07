/**
 * Nichijou Memos Worker — 独立记忆进程。
 *
 * 合同（与 src/lib/ai/memos-plugin.ts 对齐）：
 *   POST /v1/memory/query
 *   POST /v1/memory/store
 *   POST /v1/memory/delete
 *
 * 鉴权：Authorization: Bearer <MEMOS_API_KEY>
 * 资产隔离：X-Nichijou-User-Id / X-Nichijou-Character-Id 必须与正文一致。
 *
 * 未接外部记忆服务时进程内保存；MEMOS_RETENTION_DAYS 到期自动丢弃。
 * 接后端后把 MEMOS_BACKEND_URL 指过去即可，合同不变。
 */

import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.MEMOS_WORKER_PORT || 3220);
const API_KEY = process.env.MEMOS_API_KEY || process.env.MEMOS_WORKER_API_KEY || "";
const BACKEND = (process.env.MEMOS_BACKEND_URL || "").replace(/\/$/, "");
const RETENTION_DAYS = Number(process.env.MEMOS_RETENTION_DAYS || 365);
const TOP_K_DEFAULT = 8;

/** @type {{ id: string, userId: string, characterId: string, content: string, category: string, score: number, createdAt: number }[]} */
const memories = [];

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function unauthorized(res) {
  json(res, 401, { error: "unauthorized" });
}

function forbidden(res, message = "scope mismatch") {
  json(res, 403, { error: message });
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function readBearer(req) {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? "";
}

function headerOf(req, name) {
  const raw = req.headers[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

function authorize(req, res, { characterRequired = true } = {}) {
  if (!API_KEY) {
    json(res, 503, { error: "MEMOS_API_KEY missing" });
    return null;
  }
  if (!safeEqual(readBearer(req), API_KEY)) {
    unauthorized(res);
    return null;
  }
  const userId = headerOf(req, "x-nichijou-user-id");
  const characterId = headerOf(req, "x-nichijou-character-id");
  if (!userId) {
    json(res, 400, { error: "X-Nichijou-User-Id required" });
    return null;
  }
  if (characterRequired && !characterId) {
    json(res, 400, { error: "X-Nichijou-Character-Id required" });
    return null;
  }
  return { userId, characterId };
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function pruneExpired() {
  if (!RETENTION_DAYS || RETENTION_DAYS <= 0) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (let i = memories.length - 1; i >= 0; i -= 1) {
    if (memories[i].createdAt < cutoff) memories.splice(i, 1);
  }
}

function scopeOk(auth, userId, characterId) {
  if (userId !== auth.userId) return false;
  if (characterId && auth.characterId && characterId !== auth.characterId) return false;
  return true;
}

async function proxyBackend(path, req, body) {
  if (!BACKEND) return null;
  const res = await fetch(`${BACKEND}${path}`, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.authorization ?? "",
      "X-Nichijou-User-Id": headerOf(req, "x-nichijou-user-id"),
      "X-Nichijou-Character-Id": headerOf(req, "x-nichijou-character-id"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function keywordsOf(query) {
  return String(query)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1)
    .slice(0, 5);
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    pruneExpired();
    json(res, 200, {
      ok: true,
      service: "memos-worker",
      memories: memories.length,
      retentionDays: RETENTION_DAYS,
      backend: Boolean(BACKEND),
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/memory/delete") {
    const auth = authorize(req, res, { characterRequired: false });
    if (!auth) return;
    const body = await readBody(req);
    const userId = String(body.user_id ?? auth.userId);
    const characterId = String(body.agent_id ?? auth.characterId ?? "");
    if (!scopeOk(auth, userId, characterId)) return forbidden(res);
    const proxied = await proxyBackend("/v1/memory/delete", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    let deleted = 0;
    for (let i = memories.length - 1; i >= 0; i -= 1) {
      const row = memories[i];
      if (row.userId !== userId) continue;
      if (characterId && row.characterId !== characterId) continue;
      memories.splice(i, 1);
      deleted += 1;
    }
    json(res, 200, { deleted });
    return;
  }

  const auth = authorize(req, res);
  if (!auth) return;
  pruneExpired();

  if (req.method === "POST" && path === "/v1/memory/query") {
    const body = await readBody(req);
    const userId = String(body.user_id ?? "");
    const characterId = String(body.agent_id ?? "");
    if (!scopeOk(auth, userId, characterId) || !characterId) return forbidden(res);
    const proxied = await proxyBackend("/v1/memory/query", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const topK = Math.min(32, Math.max(1, Number(body.top_k) || TOP_K_DEFAULT));
    const keywords = keywordsOf(body.query ?? "");
    const scoped = memories.filter((m) => m.userId === userId && m.characterId === characterId);
    const matched = keywords.length
      ? scoped.filter((m) => keywords.some((kw) => m.content.includes(kw)))
      : scoped;
    const ranked = (matched.length ? matched : scoped)
      .slice()
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(0, topK);
    json(res, 200, {
      memories: ranked.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        score: m.score,
      })),
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/memory/store") {
    const body = await readBody(req);
    const userId = String(body.user_id ?? "");
    const characterId = String(body.agent_id ?? "");
    if (!scopeOk(auth, userId, characterId) || !characterId) return forbidden(res);
    const proxied = await proxyBackend("/v1/memory/store", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userText = String(messages.find((m) => m.role === "user")?.content ?? "").slice(0, 200);
    const assistantText = String(messages.find((m) => m.role === "assistant")?.content ?? "").slice(0, 200);
    if (!userText && !assistantText) {
      json(res, 200, { stored: 0 });
      return;
    }
    memories.push({
      id: `mem_${randomBytes(8).toString("hex")}`,
      userId,
      characterId,
      content: `对话摘要 — 用户: "${userText}" → ${assistantText}`,
      category: "conversation",
      score: 0.4,
      createdAt: Date.now(),
    });
    json(res, 200, { stored: 1 });
    return;
  }

  json(res, 404, { error: "not found" });
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[memos-worker]", err);
    if (!res.headersSent) json(res, 500, { error: "worker error" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[memos-worker] listening on :${PORT}`);
  if (!API_KEY) console.warn("[memos-worker] MEMOS_API_KEY is empty — all requests will 503");
});
