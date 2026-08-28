"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { FeedPostData } from "@/components/feed/feed-post";
import { FeedPost } from "@/components/feed/feed-post";
import { FeedGiftModal } from "@/components/feed/feed-gift-modal";
import { PostCommentModal } from "@/components/post/post-comment-modal";
import type { PostCommentView } from "@/lib/post-comments";
import { loginPath } from "@/lib/login-path";

type CharacterPostCardProps = {
  post: FeedPostData;
  comments: PostCommentView[];
  basePath?: string;
  variant?: "web" | "mobile";
  isLoggedIn: boolean;
  loginHref: string;
  index?: number;
  likeCount?: number;
  likedByMe?: boolean;
  characterId: string;
};

export function CharacterPostCard({
  post,
  comments: initialComments,
  basePath = "",
  variant = "web",
  isLoggedIn,
  loginHref,
  index = 0,
  likeCount = 0,
  likedByMe = false,
  characterId,
}: CharacterPostCardProps) {
  const pathname = usePathname();
  const [commentOpen, setCommentOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [liked, setLiked] = useState(likedByMe);
  const [likes, setLikes] = useState(likeCount);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  async function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = loginHref || loginPath(basePath, pathname);
      return;
    }
    if (likeLoading) return;
    const prevLiked = liked;
    const prevCount = likes;
    setLiked(!prevLiked);
    setLikes(prevCount + (prevLiked ? -1 : 1));
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/likes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLiked(Boolean(data.liked));
      setLikes(Number(data.likeCount ?? 0));
    } catch {
      setLiked(prevLiked);
      setLikes(prevCount);
    } finally {
      setLikeLoading(false);
    }
  }

  return (
    <>
      <div
        className={
          variant === "mobile"
            ? index > 0
              ? "mt-5 border-t border-[rgba(120,72,54,0.06)] pt-5"
              : ""
            : "animate-float-up overflow-hidden rounded-3xl border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_14px_34px_-24px_rgba(120,72,54,0.5)]"
        }
        style={variant === "web" ? { animationDelay: `${index * 0.05}s` } : undefined}
      >
        <FeedPost
          post={post}
          basePath={basePath}
          compact
          commentCount={comments.length}
          likeCount={likes}
          liked={liked}
          onLikeClick={toggleLike}
          onCommentClick={() => setCommentOpen(true)}
          onGiftClick={() => setGiftOpen(true)}
        />
      </div>

      <PostCommentModal
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        post={post}
        comments={comments}
        onCommentsChange={setComments}
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
      />

      <FeedGiftModal
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        characterId={characterId}
        characterName={post.character.name}
        isLoggedIn={isLoggedIn}
        loginHref={loginHref}
      />
    </>
  );
}
