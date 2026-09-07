import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostDraft } from "@/lib/ai/pipeline";
import { resolveLoraAdapter } from "@/lib/ai/lora";
import { slugify } from "@/lib/utils";
import { z } from "zod";
import { enforceAdultUser } from "@/lib/security/age";
import { enforceContentPolicy } from "@/lib/security/moderation";
import { DEFAULT_BOUNDARIES } from "@/lib/agent/defaults";
import { recordPersonaRevision, savePersonaUpdate } from "@/lib/agent/persona";

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
        tags: true,
        tagline: true,
        bio: true,
        personality: true,
        speechStyle: true,
        identity: true,
        worldRules: true,
        brandVoice: true,
        boundaries: true,
        contentRating: true,
        personaVersion: true,
        triggerWord: true,
        skillIds: true,
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
    const ageGate = await enforceAdultUser(session.user.id);
    if (ageGate) return ageGate;

    const body = await request.json();
    const data = createSchema.parse(body);
    const blocked = await enforceContentPolicy(
      [data.name, data.tagline, data.bio, data.personality].filter(Boolean).join("\n"),
      "character",
    );
    if (blocked) return blocked;

    let slug = slugify(data.name);
    const existing = await prisma.character.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const character = await prisma.character.create({
      data: {
        ...data,
        slug,
        creatorId: session.user.id,
        tags: data.tags ?? "",
        identity: data.tagline ?? "",
        boundaries: DEFAULT_BOUNDARIES,
      },
    });
    await recordPersonaRevision(character.id, {
      name: character.name,
      tagline: character.tagline ?? "",
      bio: character.bio,
      personality: character.personality,
      speechStyle: character.speechStyle,
      identity: character.identity,
      worldRules: character.worldRules,
      brandVoice: character.brandVoice,
      boundaries: character.boundaries,
      contentRating: character.contentRating === "MATURE" ? "MATURE" : "ALL",
      triggerWord: character.triggerWord,
      skillIds: character.skillIds,
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
    const draftAction = z
      .object({ id: z.string(), action: z.literal("draft-post") })
      .safeParse(body);
    if (draftAction.success) {
      const character = await prisma.character.findUnique({ where: { id: draftAction.data.id } });
      if (!character || character.creatorId !== session.user.id) {
        return NextResponse.json({ error: "権限がありません" }, { status: 403 });
      }
      const loraConfig = await resolveLoraAdapter(character);
      const draft = await generatePostDraft(character, loraConfig);
      return NextResponse.json({ draft });
    }

    const personaAction = z
      .object({
        id: z.string(),
        action: z.literal("update-persona"),
        tagline: z.string().max(200).optional(),
        bio: z.string().min(10).max(4000),
        personality: z.string().min(10).max(4000),
        speechStyle: z.string().min(5).max(2000),
        identity: z.string().max(2000).optional(),
        worldRules: z.string().max(4000).optional(),
        brandVoice: z.string().max(2000).optional(),
        boundaries: z.string().max(4000).optional(),
        contentRating: z.enum(["ALL", "MATURE"]).optional(),
        triggerWord: z.string().max(64).optional().nullable(),
        skillIds: z.string().max(400).optional(),
      })
      .parse(body);

    const owned = await prisma.character.findUnique({ where: { id: personaAction.id } });
    if (!owned || owned.creatorId !== session.user.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const blocked = await enforceContentPolicy(
      [personaAction.bio, personaAction.personality, personaAction.identity, personaAction.worldRules]
        .filter(Boolean)
        .join("\n"),
      "character",
    );
    if (blocked) return blocked;

    const character = await savePersonaUpdate(personaAction.id, {
      tagline: personaAction.tagline,
      bio: personaAction.bio,
      personality: personaAction.personality,
      speechStyle: personaAction.speechStyle,
      identity: personaAction.identity ?? "",
      worldRules: personaAction.worldRules ?? "",
      brandVoice: personaAction.brandVoice ?? "",
      boundaries: personaAction.boundaries,
      contentRating: personaAction.contentRating,
      triggerWord: personaAction.triggerWord ?? null,
      skillIds: personaAction.skillIds,
    });
    return NextResponse.json({ character });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
