import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/admin";
import { FailClosedError } from "@/lib/runtime";
import { failClosedResponse } from "@/lib/security/rate-limit";
import { putUpload } from "@/lib/storage";
import { animationKindFromUrl } from "@/lib/gifts/types";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"]);

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルを選んでください" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "対応形式: PNG / JPEG / WEBP / GIF / MP4" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "12MB 以下にしてください" }, { status: 400 });
    }
    const stored = await putUpload({
      kind: "gifts",
      characterId: "platform",
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
    return NextResponse.json({
      url: stored.url,
      animationKind: animationKindFromUrl(stored.url),
    });
  } catch (err) {
    if (err instanceof FailClosedError) {
      return failClosedResponse(err);
    }
    console.error("[admin/gifts/upload]", err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
