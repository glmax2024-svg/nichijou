import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewMediaAsset } from "@/lib/media";
import { getObject, isObjectStorageConfigured, presignGetUrl, publicUrlForKey } from "@/lib/storage";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/** 私有媒体的唯一出口：鉴权后再签发限时地址，存储真实位置不外泄。 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (asset.visibility === "PUBLIC") {
    return NextResponse.redirect(publicUrlForKey(asset.storageKey), 302);
  }

  const session = await auth();
  const viewer = session?.user ? { id: session.user.id, role: session.user.role } : null;

  const limited = enforceRateLimit(request, "media-private", { limit: 120, windowMs: 60_000 }, viewer?.id);
  if (limited) return limited;

  // 无权限时返回 404 而不是 403：不泄露这个资产是否存在
  if (!(await canViewMediaAsset(asset, viewer))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (isObjectStorageConfigured()) {
    return NextResponse.redirect(presignGetUrl(asset.storageKey, 600), 302);
  }

  const body = await getObject(asset.storageKey);
  if (!body) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(body.length),
      "Cache-Control": "private, no-store",
    },
  });
}
