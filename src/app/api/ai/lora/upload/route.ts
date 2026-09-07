import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, failClosedResponse } from "@/lib/security/rate-limit";
import { FailClosedError } from "@/lib/runtime";
import { putUpload } from "@/lib/storage";
import { enforceAdultUser } from "@/lib/security/age";

const MAX_FILES = 40;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "lora-upload",
    { limit: 20, windowMs: 10 * 60_000 },
    session.user.id,
  );
  if (limited) return limited;

  const ageGate = await enforceAdultUser(session.user.id);
  if (ageGate) return ageGate;

  try {
    const form = await request.formData();
    const characterId = String(form.get("characterId") ?? "");
    if (!characterId) {
      return NextResponse.json({ error: "characterId required" }, { status: 400 });
    }

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { creatorId: true },
    });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const files = form
      .getAll("files")
      .filter((f): f is File => typeof File !== "undefined" && f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "请选择至少一张图片" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `一次最多上传 ${MAX_FILES} 张` }, { status: 400 });
    }

    const uploaded: { url: string; name: string; size: number }[] = [];

    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: `不支持的格式: ${file.name || file.type}` },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `${file.name} 超过 8MB 限制` },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await putUpload({
        kind: "lora",
        characterId,
        body: buffer,
        contentType: file.type,
      });
      uploaded.push({
        url: stored.url,
        name: file.name,
        size: file.size,
      });
    }

    return NextResponse.json({ images: uploaded });
  } catch (error) {
    if (error instanceof FailClosedError) {
      return failClosedResponse(error);
    }
    console.error("[lora/upload]", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
