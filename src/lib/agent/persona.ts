import type { Character, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeBoundaries, type ContentRating } from "@/lib/agent/defaults";

export type PersonaSnapshot = {
  name: string;
  tagline: string;
  bio: string;
  personality: string;
  speechStyle: string;
  identity: string;
  worldRules: string;
  brandVoice: string;
  boundaries: string;
  contentRating: ContentRating;
  triggerWord: string | null;
  skillIds: string;
};

export function toPersonaSnapshot(
  character: Pick<
    Character,
    | "name"
    | "tagline"
    | "bio"
    | "personality"
    | "speechStyle"
    | "identity"
    | "worldRules"
    | "brandVoice"
    | "boundaries"
    | "contentRating"
    | "triggerWord"
    | "skillIds"
  >,
): PersonaSnapshot {
  return {
    name: character.name,
    tagline: character.tagline ?? "",
    bio: character.bio,
    personality: character.personality,
    speechStyle: character.speechStyle,
    identity: character.identity,
    worldRules: character.worldRules,
    brandVoice: character.brandVoice,
    boundaries: normalizeBoundaries(character.boundaries),
    contentRating: character.contentRating === "MATURE" ? "MATURE" : "ALL",
    triggerWord: character.triggerWord,
    skillIds: character.skillIds,
  };
}

export async function recordPersonaRevision(characterId: string, snapshot: PersonaSnapshot) {
  const current = await prisma.character.findUnique({
    where: { id: characterId },
    select: { personaVersion: true },
  });
  const version = current?.personaVersion ?? 1;
  await prisma.personaRevision.upsert({
    where: { characterId_version: { characterId, version } },
    create: {
      characterId,
      version,
      payload: snapshot as Prisma.InputJsonValue,
    },
    update: {
      payload: snapshot as Prisma.InputJsonValue,
    },
  });
}

export async function savePersonaUpdate(
  characterId: string,
  input: Partial<PersonaSnapshot> & Pick<PersonaSnapshot, "bio" | "personality" | "speechStyle">,
) {
  const existing = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
  const nextVersion = existing.personaVersion + 1;
  const merged = toPersonaSnapshot({
    ...existing,
    ...input,
    tagline: input.tagline ?? existing.tagline,
    identity: input.identity ?? existing.identity,
    worldRules: input.worldRules ?? existing.worldRules,
    brandVoice: input.brandVoice ?? existing.brandVoice,
    boundaries: normalizeBoundaries(input.boundaries ?? existing.boundaries),
    contentRating: input.contentRating ?? existing.contentRating,
    triggerWord: input.triggerWord === undefined ? existing.triggerWord : input.triggerWord,
    skillIds: input.skillIds ?? existing.skillIds,
  });

  const character = await prisma.character.update({
    where: { id: characterId },
    data: {
      tagline: merged.tagline || null,
      bio: merged.bio,
      personality: merged.personality,
      speechStyle: merged.speechStyle,
      identity: merged.identity,
      worldRules: merged.worldRules,
      brandVoice: merged.brandVoice,
      boundaries: merged.boundaries,
      contentRating: merged.contentRating,
      triggerWord: merged.triggerWord,
      skillIds: merged.skillIds,
      personaVersion: nextVersion,
    },
  });

  await prisma.personaRevision.create({
    data: {
      characterId,
      version: nextVersion,
      payload: merged as Prisma.InputJsonValue,
    },
  });

  return character;
}
