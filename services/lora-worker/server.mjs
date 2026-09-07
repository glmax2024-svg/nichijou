/**
 * Nichijou LoRA Worker — 独立算力进程。
 *
 * 合同（与 src/lib/ai/lora.ts / llm.ts 对齐）：
 *   POST /v1/lora/train
 *   GET  /v1/lora/jobs/:jobId
 *   POST /v1/images/generations
 *   POST /v1/chat/completions
 *
 * 鉴权：Authorization: Bearer <LORA_WORKER_API_KEY>
 * 资产隔离：X-Nichijou-Character-Id 必须与 adapter / job 所属角色一致。
 *
 * 未接真实 GPU 时在进程内推进训练进度，并返回占位图 / 占位回复。
 * 接 GPU 后把 LORA_GPU_BACKEND_URL 指过去即可，合同不变。
 */

import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.LORA_WORKER_PORT || 3200);
const API_KEY = process.env.LORA_WORKER_API_KEY || "";
const GPU_BACKEND = (process.env.LORA_GPU_BACKEND_URL || "").replace(/\/$/, "");

/** @type {Map<string, { id: string, characterId: string, adapterId: string, status: string, progress: number, trigger: string, createdAt: number }>} */
const jobs = new Map();
/** @type {Map<string, string>} adapterId -> characterId */
const adapters = new Map();

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

function forbidden(res, message = "character mismatch") {
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

function characterIdOf(req) {
  const raw = req.headers["x-nichijou-character-id"];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
}

function authorize(req, res) {
  if (!API_KEY) {
    json(res, 503, { error: "LORA_WORKER_API_KEY missing" });
    return null;
  }
  if (!safeEqual(readBearer(req), API_KEY)) {
    unauthorized(res);
    return null;
  }
  const characterId = characterIdOf(req);
  if (!characterId) {
    json(res, 400, { error: "X-Nichijou-Character-Id required" });
    return null;
  }
  return { characterId };
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

function bumpJob(job) {
  if (job.status === "ready" || job.status === "failed") return job;
  const elapsed = Date.now() - job.createdAt;
  const progress = Math.min(100, 8 + Math.floor(elapsed / 400));
  job.progress = progress;
  job.status = progress >= 100 ? "ready" : "training";
  if (job.status === "ready") adapters.set(job.adapterId, job.characterId);
  return job;
}

function placeholderSvg(prompt, adapterId) {
  const title = (prompt || "nichijou").slice(0, 42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd9df"/><stop offset="1" stop-color="#c9d6f5"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="48" y="120" font-size="36" font-family="sans-serif" fill="#3a3330">LoRA Worker</text>
    <text x="48" y="180" font-size="20" font-family="sans-serif" fill="#8a7a72">${escapeXml(title)}</text>
    <text x="48" y="980" font-size="16" font-family="sans-serif" fill="#b0a099">${escapeXml(adapterId)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function proxyGpu(path, req, body) {
  if (!GPU_BACKEND) return null;
  const res = await fetch(`${GPU_BACKEND}${path}`, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.authorization ?? "",
      "X-Nichijou-Character-Id": characterIdOf(req),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    json(res, 200, {
      ok: true,
      service: "lora-worker",
      jobs: jobs.size,
      adapters: adapters.size,
      gpu: Boolean(GPU_BACKEND),
    });
    return;
  }

  const auth = authorize(req, res);
  if (!auth) return;

  if (req.method === "POST" && path === "/v1/lora/train") {
    const body = await readBody(req);
    const characterId = String(body.character_id ?? "");
    if (characterId !== auth.characterId) return forbidden(res);
    const jobId = String(body.job_id ?? `job_${Date.now().toString(36)}`);
    const adapterId = `lora_${characterId.slice(0, 8)}_${Date.now().toString(36)}`;
    const proxied = await proxyGpu("/v1/lora/train", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const job = {
      id: jobId,
      characterId,
      adapterId,
      status: "training",
      progress: 8,
      trigger: String(body.trigger ?? ""),
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);
    adapters.set(adapterId, characterId);
    json(res, 200, { adapter_id: adapterId, status: "queued", job_id: jobId });
    return;
  }

  const jobMatch = /^\/v1\/lora\/jobs\/([^/]+)$/.exec(path);
  if (req.method === "GET" && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    if (!job || job.characterId !== auth.characterId) {
      json(res, 404, { error: "job not found" });
      return;
    }
    bumpJob(job);
    json(res, 200, {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      adapter_id: job.adapterId,
    });
    return;
  }

  if (req.method === "POST" && path === "/v1/images/generations") {
    const body = await readBody(req);
    const adapterId = String(body.adapter_id ?? "");
    const owner = adapters.get(adapterId);
    if (!owner || owner !== auth.characterId) return forbidden(res, "adapter isolated");
    const proxied = await proxyGpu("/v1/images/generations", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const n = Math.min(4, Math.max(1, Number(body.n) || 1));
    const images = Array.from({ length: n }, () =>
      placeholderSvg(body.prompt, adapterId),
    );
    json(res, 200, { images });
    return;
  }

  if (req.method === "POST" && path === "/v1/chat/completions") {
    const body = await readBody(req);
    const adapterId = String(body.adapter_id ?? "");
    const owner = adapters.get(adapterId);
    if (adapterId && (!owner || owner !== auth.characterId)) {
      return forbidden(res, "adapter isolated");
    }
    const proxied = await proxyGpu("/v1/chat/completions", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === "user");
    const text = lastUser?.content
      ? `（LoRA ${adapterId || "default"}）うん、聞いてるよ。${String(lastUser.content).slice(0, 40)}`
      : "うん、ここにいるよ。";
    json(res, 200, { choices: [{ message: { content: text } }] });
    return;
  }

  json(res, 404, { error: "not found" });
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[lora-worker]", err);
    if (!res.headersSent) json(res, 500, { error: "worker error" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[lora-worker] listening on :${PORT}`);
  if (!API_KEY) console.warn("[lora-worker] LORA_WORKER_API_KEY is empty — all requests will 503");
});
