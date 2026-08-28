import Image from "next/image";
import { Sparkles } from "lucide-react";

type PostCardProps = {
  content: string;
  imageUrl?: string | null;
  isAiAssisted: boolean;
  publishedAt: Date;
  characterName: string;
  characterAvatar: string;
};

export function PostCard({
  content,
  imageUrl,
  isAiAssisted,
  publishedAt,
  characterName,
  characterAvatar,
}: PostCardProps) {
  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-11 w-11 overflow-hidden rounded-2xl ring-2 ring-rose-100">
          <Image src={characterAvatar} alt={characterName} fill className="object-cover" />
        </div>
        <div>
          <p className="font-semibold text-stone-800">{characterName}</p>
          <p className="text-xs text-stone-400">
            {new Intl.DateTimeFormat("ja-JP", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(publishedAt)}
          </p>
        </div>
        {isAiAssisted && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-600">
            <Sparkles className="h-3 w-3" />
            AI 補助
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-stone-700">{content}</p>
      {imageUrl && (
        <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl">
          <Image src={imageUrl} alt="" fill className="object-cover" />
        </div>
      )}
    </article>
  );
}
