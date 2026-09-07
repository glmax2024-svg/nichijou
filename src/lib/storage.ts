/**
 * 用户资产存储。
 *
 * - 配了 S3 兼容对象存储：写入 bucket，返回公开 URL
 * - Demo 且未配 S3：写本地 public/uploads（开发方便）
 * - 生产未配 S3：直接失败，禁止把画师素材落到应用磁盘
 */

import { createHash, createHmac, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { FailClosedError, isDemoMode } from "@/lib/runtime";

export type UploadKind = "posts" | "lora" | "generated" | "gifts";

export type StoredObject = {
  url: string;
  key: string;
};

const ID_RE = /^[a-z0-9_-]{8,64}$/i;

export function isObjectStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_ENDPOINT,
  );
}

function extFromContentType(contentType: string, fallback: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "video/mp4") return "mp4";
  return fallback;
}

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

  const ext = input.ext ?? extFromContentType(input.contentType, "bin");
  const filename = input.filename ?? `${randomUUID()}.${ext}`;
  const key = `${input.kind}/${input.characterId}/${filename}`;

  if (isObjectStorageConfigured()) {
    return putS3Object(key, input.body, input.contentType);
  }

  if (!isDemoMode()) {
    throw new FailClosedError("对象存储未配置", "STORAGE_UNAVAILABLE");
  }

  const dir = path.join(process.cwd(), "public", "uploads", input.kind, input.characterId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), input.body);
  return { url: `/uploads/${key}`, key };
}

async function putS3Object(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION || "auto";
  const accessKey = process.env.S3_ACCESS_KEY_ID!;
  const secret = process.env.S3_SECRET_ACCESS_KEY!;
  const publicBase = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");

  const url = new URL(`${endpoint}/${bucket}/${encodeURI(key)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash("sha256").update(body).digest("hex");
  const host = url.host;

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    `${canonicalHeaders}\n`,
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

  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      Host: host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`S3 PUT failed: ${res.status} ${detail.slice(0, 200)}`);
  }

  const publicUrl = publicBase ? `${publicBase}/${key}` : `${endpoint}/${bucket}/${key}`;
  return { url: publicUrl, key };
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}
