import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/admin";
import { FailClosedError } from "@/lib/runtime";
import { failClosedResponse } from "@/lib/security/rate-limit";
import { putUpload } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** 活动横幅图（公开） */
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
      return NextResponse.json({ error: "対応形式: PNG / JPEG / WEBP / GIF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "8MB 以下にしてください" }, { status: 400 });
    }
    const stored = await putUpload({
      kind: "events",
      characterId: "platform",
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
    return NextResponse.json({ url: stored.url });
  } catch (err) {
    if (err instanceof FailClosedError) return failClosedResponse(err);
    console.error("[admin/events/upload]", err);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
