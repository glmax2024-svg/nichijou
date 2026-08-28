import Link from "next/link";
import { Heart } from "lucide-react";
import { parseTags } from "@/lib/utils";
import { CharacterImage } from "@/components/ui/character-image";

type CharacterCardProps = {
  slug: string;
  name: string;
  tagline?: string | null;
  avatarUrl: string;
  tags: string;
  subscriptionPrice: number;
  postCount?: number;
};

export function CharacterCard({
  slug,
  name,
  tagline,
  avatarUrl,
  tags,
  subscriptionPrice,
  postCount = 0,
}: CharacterCardProps) {
  const tagList = parseTags(tags).slice(0, 3);

  return (
    <Link
      href={`/characters/${slug}`}
      className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-rose-100 transition hover:-translate-y-1 hover:shadow-lg hover:ring-rose-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-rose-50 to-orange-50">
        <CharacterImage
          slug={slug}
          src={avatarUrl}
          alt={name}
          variant="cover"
          fill
          className="transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4 pt-12">
          <h3 className="text-xl font-bold text-white">{name}</h3>
          {tagline && <p className="mt-1 line-clamp-2 text-sm text-white/90">{tagline}</p>}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {tagList.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>{postCount} 投稿</span>
          <span className="inline-flex items-center gap-1 font-medium text-rose-500">
            <Heart className="h-4 w-4" />
            ¥{subscriptionPrice}/月
          </span>
        </div>
      </div>
    </Link>
  );
}
