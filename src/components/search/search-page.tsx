import Link from "next/link";
import Image from "next/image";
import { parseTags } from "@/lib/utils";
import { MIcon } from "@/components/ui/m-icon";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { SEARCH_TAGS, searchCharacters } from "@/lib/search";
import { CharacterImage } from "@/components/ui/character-image";
import { getSceneForKey, mockAffinity } from "@/lib/scenes";

type SearchPageProps = {
  basePath: "" | "/h5" | "/app";
  q?: string;
  tag?: string;
  variant?: "mobile" | "web";
};

export async function SearchPage({
  basePath,
  q,
  tag,
  variant = "mobile",
}: SearchPageProps) {
  const characters = await searchCharacters({ q, tag });
  const searchPath = basePath ? `${basePath}/search` : "/search";
  const charHref = (slug: string) =>
    basePath ? `${basePath}/characters/${slug}` : `/characters/${slug}`;

  const searchBar = (
    <form action={searchPath} method="get" className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-full border border-[rgba(120,72,54,0.1)] bg-white px-4 py-2.5">
        <MIcon name="search" className="text-[20px] text-[#c2b4ac]" />
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="名前・タグで検索"
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#c2b4ac]"
        />
      </div>
      {tag && tag !== "おすすめ" && <input type="hidden" name="tag" value={tag} />}
      <button type="submit" className="btn-primary shrink-0 rounded-full px-4 py-2 text-xs">
        検索
      </button>
    </form>
  );

  const tagRow = (
    <div className="flex flex-wrap gap-2">
      {SEARCH_TAGS.map((t) => {
        const isActive =
          t === "おすすめ" ? !tag : tag === t.replace("#", "");
        const href =
          t === "おすすめ"
            ? `${searchPath}${q ? `?q=${encodeURIComponent(q)}` : ""}`
            : `${searchPath}?tag=${encodeURIComponent(t.replace("#", ""))}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
        return (
          <Link
            key={t}
            href={href}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
              isActive
                ? "bg-[#3a3330] text-white"
                : "border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
            }`}
          >
            {t}
          </Link>
        );
      })}
    </div>
  );

  const results = (
    <>
      <p className="text-[12.5px] text-[#b0a099]">
        {characters.length} 件のキャラクター
        {q ? ` · 「${q}」` : ""}
        {tag && tag !== "おすすめ" ? ` · #${tag}` : ""}
      </p>
      {characters.length === 0 ? (
        <div className="py-16 text-center">
          <MIcon name="search_off" className="mx-auto text-[48px] text-[#d8ccc4]" />
          <p className="mt-4 font-display font-bold text-[#3a3330]">見つかりませんでした</p>
          <p className="mt-2 text-sm text-[#8a7a72]">別のキーワードやタグを試してください</p>
        </div>
      ) : variant === "web" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c, i) => (
            <SearchCard key={c.id} character={c} href={charHref(c.slug)} index={i} />
          ))}
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {characters.map((c, i) => (
            <li key={c.id} className="animate-float-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <SearchCard character={c} href={charHref(c.slug)} index={i} />
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (variant === "web") {
    return (
      <div
        className="relative min-h-[calc(100vh-60px)]"
        style={{ background: "linear-gradient(180deg,#fbf4f1,#f9ece7)" }}
      >
        <div className="mx-auto max-w-[1050px] px-6 py-8 sm:px-10">
          <h1 className="font-display text-[26px] font-black text-[#3a3330]">検索</h1>
          <div className="mt-4 space-y-3">
            {searchBar}
            {tagRow}
          </div>
          <div className="mt-6">{results}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader
        title="検索"
        backHref={basePath ? `${basePath}/discover` : "/discover"}
      />
      <div className="space-y-3 px-[18px] py-3">
        {searchBar}
        {tagRow}
        {results}
      </div>
    </div>
  );
}

function SearchCard({
  character: c,
  href,
  index,
}: {
  character: {
    slug: string;
    name: string;
    avatarUrl: string;
    tagline: string | null;
    tags: string;
    _count: { posts: number; subscriptions: number };
  };
  href: string;
  index: number;
}) {
  const scene = getSceneForKey(c.slug);
  const affinity = mockAffinity(c.slug);
  const tags = parseTags(c.tags);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_14px_34px_-24px_rgba(120,72,54,0.5)]">
      <div className="relative h-[100px] overflow-hidden sm:h-[110px]" style={{ background: scene.scene }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-[rgba(58,51,48,0.72)] px-2 py-0.5 text-[10px] font-bold text-white">
          Lv.{affinity.level}
        </span>
      </div>
      <div className="relative -mt-[28px] px-3.5 pb-3.5">
        <CharacterImage
          slug={c.slug}
          src={c.avatarUrl}
          alt={c.name}
          width={56}
          height={56}
          className="rounded-[18px] border-[3px] border-white shadow-[0_8px_18px_-10px_rgba(0,0,0,0.5)]"
        />
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0 leading-snug">
            <div className="font-display text-base font-bold">{c.name}</div>
            <div className="text-[11.5px] text-[#b0a099]">{c.tagline}</div>
          </div>
          <Link href={href} className="btn-primary shrink-0 rounded-full px-4 py-2 text-xs">
            見る
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.slice(0, 2).map((t) => (
            <span key={t} className="tag-pill text-[10.5px]">
              #{t}
            </span>
          ))}
          <span className="ml-auto text-[11px] text-[#b0a099]">
            ❤ {c._count.subscriptions.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
