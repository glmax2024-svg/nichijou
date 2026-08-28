import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const MAX_FILES = 8;
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const limited = enforceRateLimit(
    request,
    "studio-upload",
    { limit: 20, windowMs: 10 * 60_000 },
    session.user.id,
  );
  if (limited) return limited;

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
      return NextResponse.json({ error: "请选择图片" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `一次最多 ${MAX_FILES} 张` }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "uploads", "posts", characterId);
    await mkdir(dir, { recursive: true });

    const uploaded: { url: string; name: string }[] = [];
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: `不支持: ${file.name}` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `${file.name} 超过 12MB` }, { status: 400 });
      }
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : file.type === "image/gif"
              ? "gif"
              : "jpg";
      const filename = `${randomUUID()}.${ext}`;
      await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
      uploaded.push({
        url: `/uploads/posts/${characterId}/${filename}`,
        name: file.name,
      });
    }

    return NextResponse.json({ images: uploaded });
  } catch (error) {
    console.error("[studio/upload]", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
