"use client";

import Link from "next/link";
import { MIcon } from "@/components/ui/m-icon";
import { SceneCard } from "@/components/ui/scene-card";
import { CharacterImage } from "@/components/ui/character-image";
import { formatTimeAgo } from "@/lib/feed";
import {
  AVATAR_RING_COLORS,
  getCharacterBadge,
  getSceneForKey,
  mockReactions,
} from "@/lib/scenes";
import { resolveAnimePostImage } from "@/lib/character-media";
import { characterChatHref } from "@/lib/chat-inbox";
import { useLocale } from "@/components/i18n/locale-provider";

export type FeedPostData = {
  id: string;
  content: string;
  imageUrl: string | null;
  isAiAssisted: boolean;
  publishedAt: Date;
  character: {
    slug: string;
    name: string;
    avatarUrl: string;
    tagline: string | null;
  };
};

type FeedPostProps = {
  post: FeedPostData;
  basePath?: string;
  compact?: boolean;
  index?: number;
  commentCount?: number;
  likeCount?: number;
  liked?: boolean;
  onCommentClick?: () => void;
  onLikeClick?: () => void;
  onGiftClick?: () => void;
};

export function FeedPost({
  post,
  basePath = "",
  compact = false,
  index = 0,
  commentCount,
  likeCount,
  liked = false,
  onCommentClick,
  onLikeClick,
  onGiftClick,
}: FeedPostProps) {
  const { dict } = useLocale();
  const profileHref = `${basePath}/characters/${post.character.slug}`;
  const chatHref = characterChatHref(basePath as "" | "/h5" | "/app", post.character.slug, {
    post: post.id,
  });
  const scene = getSceneForKey(post.character.slug + post.id);
  const badge = getCharacterBadge(post.character.tagline, post.character.slug);
  const ringColor = AVATAR_RING_COLORS[post.character.slug.length % AVATAR_RING_COLORS.length];
  const postImage = resolveAnimePostImage(post.character.slug, post.imageUrl);
  const reactions = mockReactions(post.content);
  const fallbackLikes = reactions.reduce((s, r) => s + r.n, 0) || 128;
  const likes = likeCount ?? fallbackLikes;
  const replies =
    commentCount ?? Math.max(1, Math.floor((reactions.reduce((s, r) => s + r.n, 0) || 128) / 6));

  const actionRow = (
    <div
      className={`flex items-center gap-[18px] font-bold text-[#a89a92] ${
        compact ? "mt-2.5 text-xs" : "mt-2.5 text-[12.5px]"
      }`}
    >
      <button
        type="button"
        onClick={onLikeClick}
        disabled={!onLikeClick}
        className={`flex items-center gap-1 transition ${
          liked ? "text-[#ef7488]" : "hover:text-[#ef7488]"
        } disabled:cursor-default`}
        aria-label={liked ? dict.feed.unlike : dict.feed.like}
      >
        <MIcon name="favorite" className="text-[18px]" filled={liked || !onLikeClick} />
        {likes}
      </button>

      {onCommentClick ? (
        <button
          type="button"
          onClick={onCommentClick}
          className="flex items-center gap-1 transition hover:text-[#ef7488]"
          aria-label={dict.feed.reply}
        >
          <MIcon name="chat_bubble" className="text-[18px]" />
          {replies}
        </button>
      ) : (
        <span className="flex items-center gap-1">
          <MIcon name="chat_bubble" className="text-[18px]" />
          {replies}
        </span>
      )}

      {onGiftClick ? (
        <button
          type="button"
          onClick={onGiftClick}
          className="flex items-center gap-1 text-[#e0a93a] transition hover:text-[#d4922a]"
          aria-label={dict.feed.gift}
        >
          <MIcon name="redeem" className="text-[18px]" />
          {dict.feed.gift}
        </button>
      ) : (
        !compact && (
          <span className="flex items-center gap-1 text-[#e0a93a]">
            <MIcon name="redeem" className="text-[18px]" />
            {dict.feed.gift}
          </span>
        )
      )}

      <Link href={chatHref} className="ml-auto flex items-center gap-1 text-[#ef7488] hover:underline">
        <MIcon name="chat" className="text-[18px]" />
        {compact ? dict.feed.reply : dict.feed.replyAction}
      </Link>
    </div>
  );

  if (compact) {
    return (
      <article
        className="animate-float-up mb-2 bg-white"
        style={{ animationDelay: `${index * 0.05}s`, padding: "14px 16px" }}
      >
        <div className="flex items-center gap-2.5">
          <Link href={profileHref} className="shrink-0">
            <div
              className="relative h-[38px] w-[38px] overflow-hidden rounded-full"
              style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${ringColor}` }}
            >
              <CharacterImage
                slug={post.character.slug}
                src={post.character.avatarUrl}
                alt={post.character.name}
                fill
                className="rounded-full"
                sizes="38px"
              />
            </div>
          </Link>
          <div className="min-w-0 flex-1 leading-snug">
            <div className="font-display text-sm font-bold text-[#3a3330]">
              {post.character.name}{" "}
              <span className="text-[11px] font-medium text-[#b0a099]">
                · {formatTimeAgo(post.publishedAt)}
              </span>
            </div>
            <div className="text-[11px] text-[#b0a099]">@{post.character.slug}</div>
          </div>
          {post.isAiAssisted && (
            <span className="ai-badge text-[10px]">
              <MIcon name="auto_awesome" className="text-[12px]" />
              AI
            </span>
          )}
        </div>
        <Link href={profileHref}>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#463d38]">{post.content}</p>
        </Link>
        {postImage && (
          <Link href={profileHref} className="mt-2.5 block">
            <SceneCard scene={scene} imageUrl={postImage} />
          </Link>
        )}
        {actionRow}
      </article>
    );
  }

  return (
    <article
      className="animate-float-up border-b border-[rgba(120,72,54,0.06)] px-[22px] py-[18px]"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex gap-3">
        <Link href={profileHref} className="shrink-0">
          <div
            className="relative h-11 w-11 overflow-hidden rounded-full"
            style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ringColor}` }}
          >
            <CharacterImage
              slug={post.character.slug}
              src={post.character.avatarUrl}
              alt={post.character.name}
              fill
              className="rounded-full"
              sizes="44px"
            />
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={profileHref} className="font-display font-bold text-[#3a3330] hover:underline">
              {post.character.name}
            </Link>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            <span className="text-[12.5px] text-[#b0a099]">
              @{post.character.slug} · {formatTimeAgo(post.publishedAt)}
            </span>
            {post.isAiAssisted && (
              <span className="ai-badge">
                <MIcon name="auto_awesome" className="text-[12px]" />
                AI
              </span>
            )}
          </div>
          <Link href={profileHref}>
            <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-[1.7] text-[#463d38]">
              {post.content}
            </p>
          </Link>
          {postImage && (
            <Link href={profileHref} className="mt-2.5 block">
              <SceneCard scene={scene} imageUrl={postImage} />
            </Link>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {reactions.map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-[rgba(120,72,54,0.06)] bg-[#fbf2ee] px-2.5 py-1 text-[11.5px] font-bold text-[#8a7a72]"
              >
                {r.emoji} {r.n}
              </span>
            ))}
          </div>
          {actionRow}
        </div>
      </div>
    </article>
  );
}
