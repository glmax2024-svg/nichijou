import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isObjectStorageConfigured, putUpload } from "../src/lib/storage";

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

loadDotenv();

if (!isObjectStorageConfigured()) {
  console.error("S3/R2 未配置。需要 S3_ENDPOINT、S3_BUCKET、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY。");
  process.exit(1);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const stored = await putUpload({
  kind: "generated",
  characterId: "platform",
  body: png,
  contentType: "image/png",
  filename: `smoke-${Date.now()}.png`,
});

const res = await fetch(stored.url);
console.log(`put ${stored.key}`);
console.log(`url ${stored.url}`);
console.log(`get ${res.status} ${res.headers.get("content-type") ?? ""}`);
if (!res.ok) {
  console.error("对象已写入，但公开 URL 读失败。检查 bucket 是否公开，以及 S3_PUBLIC_BASE_URL。");
  process.exit(1);
}
console.log("storage smoke ok");
