import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostDraft } from "@/lib/ai/pipeline";
import { resolveLoraAdapter } from "@/lib/ai/lora";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  avatarUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  bio: z.string().min(10),
  personality: z.string().min(10),
  speechStyle: z.string().min(5),
  tags: z.string().optional(),
  subscriptionPrice: z.number().int().min(100).default(980),
  published: z.boolean().default(false),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const session = await auth();
    const character = await prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        loraStatus: true,
        loraAdapterId: true,
        loraVersion: true,
        coverUrl: true,
        avatarUrl: true,
        creatorId: true,
        published: true,
      },
    });
    if (!character) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    if (
      !character.published &&
      (!session?.user?.id || character.creatorId !== session.user.id)
    ) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    return NextResponse.json(character);
  }

  const characters = await prisma.character.findMany({
    where: { published: true },
    include: { _count: { select: { posts: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(characters);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "クリエイター権限が必要です" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    let slug = slugify(data.name);
    const existing = await prisma.character.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const character = await prisma.character.create({
      data: {
        ...data,
        slug,
        creatorId: session.user.id,
        tags: data.tags ?? "",
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action } = z
      .object({ id: z.string(), action: z.literal("draft-post") })
      .parse(body);

    const character = await prisma.character.findUnique({ where: { id } });
    if (!character || character.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const loraConfig = await resolveLoraAdapter(character);
    const draft = await generatePostDraft(character, loraConfig);
    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: "下書き生成に失敗しました" }, { status: 500 });
  }
}
