import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIcon } from "@/components/ui/m-icon";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { EventBanner } from "@/components/ui/event-banner";
import { StoryRail } from "./story-rail";
import {
  InteractiveFeedPost,
  type InteractiveFeedPostData,
} from "./interactive-feed-post";
import { getFeedPosts, getStoryCharacters, getTrendingCharacters } from "@/lib/feed";
import { getSubscribedFeedPosts } from "@/lib/search";
import { mockAffinity, RANK_COLORS } from "@/lib/scenes";
import { CharacterImage } from "@/components/ui/character-image";
import { getRequestLocale } from "@/i18n/server";
import { formatMessage, getDictionary } from "@/i18n";
import type { Dictionary } from "@/i18n/dictionaries/ja";

type FeedPageProps = {
  basePath?: string;
  variant?: "web" | "mobile";
  feedTab?: string;
};

export async function FeedPage({ basePath = "", variant = "web", feedTab }: FeedPageProps) {
  const session = await auth();
  const locale = await getRequestLocale();
  const dict = getDictionary(locale);
  const isFollowing = feedTab === "following";

  const [posts, storyCharacters, trending] = await Promise.all([
    isFollowing && session?.user
      ? getSubscribedFeedPosts(session.user.id)
      : getFeedPosts(),
    getStoryCharacters(),
    getTrendingCharacters(),
  ]);

  const postIds = posts.map((p) => p.id);
  const userId = session?.user?.id;

  const allLikes = postIds.length
    ? await prisma.postLike.findMany({
        where: { postId: { in: postIds } },
        select: { postId: true, userId: true },
      })
    : [];

  const likeCountMap = new Map<string, number>();
  const likedSet = new Set<string>();
  for (const like of allLikes) {
    likeCountMap.set(like.postId, (likeCountMap.get(like.postId) ?? 0) + 1);
    if (userId && like.userId === userId) likedSet.add(like.postId);
  }

  const feedPosts: InteractiveFeedPostData[] = posts.map((p) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    isAiAssisted: p.isAiAssisted,
    publishedAt: p.publishedAt,
    character: p.character,
    characterId: p.character.id,
    commentCount: p._count?.comments ?? 0,
    likeCount: likeCountMap.get(p.id) ?? 0,
    likedByMe: likedSet.has(p.id),
  }));

  const subCount = session?.user
    ? await prisma.subscription.count({
        where: { userId: session.user.id, status: "ACTIVE" },
      })
    : 0;

  const topOshi = trending[0];

  if (variant === "mobile") {
    return (
      <div className="min-h-full">
        <div className="border-b border-[rgba(120,72,54,0.06)] bg-white">
          <StoryRail characters={storyCharacters} basePath={basePath} variant="mobile" />
        </div>
        <div className="bg-[#fbf4f1]">
          {feedPosts.length === 0 ? (
            <EmptyFeed
              isFollowing={isFollowing}
              isLoggedIn={!!session?.user}
              dict={dict}
            />
          ) : (
            feedPosts.map((post, i) => (
              <InteractiveFeedPost
                key={post.id}
                post={post}
                basePath={basePath}
                compact
                index={i}
                isLoggedIn={!!session?.user}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] ?? dict.common.guest;
  const topAffinity = topOshi ? mockAffinity(topOshi.slug) : { level: 8, percent: 72 };

  return (
    <div className="relative min-h-screen">
      <AmbientBg />
      <div className="relative z-10 mx-auto grid max-w-[1180px] grid-cols-1 items-start lg:grid-cols-[230px_minmax(0,1fr)_290px]">
        <aside className="sticky top-[60px] hidden flex-col gap-1 px-3.5 py-5 lg:flex lg:h-[calc(100vh-60px)]">
          <SideNav href="/" icon="home" label={dict.nav.home} active />
          <SideNav href="/discover" icon="auto_awesome" label={dict.nav.discover} />
          <SideNav href="/messages" icon="mail" label={dict.nav.messages} />
          <SideNav
            href="/subscriptions"
            icon="favorite"
            label={dict.nav.oshi}
            badge={subCount || undefined}
          />
          <SideNav href="/gifts" icon="redeem" label={dict.nav.gifts} />
          <SideNav href="/studio" icon="palette" label={dict.nav.studio} />
          <Link
            href="/studio"
            className="btn-primary mt-2.5 flex items-center justify-center gap-2 rounded-[15px] px-4 py-3 text-sm transition hover:opacity-95"
          >
            <MIcon name="edit" className="text-[19px] text-white" />
            {dict.nav.postDaily}
          </Link>
          {topOshi && (
            <div
              className="mt-3.5 rounded-2xl border border-[rgba(239,116,136,0.12)] p-3.5"
              style={{ background: "linear-gradient(160deg,#fff,#fff4f6)" }}
            >
              <div className="text-[11px] font-bold text-[#b0a099]">{dict.feed.todayMood}</div>
              <Link
                href={`/characters/${topOshi.slug}`}
                className="mt-2 flex items-center gap-2"
              >
                <div className="relative h-[34px] w-[34px] overflow-hidden rounded-full">
                  <CharacterImage slug={topOshi.slug} src={topOshi.avatarUrl} alt={topOshi.name} fill sizes="34px" />
                </div>
                <div className="leading-snug">
                  <div className="font-display text-[13px] font-bold">{topOshi.name}</div>
                  <div className="text-[11px] text-[#ef7488]">☀️ {dict.feed.moodGood}</div>
                </div>
              </Link>
            </div>
          )}
        </aside>

        <main className="min-h-[calc(100vh-60px)] border-x border-[rgba(120,72,54,0.07)] bg-white">
          <div className="px-[22px] pb-2 pt-4">
            <h2 className="font-display text-[21px] font-black text-[#3a3330]">
              {formatMessage(dict.feed.greeting, { name: userName })}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#b0a099]">
              {formatMessage(dict.feed.arrived, { count: feedPosts.length })}
            </p>
          </div>
          <EventBanner />
          <div className="flex gap-5 border-b border-[rgba(120,72,54,0.08)] px-[22px] pt-3.5">
            {[
              { label: dict.feed.tabRecommend, tab: undefined },
              { label: dict.feed.tabFollowing, tab: "following" },
              { label: dict.feed.tabNearby, tab: "nearby" },
            ].map(({ label, tab }) => {
              const active = (feedTab ?? undefined) === tab || (!feedTab && !tab);
              const href = tab ? `/?tab=${tab}` : "/";
              return (
                <Link
                  key={label}
                  href={href}
                  className={`pb-2.5 font-display text-sm ${
                    active
                      ? "border-b-[3px] border-[#ef7488] font-bold text-[#3a3330]"
                      : "text-[#b0a099]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <StoryRail characters={storyCharacters} basePath={basePath} />
          {feedPosts.length === 0 ? (
            <EmptyFeed
              isFollowing={isFollowing}
              isLoggedIn={!!session?.user}
              dict={dict}
            />
          ) : (
            feedPosts.map((post, i) => (
              <InteractiveFeedPost
                key={post.id}
                post={post}
                basePath={basePath}
                index={i}
                isLoggedIn={!!session?.user}
              />
            ))
          )}
        </main>

        <aside className="sticky top-[60px] hidden flex-col gap-3.5 px-4 py-5 xl:flex">
          {topOshi && (
            <div
              className="rounded-[20px] border border-[rgba(239,116,136,0.14)] p-4"
              style={{
                background: "linear-gradient(160deg,#fff,#fff4f6)",
                boxShadow: "0 12px 30px -22px rgba(239,116,136,0.4)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[14px]">
                  <CharacterImage slug={topOshi.slug} src={topOshi.avatarUrl} alt={topOshi.name} fill sizes="34px" />
                </div>
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="font-display text-sm font-bold">
                    {topOshi.name}{" "}
                    <span className="rounded-full bg-[#ef7488] px-1.5 py-0.5 text-[10px] text-white">
                      Lv.{topAffinity.level}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#b0a099]">
                    {formatMessage(dict.feed.affinityNext, { level: topAffinity.level + 1 })}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#ffe1e6]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f79aa8] to-[#ef7488]"
                  style={{ width: `${topAffinity.percent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] text-[#b0a099]">
                <span>{topAffinity.percent * 10} / 1000</span>
                <span className="font-bold text-[#ef7488]">
                  {formatMessage(dict.feed.birthdayIn, { n: 12 })}
                </span>
              </div>
            </div>
          )}

          <div className="card p-4">
            <h3 className="font-display text-[15px] font-bold text-[#3a3330]">{dict.feed.trending}</h3>
            <ul className="mt-3 space-y-1">
              {trending.slice(0, 4).map((c, i) => (
                <li key={c.id}>
                  <div className="flex items-center gap-2.5 py-1.5">
                    <span
                      className="w-4 font-display text-[13px] font-black"
                      style={{ color: RANK_COLORS[i] ?? RANK_COLORS[3] }}
                    >
                      {i + 1}
                    </span>
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <CharacterImage slug={c.slug} src={c.avatarUrl} alt={c.name} fill sizes="40px" />
                    </div>
                    <div className="min-w-0 flex-1 leading-snug">
                      <p className="truncate font-display text-[13.5px] font-bold">{c.name}</p>
                      <p className="text-[11px] text-[#b0a099]">
                        {formatMessage(dict.feed.oshiCount, {
                          n: c._count.subscriptions.toLocaleString(),
                          p: c._count.posts,
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/characters/${c.slug}`}
                      className="btn-dark shrink-0 rounded-full px-3 py-1 text-[11px]"
                    >
                      {dict.feed.followCta}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-[20px] border border-[rgba(239,116,136,0.14)] p-[18px]"
            style={{ background: "linear-gradient(150deg,#fff2f0,#ffe6ea 60%,#eef1ff)" }}
          >
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-white">
              <MIcon name="favorite" className="animate-soft-pulse text-[22px] text-[#ef7488]" />
            </div>
            <h3 className="mt-3 font-display text-[15px] font-bold">{dict.feed.tagline}</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#8a7a72]">{dict.feed.subHint}</p>
            <Link href="/login" className="btn-primary mt-3 block rounded-[13px] py-2.5 text-center text-[13.5px]">
              {dict.feed.start}
            </Link>
          </div>

          <PlatformLinks dict={dict} />
        </aside>
      </div>
    </div>
  );
}

function SideNav({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[15px] px-4 py-2.5 transition ${
        active
          ? "bg-gradient-to-br from-[#ffe4e8] to-[#ffeef0] font-bold text-[#e0607a]"
          : "text-[#7a6a62] hover:bg-white/60"
      }`}
    >
      <MIcon name={icon} className="text-[22px]" filled={active} />
      <span className="font-display">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-[#ffeef1] px-1.5 py-0.5 text-[10px] font-bold text-[#e0607a]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function EmptyFeed({
  isFollowing = false,
  isLoggedIn = false,
  dict,
}: {
  isFollowing?: boolean;
  isLoggedIn?: boolean;
  dict: Dictionary;
}) {
  return (
    <div className="px-[22px] py-16 text-center">
      <p className="text-[#8a7a72]">
        {isFollowing
          ? isLoggedIn
            ? dict.feed.emptyFollowing
            : dict.feed.emptyFollowingLogin
          : dict.feed.empty}
      </p>
      {isFollowing && !isLoggedIn ? (
        <Link href="/login" className="btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm">
          {dict.common.login}
        </Link>
      ) : !isFollowing ? (
        <p className="mt-2 text-sm text-[#b0a099]">
          <code className="rounded-lg bg-[#fbf4f1] px-2 py-1">npm run db:seed</code>
        </p>
      ) : (
        <Link href="/discover" className="btn-primary mt-4 inline-block rounded-full px-6 py-2.5 text-sm">
          {dict.feed.findOshi}
        </Link>
      )}
    </div>
  );
}

function PlatformLinks({ dict }: { dict: Dictionary }) {
  return (
    <div className="flex gap-2.5 px-1 text-xs text-[#b0a099]">
      <span className="font-bold text-[#8a7a72]">{dict.feed.clients}</span>
      <Link href="/h5" className="font-bold text-[#ef7488] hover:underline">
        {dict.feed.clientH5}
      </Link>
      <Link href="/app" className="font-bold text-[#ef7488] hover:underline">
        {dict.feed.clientApp}
      </Link>
    </div>
  );
}
