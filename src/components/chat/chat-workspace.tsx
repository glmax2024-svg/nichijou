import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChatAccess } from "@/lib/chat-quota";
import { loginPath } from "@/lib/login-path";
import { getChatThreads } from "@/lib/chat-inbox";
import { getChatContext, type ChatContextData } from "@/lib/chat-context";
import { formatMemoryHints } from "@/lib/chat-greeting";
import {
  resolveAnimeAvatar,
} from "@/lib/character-media";
import {
  getCharacterDailyMedia,
  getDayPeriod,
  getJstHour,
  getPrimaryLiveStatus,
} from "@/lib/character-live-status";
import { skillsForCharacter } from "@/lib/character-skills";
import { ChatThreadList } from "@/components/chat/chat-thread-list";
import { ChatCharacterPanel } from "@/components/chat/chat-character-panel";
import { ChatThread } from "@/components/chat/chat-thread";
import { MIcon } from "@/components/ui/m-icon";
import { getRequestLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n";

type ChatWorkspaceProps = {
  activeSlug?: string | null;
  basePath?: "" | "/h5" | "/app";
  activeSkill?: string | null;
  activePostId?: string | null;
};

export async function ChatWorkspace({
  activeSlug,
  basePath = "",
  activeSkill,
  activePostId,
}: ChatWorkspaceProps) {
  const session = await auth();
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const messagesHref = basePath ? `${basePath}/messages` : "/messages";

  if (!session?.user) {
    const callback = activeSlug
      ? `${basePath}/characters/${activeSlug}/chat`
      : messagesHref;
    redirect(loginPath(basePath, callback));
  }

  const threads = await getChatThreads(session.user.id);

  let character = null;
  let creatorName: string | null = null;
  let messages: { id: string; role: string; content: string; isAiGenerated: boolean; createdAt: Date }[] = [];
  let chatAccess = {
    canSend: false,
    isSubscribed: false,
    isCreator: false,
    used: 0,
    limit: 10,
    remaining: 0,
  };
  let subscribed = false;
  let chatContext: ChatContextData = {
    memoryHints: [],
    postContext: null,
    initialGreeting: null,
    bond: null,
    bondLabel: null,
  };

  if (activeSlug) {
    character = await prisma.character.findUnique({
      where: { slug: activeSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        avatarUrl: true,
        coverUrl: true,
        tagline: true,
        bio: true,
        personality: true,
        tags: true,
        skillIds: true,
        subscriptionPrice: true,
        published: true,
        creatorId: true,
        creator: { select: { name: true } },
        _count: { select: { subscriptions: true, posts: true } },
      },
    });

    if (character?.published) {
      creatorName = character.creator.name;
      chatAccess = await getChatAccess(session.user.id, character);
      subscribed = chatAccess.isSubscribed;
      const messageRows = await prisma.message.findMany({
        where: { userId: session.user.id, characterId: character.id },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      messages = messageRows;
      chatContext = await getChatContext(session.user.id, character, {
        postId: activePostId,
        messageCount: messages.length,
      });
    } else {
      character = null;
    }
  }

  const panelData = character
    ? (() => {
        const hourJst = getJstHour();
        const dayPeriod = getDayPeriod(hourJst);
        return {
          slug: character.slug,
          name: character.name,
          avatarUrl: resolveAnimeAvatar(character.slug, character.avatarUrl),
          coverUrl: character.coverUrl,
          tagline: character.tagline,
          bio: character.bio,
          personality: character.personality,
          tags: character.tags,
          subscriptionPrice: character.subscriptionPrice,
          subscribed,
          subscriberCount: character._count.subscriptions,
          postCount: character._count.posts,
          creatorName: creatorName ?? "クリエイター",
          creatorId: character.creatorId,
          liveStatus: getPrimaryLiveStatus(character.slug, {
            chatting: true,
            hourJst,
            locale,
          }),
          dailyMedia: getCharacterDailyMedia(character.slug, locale),
          dayPeriod,
          bond: chatContext.bond ?? null,
        };
      })()
    : null;

  const memoryDisplay = formatMemoryHints(chatContext.memoryHints);

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden bg-[#f5eeea]">
      <aside className="flex w-[min(300px,28vw)] shrink-0 flex-col border-r border-[rgba(120,72,54,0.08)]">
        <ChatThreadList threads={threads} activeSlug={activeSlug} basePath={basePath} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {character ? (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b border-[rgba(120,72,54,0.08)] px-5 py-3">
              <img
                src={resolveAnimeAvatar(character.slug, character.avatarUrl)}
                alt={character.name}
                className="h-10 w-10 rounded-full object-cover object-top"
              />
              <div className="min-w-0 flex-1 leading-snug">
                <div className="font-display text-[15px] font-bold">{character.name}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#3fae76]">オンライン</span>
                  {chatContext.bondLabel && (
                    <span className="text-[10px] font-bold text-[#e0607a]">{chatContext.bondLabel}</span>
                  )}
                  {creatorName && (
                    <span className="text-[10px] text-[#8a7a72]">
                      Official by {creatorName}
                    </span>
                  )}
                </div>
              </div>
              {!subscribed && (
                <span className="rounded-full bg-[#ffeef1] px-2.5 py-1 text-[11px] font-bold text-[#e0607a]">
                  {dict.chatUi.notJoined}
                </span>
              )}
              <Link
                href={`${basePath}/characters/${character.slug}`}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#fbf4f1] xl:hidden"
              >
                <MIcon name="info" className="text-[22px] text-[#8a7a72]" />
              </Link>
            </div>
            <ChatThread
              characterId={character.id}
              characterSlug={character.slug}
              characterName={character.name}
              characterAvatar={resolveAnimeAvatar(character.slug, character.avatarUrl)}
              chatAccess={chatAccess}
              subscriptionPrice={character.subscriptionPrice}
              skills={skillsForCharacter(character)}
              activeSkill={activeSkill}
              variant="page"
              layout="workspace"
              hideHeader
              memoryHints={memoryDisplay}
              postContext={chatContext.postContext}
              initialGreeting={chatContext.initialGreeting}
              initialBondLabel={chatContext.bondLabel}
              initialMessages={messages.map((m) => ({
                ...m,
                createdAt: m.createdAt.toISOString(),
              }))}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <MIcon name="forum" className="text-[56px] text-[#ef7488]/25" />
            <p className="mt-4 font-display text-lg font-black text-[#3a3330]">
              会話を選んでください
            </p>
            <p className="mt-2 max-w-[280px] text-sm text-[#8a7a72]">
              左のリストからキャラクターを選ぶか、新しい推しを見つけましょう
            </p>
            <Link
              href={basePath ? `${basePath}/discover` : "/discover"}
              className="btn-primary mt-6 rounded-full px-6 py-2.5 text-sm"
            >
              キャラクターを発見
            </Link>
          </div>
        )}
      </main>

      <aside className="hidden w-[min(360px,32vw)] shrink-0 border-l border-[rgba(120,72,54,0.08)] xl:flex xl:flex-col">
        {panelData ? (
          <ChatCharacterPanel character={panelData} basePath={basePath} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[#b0a099]">
            キャラクターを選ぶと<br />プロフィールが表示されます
          </div>
        )}
      </aside>
    </div>
  );
}
