import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseTags, isSubscribed } from "@/lib/utils";
import { CharacterPostCard } from "@/components/post/character-post-card";
import { CharacterProfileTabs } from "@/components/character/character-profile-tabs";
import { getCommentsForPosts } from "@/lib/post-comments";
import type { FeedPostData } from "@/components/feed/feed-post";
import { CharacterActions } from "@/components/character-actions";
import { MIcon } from "@/components/ui/m-icon";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { AffinityBar } from "@/components/ui/affinity-bar";
import { GiftShelf } from "@/components/ui/gift-shelf";
import { ProfileCover } from "@/components/ui/profile-cover";
import { CreatorOfficialBadge } from "@/components/character/creator-badge";
import { mockAffinity } from "@/lib/scenes";
import { loginPath } from "@/lib/login-path";
import { characterChatHref } from "@/lib/chat-inbox";
import { CharacterImage } from "@/components/ui/character-image";
import { getCharacterPrivateMedia } from "@/lib/character-media";
import { skillsForCharacter } from "@/lib/character-skills";
import { FREE_DAILY_MESSAGE_LIMIT } from "@/lib/chat-quota";

type CharacterProfileProps = {
  slug: string;
  basePath?: "" | "/h5" | "/app";
  variant?: "web" | "mobile";
};

export async function CharacterProfile({
  slug,
  basePath = "",
  variant = "web",
}: CharacterProfileProps) {
  const session = await auth();

  const character = await prisma.character.findUnique({
    where: { slug },
    include: {
      creator: { select: { id: true, name: true } },
      posts: { orderBy: { publishedAt: "desc" } },
      _count: { select: { subscriptions: true, posts: true } },
    },
  });

  if (!character?.published) notFound();

  const subscribed = session?.user?.id
    ? await isSubscribed(session.user.id, character.id)
    : false;

  const tags = parseTags(character.tags);
  const homeHref = basePath || "/";
  const chatHref = characterChatHref(basePath, slug);
  const affinity = mockAffinity(character.slug);
  const commentsByPost = await getCommentsForPosts(character.posts.map((p) => p.id));
  const loginHref = loginPath(basePath, `${basePath}/characters/${slug}`);
  const privateMedia = getCharacterPrivateMedia(character.slug);
  const skills = skillsForCharacter(character);

  const postCards = character.posts.map((post, i) => {
    const feedPost: FeedPostData = {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      isAiAssisted: post.isAiAssisted,
      publishedAt: post.publishedAt,
      character: {
        slug: character.slug,
        name: character.name,
        avatarUrl: character.avatarUrl,
        tagline: character.tagline,
      },
    };
    return (
      <CharacterPostCard
        key={post.id}
        post={feedPost}
        comments={commentsByPost.get(post.id) ?? []}
        basePath={basePath}
        variant={variant}
        isLoggedIn={!!session?.user}
        loginHref={loginHref}
        index={i}
        characterId={character.id}
      />
    );
  });

  const dailyContent =
    character.posts.length === 0 ? (
      <p className="py-8 text-center text-sm text-[#b0a099]">まだ投稿がありません</p>
    ) : (
      postCards
    );

  if (variant === "mobile") {
    return (
      <div className="bg-white">
        <div className="relative">
          <ProfileCover slug={character.slug} coverUrl={character.coverUrl} variant="mobile" />
          <Link
            href={homeHref}
            className="absolute left-3.5 top-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90"
          >
            <MIcon name="arrow_back" className="text-[20px] text-[#3a3330]" />
          </Link>
        </div>
        <div className="relative -mt-[46px] px-[18px] pb-4">
          <CharacterImage
            slug={character.slug}
            src={character.avatarUrl}
            alt={character.name}
            width={88}
            height={88}
            className="rounded-[28px] border-4 border-white shadow-[0_12px_24px_-12px_rgba(120,72,54,0.7)]"
          />
          <div className="mt-2.5 flex items-center gap-2">
            <h1 className="font-display text-[23px] font-black">{character.name}</h1>
            <span className="text-[13px] text-[#b0a099]">@{character.slug}</span>
          </div>
          {character.tagline && (
            <p className="mt-1 text-[12.5px] text-[#8a7a72]">{character.tagline}</p>
          )}
          <div className="mt-3.5 flex gap-[22px]">
            <Stat n={character._count.posts} label="投稿" mobile />
            <Stat n={character._count.subscriptions} label="推し" mobile />
            <Stat n={tags.length} label="タグ" mobile />
          </div>
          <div className="mt-3.5 flex gap-2">
            {subscribed ? (
              <>
                <Link href={chatHref} className="btn-primary flex flex-1 items-center justify-center gap-1.5 rounded-[15px] py-3 text-center text-[14.5px] shadow-[0_12px_22px_-10px_rgba(239,116,136,0.8)]">
                  <MIcon name="chat_bubble" className="text-[20px] text-white" />
                  メッセージ
                </Link>
                <Link
                  href={`${basePath}/subscriptions`}
                  className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[15px] border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
                  aria-label="推し管理"
                >
                  <MIcon name="favorite" className="text-[22px]" filled />
                </Link>
              </>
            ) : session?.user ? (
              <>
                <Link href={chatHref} className="btn-primary flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[15px] py-2.5 text-center shadow-[0_12px_22px_-10px_rgba(239,116,136,0.8)]">
                  <span className="flex items-center gap-1.5 text-[14.5px]">
                    <MIcon name="chat_bubble" className="text-[20px] text-white" />
                    メッセージ
                  </span>
                  <span className="text-[10px] font-medium text-white/85">
                    無料 {FREE_DAILY_MESSAGE_LIMIT} 通/日
                  </span>
                </Link>
                <Link
                  href={`${basePath}/subscriptions`}
                  className="flex h-[46px] min-w-[46px] shrink-0 items-center justify-center rounded-[15px] border border-[rgba(120,72,54,0.1)] bg-white px-2 text-[11px] font-bold text-[#ef7488]"
                >
                  推す
                </Link>
              </>
            ) : (
              <Link
                href={loginHref}
                className="btn-primary block w-full rounded-[15px] py-3 text-center text-[14.5px] shadow-[0_12px_22px_-10px_rgba(239,116,136,0.8)]"
              >
                ログイン · 無料 {FREE_DAILY_MESSAGE_LIMIT} 通/日
              </Link>
            )}
          </div>
          <p className="mt-3.5 text-[13px] leading-[1.7] text-[#5a4f48]">{character.bio}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill text-[11px]">
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <CreatorOfficialBadge
              creatorName={character.creator.name ?? "クリエイター"}
              creatorId={character.creator.id}
              characterName={character.name}
              size="sm"
              className="w-full"
            />
          </div>
        </div>
        <CharacterProfileTabs
          variant="mobile"
          dailyContent={dailyContent}
          privateMedia={privateMedia}
          skills={skills}
          characterName={character.name}
          characterSlug={character.slug}
          isSubscribed={subscribed}
          isLoggedIn={!!session?.user}
          subscriptionPrice={character.subscriptionPrice}
          loginHref={loginHref}
          chatHref={chatHref}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[1080px] px-4 py-8 sm:px-7">
        <Link
          href={homeHref}
          className="mb-5 inline-flex items-center gap-3 text-[#7a6a62] transition hover:text-[#3a3330]"
        >
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[rgba(120,72,54,0.1)] bg-white">
            <MIcon name="arrow_back" className="text-[22px]" />
          </div>
          <span className="font-display text-[15px] font-bold">ホームへ戻る</span>
        </Link>

        <div className="overflow-hidden rounded-[26px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_30px_70px_-44px_rgba(120,72,54,0.5)]">
          <ProfileCover slug={character.slug} coverUrl={character.coverUrl} variant="web" />
          <div className="relative -mt-14 px-6 pb-6 sm:px-7 sm:pb-6">
            <div className="flex flex-wrap items-end gap-5">
              <CharacterImage
                slug={character.slug}
                src={character.avatarUrl}
                alt={character.name}
                width={118}
                height={118}
                className="rounded-[36px] border-[5px] border-white shadow-[0_16px_34px_-18px_rgba(120,72,54,0.7)]"
              />
              <div className="min-w-0 flex-1 pb-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[27px] font-black">{character.name}</h1>
                  <span className="text-sm text-[#b0a099]">@{character.slug}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eafaf1] px-2.5 py-1 text-[11px] font-bold text-[#3fae76]">
                    <MIcon name="verified" className="text-[13px]" />
                    LoRA 学習済み
                  </span>
                  <span className="rounded-full bg-[#fff6e6] px-2.5 py-1 text-[11px] font-bold text-[#b8862e]">
                    🎂 8月15日
                  </span>
                </div>
                {character.tagline && (
                  <p className="mt-1 text-sm text-[#8a7a72]">{character.tagline}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5 pb-1.5">
                {(subscribed || session?.user) && (
                  <Link
                    href={chatHref}
                    className={
                      subscribed
                        ? "btn-dark flex items-center gap-1.5 rounded-2xl px-5 py-3 text-[15px]"
                        : "btn-primary flex flex-col items-center gap-0.5 rounded-2xl px-5 py-2.5"
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      <MIcon name="chat_bubble" className="text-[20px] text-white" />
                      メッセージ
                    </span>
                    {!subscribed && (
                      <span className="text-[10px] font-medium text-white/85">
                        無料 {FREE_DAILY_MESSAGE_LIMIT} 通/日
                      </span>
                    )}
                  </Link>
                )}
                <CharacterActions
                  characterId={character.id}
                  characterName={character.name}
                  subscriptionPrice={character.subscriptionPrice}
                  isSubscribed={subscribed}
                  isLoggedIn={!!session?.user}
                  variant="inline"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-5">
              <div className="min-w-[260px] flex-1">
                <AffinityBar level={affinity.level} percent={affinity.percent} />
              </div>
              <div className="flex gap-6 sm:gap-7">
                <Stat n={character._count.posts} label="投稿" />
                <Stat n={character._count.subscriptions} label="推し" />
                <Stat n={98} label="返信率" suffix="%" />
              </div>
            </div>

            <p className="mt-4 max-w-[640px] text-sm leading-[1.8] text-[#5a4f48]">
              {character.bio}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[11px] font-bold text-[#6b7fd0]">
                性格 · 天然
              </span>
              <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-[11px] font-bold text-[#6b7fd0]">
                口调 · やわらか敬语
              </span>
              <span className="rounded-full bg-[#f2ecff] px-3 py-1 text-[11px] font-bold text-[#8b76d4]">
                好き · 珈琲/読書
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="tag-pill">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="mt-4">
              <CreatorOfficialBadge
                creatorName={character.creator.name ?? "クリエイター"}
                creatorId={character.creator.id}
                characterName={character.name}
              />
            </div>
            <div className="mt-4">
              <GiftShelf characterId={character.id} />
            </div>
          </div>
        </div>

        <CharacterProfileTabs
          variant="web"
          dailyContent={
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
              <div className="flex flex-col gap-4">
                {character.posts.length === 0 ? (
                  <p className="py-12 text-center text-sm text-[#b0a099]">まだ投稿がありません</p>
                ) : (
                  postCards
                )}
              </div>
              <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
                <div id="actions">
                  <CharacterActions
                    characterId={character.id}
                    characterName={character.name}
                    subscriptionPrice={character.subscriptionPrice}
                    isSubscribed={subscribed}
                    isLoggedIn={!!session?.user}
                  />
                </div>
              </aside>
            </div>
          }
          privateMedia={privateMedia}
          skills={skills}
          characterName={character.name}
          characterSlug={character.slug}
          isSubscribed={subscribed}
          isLoggedIn={!!session?.user}
          subscriptionPrice={character.subscriptionPrice}
          loginHref={loginHref}
          chatHref={chatHref}
        />
      </div>
    </div>
  );
}

function Stat({
  n,
  label,
  suffix,
  mobile,
}: {
  n: number;
  label: string;
  suffix?: string;
  mobile?: boolean;
}) {
  return (
    <div>
      <span
        className={`font-display font-black ${
          mobile ? "text-[17px]" : "text-lg sm:text-[19px]"
        }`}
      >
        {n.toLocaleString()}
        {suffix ?? ""}
      </span>{" "}
      <span className={`text-[#a89a92] ${mobile ? "text-xs" : "text-xs sm:text-[12.5px]"}`}>
        {label}
      </span>
    </div>
  );
}
