import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getObject } from "@/lib/storage";

/**
 * 公开媒体的出口。两个桶都不对外开放，公开图片也由这里从存储读取后返回。
 *
 * key 里带 UUID、内容永不变化，所以可以给一年的 immutable 缓存；
 * next/image 的优化结果也会缓存在服务器上，同一张图基本只回源一次。
 */

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
};

/** 只放行公开区与旧的公开上传目录；私有文件必须走 /api/media/<id> 鉴权 */
const PUBLIC_PREFIXES = ["public/", "posts/", "generated/", "gifts/"];
/** 画师上传的 LoRA 训练素材：不公开，但登录用户（画师本人在 Studio 预览）需要能看 */
const SESSION_PREFIXES = ["lora/"];

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await params;
  if (segments.some((s) => !s || s === "." || s === "..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const key = segments.join("/");

  const needsSession = SESSION_PREFIXES.some((p) => key.startsWith(p));
  if (!needsSession && !PUBLIC_PREFIXES.some((p) => key.startsWith(p))) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (needsSession && !(await auth())?.user) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const body = await getObject(key);
  if (!body) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.length),
      "Cache-Control": needsSession ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
