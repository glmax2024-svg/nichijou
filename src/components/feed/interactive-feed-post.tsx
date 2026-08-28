"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FeedPost, type FeedPostData } from "@/components/feed/feed-post";
import { PostCommentModal } from "@/components/post/post-comment-modal";
import { FeedGiftModal } from "@/components/feed/feed-gift-modal";
import { loginPath } from "@/lib/login-path";
import type { PostCommentView } from "@/lib/post-comments";
import { useLocale } from "@/components/i18n/locale-provider";

export type InteractiveFeedPostData = FeedPostData & {
  characterId: string;
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
};

type InteractiveFeedPostProps = {
  post: InteractiveFeedPostData;
  basePath?: string;
  compact?: boolean;
  index?: number;
  isLoggedIn: boolean;
};

export function InteractiveFeedPost({
  post,
  basePath = "",
  compact = false,
  index = 0,
  isLoggedIn,
}: InteractiveFeedPostProps) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const loginHref = loginPath(basePath, pathname);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [comments, setComments] = useState<PostCommentView[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);

  useEffect(() => {
    setLiked(post.likedByMe);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.likedByMe, post.likeCount, post.commentCount, post.id]);

  async function openComments() {
    setCommentOpen(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      if (!res.ok) return;
      const next = (data.comments ?? []).map(
        (c: PostCommentView & { createdAt: string }) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }),
      );
      setComments(next);
      setCommentCount(next.length);
    } catch {
      /* ignore */
    }
  }

  async function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    if (likeLoading) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    setLikeLoading(true);

    try {
      const res = await fetch(`/api/posts/${post.id}/likes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.feed.likeFailed);
      setLiked(Boolean(data.liked));
      setLikeCount(Number(data.likeCount ?? 0));
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  }

  return (
    <>
      <FeedPost
        post={post}
        basePath={basePath}
        compact={compact}
        index={index}
        commentCount={commentCount}
        likeCount={likeCount}
        liked={liked}
        onLikeClick={toggleLike}
        onCommentClick={openComments}
        onGiftClick={() => setGiftOpen(true)}
      />

      <PostCommentModal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        post={post}
        comments={comments}
        onCommentsChange={(next) => {
          setComments(next);
          setCommentCount(next.length);
        }}
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
      />

      <FeedGiftModal
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        characterId={post.characterId}
        characterName={post.character.name}
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
      />
    </>
  );
}
