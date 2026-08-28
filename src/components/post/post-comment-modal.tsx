"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { formatTimeAgo } from "@/lib/feed";
import { CharacterImage } from "@/components/ui/character-image";
import { SceneCard } from "@/components/ui/scene-card";
import { MIcon } from "@/components/ui/m-icon";
import type { FeedPostData } from "@/components/feed/feed-post";
import type { PostCommentView } from "@/lib/post-comments";
import { getSceneForKey } from "@/lib/scenes";
import { resolveAnimePostImage } from "@/lib/character-media";

type PostCommentModalProps = {
  open: boolean;
  onClose: () => void;
  post: FeedPostData;
  comments: PostCommentView[];
  onCommentsChange: (comments: PostCommentView[]) => void;
  isLoggedIn: boolean;
  loginHref: string;
};

export function PostCommentModal({
  open,
  onClose,
  post,
  comments,
  onCommentsChange,
  isLoggedIn,
  loginHref,
}: PostCommentModalProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    const text = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送信に失敗しました");

      const next = [
        ...comments,
        ...data.comments.map((c: PostCommentView & { createdAt: string }) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        })),
      ];
      onCommentsChange(next);
    } catch (err) {
      setInput(text);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  const scene = getSceneForKey(post.character.slug + post.id);
  const postImage = resolveAnimePostImage(post.character.slug, post.imageUrl);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-start sm:pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="コメント"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="閉じる"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[22px] bg-white shadow-[0_24px_80px_-20px_rgba(58,51,48,0.45)] sm:rounded-[22px]">
        <div className="flex shrink-0 items-center justify-between border-b border-[rgba(120,72,54,0.08)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#3a3330] transition hover:bg-[#fbf4f1]"
            aria-label="閉じる"
          >
            <MIcon name="close" className="text-[22px]" />
          </button>
          <span className="font-display text-[15px] font-bold text-[#3a3330]">コメント</span>
          <div className="w-9" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <CharacterImage
                    slug={post.character.slug}
                    src={post.character.avatarUrl}
                    alt={post.character.name}
                    fill
                    className="rounded-full"
                    sizes="40px"
                  />
                </div>
                <div className="mt-1 w-0.5 flex-1 min-h-[12px] bg-[rgba(120,72,54,0.12)]" />
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-[15px] font-bold text-[#3a3330]">
                    {post.character.name}
                  </span>
                  <span className="text-[13px] text-[#b0a099]">@{post.character.slug}</span>
                  <span className="text-[13px] text-[#b0a099]">
                    · {formatTimeAgo(post.publishedAt)}
                  </span>
                  {post.isAiAssisted && (
                    <span className="ai-badge text-[9px]">
                      <MIcon name="auto_awesome" className="text-[10px]" />
                      AI
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-[#463d38]">
                  {post.content}
                </p>
                {postImage && (
                  <div className="mt-2.5">
                    <SceneCard scene={scene} imageUrl={postImage} maxHeight={360} />
                  </div>
                )}
              </div>
            </div>

            <p className="mb-3 text-[13px] text-[#8a7a72]">
              <span className="text-[#ef7488]">返信先</span> @{post.character.slug}
            </p>

            {comments.length > 0 ? (
              <div className="space-y-0">
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    characterSlug={post.character.slug}
                    characterName={post.character.name}
                    characterAvatar={post.character.avatarUrl}
                  />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-[13px] text-[#b0a099]">
                まだコメントはありません
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-[rgba(120,72,54,0.08)] bg-[#fffaf8] px-4 py-3">
          {isLoggedIn ? (
            <form onSubmit={submit}>
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff]">
                  <MIcon name="person" className="text-[20px] text-[#ef7488]" />
                </div>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="返信を投稿"
                    maxLength={500}
                    rows={3}
                    disabled={loading}
                    className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#3a3330] outline-none placeholder:text-[#c2b4ac]"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {loading && (
                      <span className="text-[12px] text-[#ef7488]">
                        {post.character.name}が返信を書いています…
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="rounded-full bg-[#ef7488] px-5 py-2 text-[14px] font-bold text-white transition hover:bg-[#e0607a] disabled:opacity-40"
                    >
                      返信
                    </button>
                  </div>
                  {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
                </div>
              </div>
            </form>
          ) : (
            <p className="py-2 text-center text-[13px] text-[#8a7a72]">
              <Link href={loginHref} className="font-bold text-[#ef7488] hover:underline">
                ログイン
              </Link>
              して返信
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CommentItem({
  comment,
  characterSlug,
  characterName,
  characterAvatar,
}: {
  comment: PostCommentView;
  characterSlug: string;
  characterName: string;
  characterAvatar: string;
}) {
  const isCharacter = comment.authorType === "character";

  return (
    <div className="flex gap-3 py-2.5">
      <div className="flex flex-col items-center">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
          {isCharacter ? (
            <CharacterImage
              slug={characterSlug}
              src={characterAvatar}
              alt={characterName}
              fill
              className="rounded-full"
              sizes="36px"
            />
          ) : comment.user?.image ? (
            <Image
              src={comment.user.image}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ffe4e8] to-[#eef1ff] text-xs font-bold text-[#ef7488]">
              {(comment.user?.name ?? "?")[0]}
            </div>
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 leading-snug">
          <span className="font-display text-[14px] font-bold text-[#3a3330]">
            {isCharacter ? characterName : comment.user?.name ?? "ユーザー"}
          </span>
          {isCharacter && comment.isAiGenerated && (
            <span className="ai-badge text-[9px]">
              <MIcon name="auto_awesome" className="text-[10px]" />
              AI
            </span>
          )}
          <span className="text-[12px] text-[#b0a099]">
            · {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[14px] leading-relaxed text-[#463d38]">{comment.content}</p>
      </div>
    </div>
  );
}
