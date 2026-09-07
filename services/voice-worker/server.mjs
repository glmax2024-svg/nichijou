/**
 * Nichijou Voice Worker — 独立声纹进程。
 *
 * 合同（与 src/lib/ai/tts-voice-clone.ts 对齐）：
 *   POST /v1/voice/enroll
 *   POST /v1/voice/synthesize
 *
 * 鉴权：Authorization: Bearer <TTS_CLONE_API_KEY>
 * 资产隔离：X-Nichijou-Character-Id 必须与 embedding 所属角色一致。
 *
 * 未接真实克隆后端时：登记进程内 embedding，合成返回短静音 WAV。
 * 接后端后把 TTS_CLONE_BACKEND_URL 指过去即可，合同不变。
 */

import { createServer } from "node:http";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.VOICE_WORKER_PORT || 3210);
const API_KEY = process.env.TTS_CLONE_API_KEY || process.env.VOICE_WORKER_API_KEY || "";
const BACKEND = (process.env.TTS_CLONE_BACKEND_URL || "").replace(/\/$/, "");

/** @type {Map<string, { embeddingId: string, characterId: string, sampleAudioUrl: string, durationSec: number, createdAt: number }>} */
const profiles = new Map();

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function audio(res, buffer, mime = "audio/wav") {
  res.writeHead(200, {
    "Content-Type": mime,
    "Content-Length": buffer.length,
  });
  res.end(buffer);
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
    json(res, 503, { error: "TTS_CLONE_API_KEY missing" });
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

function silentWav(durationSec = 0.4, sampleRate = 16000) {
  const samples = Math.max(1, Math.floor(durationSec * sampleRate));
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

function makeEmbeddingId(characterId, sampleAudioUrl, durationSec) {
  const digest = createHash("sha256")
    .update(`${characterId}:${sampleAudioUrl}:${durationSec}:${randomBytes(8).toString("hex")}`)
    .digest("hex")
    .slice(0, 16);
  return `voice_emb_${digest}`;
}

async function proxyBackend(path, req, body, binary = false) {
  if (!BACKEND) return null;
  const res = await fetch(`${BACKEND}${path}`, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.authorization ?? "",
      "X-Nichijou-Character-Id": characterIdOf(req),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (binary) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, buf, mime: res.headers.get("content-type") || "audio/wav" };
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") {
    json(res, 200, {
      ok: true,
      service: "voice-worker",
      profiles: profiles.size,
      backend: Boolean(BACKEND),
    });
    return;
  }

  const auth = authorize(req, res);
  if (!auth) return;

  if (req.method === "POST" && path === "/v1/voice/enroll") {
    const body = await readBody(req);
    const characterId = String(body.character_id ?? auth.characterId);
    if (characterId !== auth.characterId) return forbidden(res);
    const sampleAudioUrl = String(body.audio_url ?? "");
    const durationSec = Number(body.duration_sec ?? 0);
    if (!sampleAudioUrl) {
      json(res, 400, { error: "audio_url required" });
      return;
    }
    const proxied = await proxyBackend("/v1/voice/enroll", req, body);
    if (proxied) {
      json(res, proxied.status, proxied.data);
      return;
    }
    const embeddingId = makeEmbeddingId(characterId, sampleAudioUrl, durationSec);
    profiles.set(embeddingId, {
      embeddingId,
      characterId,
      sampleAudioUrl,
      durationSec,
      createdAt: Date.now(),
    });
    json(res, 200, { embedding_id: embeddingId, status: "READY" });
    return;
  }

  if (req.method === "POST" && path === "/v1/voice/synthesize") {
    const body = await readBody(req);
    const embeddingId = String(body.embedding_id ?? "");
    const profile = profiles.get(embeddingId);
    if (!profile || profile.characterId !== auth.characterId) {
      return forbidden(res, "embedding isolated");
    }
    const proxied = await proxyBackend("/v1/voice/synthesize", req, body, true);
    if (proxied) {
      if (proxied.status >= 400) {
        json(res, proxied.status, { error: "backend synthesize failed" });
        return;
      }
      audio(res, proxied.buf, proxied.mime);
      return;
    }
    audio(res, silentWav(0.4));
    return;
  }

  json(res, 404, { error: "not found" });
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error("[voice-worker]", err);
    if (!res.headersSent) json(res, 500, { error: "worker error" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[voice-worker] listening on :${PORT}`);
  if (!API_KEY) console.warn("[voice-worker] TTS_CLONE_API_KEY is empty — all requests will 503");
});
