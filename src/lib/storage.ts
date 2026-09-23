/**
 * 对象存储底层。
 *
 * - 配了 S3 兼容存储（R2）：读写 bucket
 * - Demo 且未配：公开文件写 public/uploads（开发方便），私有文件写 .storage-private（不经 Web 直接暴露）
 * - 生产未配：直接失败，禁止把素材落到应用磁盘
 *
 * 这里只负责搬字节。业务语义（可见性、元数据、权限）在 @/lib/media。
 */

import { createHash, createHmac, randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink, rm } from "fs/promises";
import path from "path";
import { FailClosedError, isDemoMode } from "@/lib/runtime";

export type UploadKind = "posts" | "lora" | "generated" | "gifts";

export type StoredObject = {
  url: string;
  key: string;
};

const ID_RE = /^[a-z0-9_-]{8,64}$/i;
/** 本地私有目录：不在 public 下，Web 无法直接访问 */
const LOCAL_PRIVATE_DIR = ".storage-private";

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_ENDPOINT,
  );
}

export function extFromContentType(contentType: string, fallback = "bin") {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "audio/wav" || contentType === "audio/x-wav") return "wav";
  if (contentType === "audio/mpeg") return "mp3";
  if (contentType === "audio/mp4" || contentType === "audio/aac") return "m4a";
  return fallback;
}

/**
 * 公开文件的对外地址。
 * - 配了 S3_PUBLIC_BASE_URL（以后接 CDN）：CDN 直链
 * - 否则：/media/<key>，由网站从不公开的桶里读出来返回（见 src/app/media/[...key]/route.ts）
 * - 本地未配存储：public/uploads 下的静态文件
 */
export function publicUrlForKey(key: string): string {
  if (!isObjectStorageConfigured()) {
    // 去掉 public/ 前缀，避免 /uploads/public/...
    return `/uploads/${key.replace(/^public\//, "")}`;
  }
  const publicBase = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (publicBase) return `${publicBase}/${key}`;
  return `/media/${key}`;
}

function localPathForKey(key: string): string {
  if (key.startsWith("private/")) {
    return path.join(process.cwd(), LOCAL_PRIVATE_DIR, key);
  }
  return path.join(process.cwd(), "public", "uploads", key.replace(/^public\//, ""));
}

// ───────────────────────── SigV4 ─────────────────────────

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

/**
 * private/ 前缀的对象放进独立的私有 bucket（若配置了 S3_PRIVATE_BUCKET）。
 * R2 的公开访问是整个 bucket 级别的：公开 bucket 里的私有文件只要 key 泄露就能被直接下载。
 */
function bucketForKey(key: string): string {
  const privateBucket = process.env.S3_PRIVATE_BUCKET?.trim();
  return privateBucket && key.startsWith("private/") ? privateBucket : process.env.S3_BUCKET!;
}

function s3Config(key = "") {
  return {
    endpoint: process.env.S3_ENDPOINT!.replace(/\/$/, ""),
    bucket: bucketForKey(key),
    region: process.env.S3_REGION || "auto",
    accessKey: process.env.S3_ACCESS_KEY_ID!,
    secret: process.env.S3_SECRET_ACCESS_KEY!,
  };
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, dateStamp), region), "s3"), "aws4_request");
}

/** key 里每一段都要转义，但保留分隔用的斜杠 */
function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** bucket 为空时视为 endpoint 已含 bucket（virtual-hosted 写法） */
function objectUrl(endpoint: string, bucket: string, key: string): URL {
  return new URL(bucket ? `${endpoint}/${bucket}/${encodeKey(key)}` : `${endpoint}/${encodeKey(key)}`);
}

/** 带 SigV4 Header 签名的底层请求（导出供校验签名与特殊操作使用） */
export async function s3Request(params: {
  method: "PUT" | "GET" | "DELETE";
  key: string;
  body?: Buffer;
  contentType?: string;
  query?: Record<string, string>;
  bucketKey?: string;
}): Promise<Response> {
  // 列举请求 key 为空，用 bucketKey 指明作用在哪个 bucket
  const { endpoint, bucket, region, accessKey, secret } = s3Config(params.bucketKey ?? params.key);
  const url = objectUrl(endpoint, bucket, params.key);
  for (const [k, v] of Object.entries(params.query ?? {})) url.searchParams.set(k, v);

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256")
    .update(params.body ?? Buffer.alloc(0))
    .digest("hex");

  const headerPairs: [string, string][] = [];
  if (params.contentType) headerPairs.push(["content-type", params.contentType]);
  headerPairs.push(["host", url.host], ["x-amz-content-sha256", payloadHash], ["x-amz-date", amzDate]);
  headerPairs.sort(([a], [b]) => (a < b ? -1 : 1));

  const signedHeaders = headerPairs.map(([k]) => k).join(";");
  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    params.method,
    url.pathname,
    canonicalQuery,
    `${headerPairs.map(([k, v]) => `${k}:${v}`).join("\n")}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(secret, dateStamp, region))
    .update(stringToSign)
    .digest("hex");

  const headers: Record<string, string> = {
    Host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (params.contentType) headers["Content-Type"] = params.contentType;

  return fetch(url, {
    method: params.method,
    headers,
    body: params.body ? new Uint8Array(params.body) : undefined,
  });
}

/**
 * 私有文件的限时访问地址（SigV4 query 签名）。
 * 不要把它存进数据库或长期缓存 —— 过期后就失效了。
 */
export function presignGetUrl(key: string, expiresInSec = 600): string {
  const { endpoint, bucket, region, accessKey, secret } = s3Config(key);
  const url = objectUrl(endpoint, bucket, key);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  url.searchParams.set("X-Amz-Credential", `${accessKey}/${credentialScope}`);
  url.searchParams.set("X-Amz-Date", amzDate);
  url.searchParams.set("X-Amz-Expires", String(Math.min(Math.max(expiresInSec, 1), 604800)));
  url.searchParams.set("X-Amz-SignedHeaders", "host");

  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(secret, dateStamp, region))
    .update(stringToSign)
    .digest("hex");

  url.searchParams.set("X-Amz-Signature", signature);
  return url.toString();
}

// ───────────────────────── 读写删 ─────────────────────────

/** 按 key 写入。key 由调用方决定（见 @/lib/media 的路径规则）。 */
export async function putObject(input: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  if (isObjectStorageConfigured()) {
    const res = await s3Request({
      method: "PUT",
      key: input.key,
      body: input.body,
      contentType: input.contentType,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`S3 PUT failed: ${res.status} ${detail.slice(0, 200)}`);
    }
    return;
  }

  if (!isDemoMode()) {
    throw new FailClosedError("对象存储未配置", "STORAGE_UNAVAILABLE");
  }

  const filePath = localPathForKey(input.key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.body);
}

/** 读回字节。私有文件走鉴权接口时用。 */
export async function getObject(key: string): Promise<Buffer | null> {
  if (isObjectStorageConfigured()) {
    const res = await s3Request({ method: "GET", key });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 GET failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  try {
    return await readFile(localPathForKey(key));
  } catch {
    return null;
  }
}

/** 删除单个对象。对象不存在时视为成功。 */
export async function deleteObject(key: string): Promise<void> {
  if (isObjectStorageConfigured()) {
    const res = await s3Request({ method: "DELETE", key });
    if (!res.ok && res.status !== 404) {
      throw new Error(`S3 DELETE failed: ${res.status}`);
    }
    return;
  }
  try {
    await unlink(localPathForKey(key));
  } catch {
    /* 已经不在了 */
  }
}

/** 删除整个前缀（用户注销时按 private/users/<id>/ 整批清理）。 */
export async function deleteByPrefix(prefix: string): Promise<number> {
  if (!isObjectStorageConfigured()) {
    const dir = localPathForKey(prefix);
    await rm(dir, { recursive: true, force: true });
    return 0;
  }

  let removed = 0;
  let token: string | undefined;

  do {
    const query: Record<string, string> = { "list-type": "2", prefix };
    if (token) query["continuation-token"] = token;
    // 列举作用在 bucket 上，key 传空
    const res = await s3Request({ method: "GET", key: "", query, bucketKey: prefix });
    if (!res.ok) throw new Error(`S3 LIST failed: ${res.status}`);
    const xml = await res.text();

    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) =>
      m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
    );
    for (const key of keys) {
      await deleteObject(key);
      removed += 1;
    }

    token = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1];
  } while (token);

  return removed;
}

// ───────────────────────── 兼容旧调用 ─────────────────────────

/**
 * 旧的上传入口（Studio 上传、礼物图标等），写公开区。
 * 新代码请用 @/lib/media 的 storeMediaAsset，以便留下元数据记录。
 */
export async function putUpload(input: {
  kind: UploadKind;
  characterId: string;
  body: Buffer;
  contentType: string;
  filename?: string;
  ext?: string;
}): Promise<StoredObject> {
  if (!ID_RE.test(input.characterId)) {
    throw new Error("invalid characterId");
  }

  const ext = input.ext ?? extFromContentType(input.contentType);
  const filename = input.filename ?? `${randomUUID()}.${ext}`;
  const key = `${input.kind}/${input.characterId}/${filename}`;

  await putObject({ key, body: input.body, contentType: input.contentType });
  return { url: publicUrlForKey(key), key };
}
