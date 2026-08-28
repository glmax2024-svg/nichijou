import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatAccess } from "@/lib/chat-quota";
import { loginPath } from "@/lib/login-path";
import { resolveAnimeAvatar } from "@/lib/character-media";
import { getCharacterSkills } from "@/lib/character-skills";
import { getChatContext } from "@/lib/chat-context";
import { formatMemoryHints } from "@/lib/chat-greeting";
import { MIcon } from "@/components/ui/m-icon";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

type CharacterChatPageProps = {
  slug: string;
  basePath?: "" | "/h5" | "/app";
  variant?: "web" | "mobile";
  activeSkill?: string | null;
  activePostId?: string | null;
};

export async function CharacterChatPage({
  slug,
  basePath = "",
  variant = "web",
  activeSkill,
  activePostId,
}: CharacterChatPageProps) {
  if (variant === "web") {
    return (
      <ChatWorkspace
        activeSlug={slug}
        basePath={basePath}
        activeSkill={activeSkill}
        activePostId={activePostId}
      />
    );
  }

  const session = await auth();
  const profileHref = `${basePath}/characters/${slug}`;
  const chatHref = `${profileHref}/chat`;

  if (!session?.user) {
    redirect(loginPath(basePath, chatHref));
  }

  const character = await prisma.character.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      avatarUrl: true,
      subscriptionPrice: true,
      published: true,
      creatorId: true,
      creator: { select: { name: true } },
    },
  });

  if (!character?.published) notFound();

  const chatAccess = await getChatAccess(session.user.id, character);

  const messages = await prisma.message.findMany({
    where: { userId: session.user.id, characterId: character.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const chatContext = await getChatContext(session.user.id, character, {
    postId: activePostId,
    messageCount: messages.length,
  });

  const memoryDisplay = formatMemoryHints(chatContext.memoryHints);

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-[rgba(120,72,54,0.08)] bg-white px-3 py-2.5">
        <Link
          href={profileHref}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full hover:bg-[#fbf4f1]"
        >
          <MIcon name="arrow_back" className="text-[22px] text-[#3a3330]" />
        </Link>
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-2.5">
          <img
            src={resolveAnimeAvatar(character.slug, character.avatarUrl)}
            alt={character.name}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0 leading-snug">
            <div className="truncate font-display text-[15px] font-bold">{character.name}</div>
            <div className="truncate text-[11px] text-[#b0a099]">
              Official by {character.creator.name ?? "クリエイター"}
            </div>
          </div>
        </Link>
        <MIcon name="info" className="text-[22px] text-[#8a7a72]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatThread
          characterId={character.id}
          characterSlug={character.slug}
          characterName={character.name}
          characterAvatar={resolveAnimeAvatar(character.slug, character.avatarUrl)}
          chatAccess={chatAccess}
          subscriptionPrice={character.subscriptionPrice}
          skills={getCharacterSkills(character.slug)}
          activeSkill={activeSkill}
          variant="page"
          hideHeader
          memoryHints={memoryDisplay}
          postContext={chatContext.postContext}
          initialGreeting={chatContext.initialGreeting}
          initialMessages={messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
