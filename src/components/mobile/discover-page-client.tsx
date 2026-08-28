"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { CharacterImage } from "@/components/ui/character-image";
import {
  DISCOVER_ANIME_CATALOG,
  DISCOVER_CATEGORIES,
  DISCOVER_GENDERS,
  formatDiscoverCount,
  type DiscoverCategoryId,
  type DiscoverDemoCard,
} from "@/lib/discover-catalog";
import { parseTags } from "@/lib/utils";
import { bustCharacterAssetCache } from "@/lib/character-media";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMessage } from "@/i18n";
import type { Dictionary } from "@/i18n/dictionaries/ja";

const WANT_CHAT_KEY = "nichijou-discover-want-chat";

type DbCharacter = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  bio: string;
  avatarUrl: string;
  coverUrl: string | null;
  tags: string;
  _count: { posts: number; subscriptions: number };
};

type DiscoverPageClientProps = {
  basePath: "/h5" | "/app" | "";
  variant?: "mobile" | "web";
  characters: DbCharacter[];
  includeDemoCatalog?: boolean;
};

type GridCard = {
  key: string;
  href: string;
  chatHref: string;
  name: string;
  tagline: string;
  description: string;
  coverUrl: string;
  slug: string;
  chats: number;
  tags: string[];
  source: "db" | "demo";
  gender: "female" | "male" | "other";
  category: DiscoverCategoryId;
};

type WantChatItem = {
  key: string;
  name: string;
  coverUrl: string;
  href: string;
  chatHref: string;
  tagline: string;
};

function buildOpeners(
  dict: Dictionary,
  name: string,
  tagline: string,
  description: string,
): string[] {
  const short = description.slice(0, 36).replace(/\s+/g, " ").trim();
  return [
    formatMessage(dict.discover.openerHello, { name }),
    tagline
      ? formatMessage(dict.discover.openerScene, { tagline })
      : dict.discover.openerFallbackScene,
    short
      ? `${short}${description.length > 36 ? "…" : ""}`
      : dict.discover.openerAsk,
  ];
}

function localizeTag(dict: Dictionary, tag: string): string {
  const key = tag as keyof Dictionary["tags"];
  return dict.tags[key] ?? tag;
}

function categoryMatches(card: GridCard, cat: DiscoverCategoryId): boolean {
  if (cat === "recommend" || cat === "all") return true;
  if (cat === "anime") {
    return (
      card.category === "anime" ||
      card.category === "fantasy" ||
      card.category === "game" ||
      card.source === "demo" ||
      card.tags.some((t) =>
        /anime|fantasy|game|二次元|ファンタジー|ゲーム/i.test(t),
      )
    );
  }
  return card.category === cat || card.tags.includes(cat);
}

function dbToCard(c: DbCharacter, basePath: string): GridCard {
  const tags = parseTags(c.tags);
  const joined = tags.join(" ");
  const category: DiscoverCategoryId = /anime|二次元|ゲーム|fantasy|游戏|幻想/i.test(
    joined,
  )
    ? "anime"
    : /school|校园|学園|高校/i.test(joined)
      ? "school"
      : /romance|恋爱|恋愛/i.test(joined)
        ? "romance"
        : /healing|治愈|癒し/i.test(joined)
          ? "healing"
          : "recommend";

  const href = basePath ? `${basePath}/characters/${c.slug}` : `/characters/${c.slug}`;
  const chatHref = `${href}/chat`;
  const description = c.bio.slice(0, 90);

  return {
    key: `db-${c.id}`,
    href,
    chatHref,
    name: c.name,
    tagline: c.tagline ?? "",
    description,
    coverUrl: c.coverUrl || c.avatarUrl,
    slug: c.slug,
    chats: Math.max(c._count.subscriptions * 1200 + c._count.posts * 800, 420),
    tags,
    source: "db",
    gender: "female",
    category,
  };
}

function demoToCard(d: DiscoverDemoCard, basePath: string): GridCard {
  const href = basePath
    ? `${basePath}/characters/${d.hrefSlug}`
    : `/characters/${d.hrefSlug}`;
  return {
    key: d.id,
    href,
    chatHref: `${href}/chat`,
    name: d.name,
    tagline: d.tagline,
    description: d.description,
    coverUrl: d.coverUrl,
    slug: d.hrefSlug,
    chats: d.chats,
    tags: d.tags,
    source: "demo",
    gender: d.gender,
    category: d.category === "all" ? "anime" : d.category,
  };
}

function loadWantChat(): WantChatItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WANT_CHAT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WantChatItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function DiscoverPageClient({
  basePath,
  variant = "mobile",
  characters,
  includeDemoCatalog = false,
}: DiscoverPageClientProps) {
  const { dict } = useLocale();
  const [gender, setGender] = useState<(typeof DISCOVER_GENDERS)[number]["id"]>("all");
  const [category, setCategory] = useState<DiscoverCategoryId>("anime");
  const [wantChat, setWantChat] = useState<WantChatItem[]>([]);
  const [showWantTray, setShowWantTray] = useState(false);
  const [preview, setPreview] = useState<GridCard | null>(null);
  const searchPath = basePath ? `${basePath}/search` : "/search";

  useEffect(() => {
    setWantChat(loadWantChat());
  }, []);

  const persistWant = useCallback((next: WantChatItem[]) => {
    setWantChat(next);
    try {
      localStorage.setItem(WANT_CHAT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const allCards = useMemo(() => {
    const fromDb = characters.map((c) => dbToCard(c, basePath));
    const fromDemo = includeDemoCatalog
      ? DISCOVER_ANIME_CATALOG.map((d) => demoToCard(d, basePath))
      : [];
    return [...fromDb, ...fromDemo];
  }, [characters, basePath, includeDemoCatalog]);

  const filtered = useMemo(() => {
    return allCards.filter((card) => {
      if (gender !== "all" && card.gender !== gender) return false;
      return categoryMatches(card, category);
    });
  }, [allCards, gender, category]);

  function isWanted(key: string) {
    return wantChat.some((w) => w.key === key);
  }

  function toggleWant(card: GridCard) {
    const exists = wantChat.find((w) => w.key === card.key);
    if (exists) {
      persistWant(wantChat.filter((w) => w.key !== card.key));
      return;
    }
    persistWant(
      [
        {
          key: card.key,
          name: card.name,
          coverUrl: card.coverUrl,
          href: card.href,
          chatHref: card.chatHref,
          tagline: card.tagline,
        },
        ...wantChat,
      ].slice(0, 20),
    );
  }

  const isWeb = variant === "web";
  const categoryLabel = dict.category[category as keyof typeof dict.category] ?? dict.category.recommend;
  const genderLabel = gender === "all" ? null : dict.gender[gender];

  return (
    <div
      className={isWeb ? "relative min-h-[calc(100vh-60px)]" : "min-h-full bg-[#fbf4f1]"}
      style={
        isWeb ? { background: "linear-gradient(180deg,#fbf4f1,#f9ece7)" } : undefined
      }
    >
      <div
        className={
          isWeb
            ? "mx-auto max-w-[1200px] px-5 py-7 pb-28 sm:px-8"
            : "px-[14px] pb-28 pt-2.5"
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className={`font-display font-black text-[#3a3330] ${
                isWeb ? "text-[26px]" : "text-[22px]"
              }`}
            >
              {dict.discover.title}
            </h2>
            <p
              className={`text-[#b0a099] ${isWeb ? "mt-1 text-[13px]" : "mt-0.5 text-[12.5px]"}`}
            >
              {[genderLabel, categoryLabel].filter(Boolean).join(" · ")}
              {" · "}
              {filtered.length}
              {dict.discover.countSuffix ? ` ${dict.discover.countSuffix}` : ""}
            </p>
          </div>
        </div>

        <Link
          href={searchPath}
          className={`mt-3 flex items-center gap-2 rounded-full border border-[rgba(120,72,54,0.1)] bg-white text-[#c2b4ac] transition hover:border-[rgba(239,116,136,0.2)] ${
            isWeb ? "max-w-[420px] px-4 py-2.5" : "px-4 py-2.5"
          }`}
        >
          <MIcon name="search" className="text-[20px]" />
          <span className="text-[13px]">{dict.discover.searchPlaceholder}</span>
        </Link>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {DISCOVER_GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGender(g.id)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
                gender === g.id
                  ? "bg-[#ef7488] text-white shadow-[0_8px_18px_-10px_rgba(239,116,136,0.7)]"
                  : "border border-[rgba(120,72,54,0.1)] bg-white text-[#8a7a72]"
              }`}
            >
              {dict.gender[g.id]}
            </button>
          ))}
        </div>

        <div className="mt-2.5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {DISCOVER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
                category === c.id
                  ? "bg-[#3a3330] text-white"
                  : "border border-[rgba(120,72,54,0.1)] bg-white/90 text-[#8a7a72]"
              }`}
            >
              {dict.category[c.id]}
            </button>
          ))}
        </div>

        <div
          className={`mt-4 grid ${
            isWeb
              ? "grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4"
              : "grid-cols-2 gap-2.5"
          }`}
        >
          {filtered.map((card, index) => (
            <DiscoverPortraitCard
              key={card.key}
              card={card}
              index={index}
              wanted={isWanted(card.key)}
              onPreview={() => setPreview(card)}
              onToggleWant={() => toggleWant(card)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-10 text-center">
            <p className="text-sm text-[#b0a099]">{dict.discover.empty}</p>
          </div>
        )}
      </div>

      {wantChat.length > 0 && (
        <div className="fixed inset-x-0 bottom-[72px] z-40 flex justify-center px-4 sm:bottom-6">
          <button
            type="button"
            onClick={() => setShowWantTray(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#3a3330] px-4 py-3 text-[13px] font-bold text-white shadow-[0_16px_40px_-16px_rgba(58,51,48,0.7)]"
          >
            <MIcon name="favorite" className="text-[18px] text-[#ef7488]" filled />
            {dict.discover.wantChat} {wantChat.length}
            <span className="text-white/55">{dict.discover.wantChatOpen}</span>
          </button>
        </div>
      )}

      {showWantTray && (
        <WantChatTray
          items={wantChat}
          onClose={() => setShowWantTray(false)}
          onRemove={(key) => persistWant(wantChat.filter((w) => w.key !== key))}
          onClear={() => persistWant([])}
        />
      )}

      {preview && (
        <PreviewSheet
          card={preview}
          wanted={isWanted(preview.key)}
          onClose={() => setPreview(null)}
          onToggleWant={() => toggleWant(preview)}
          openers={buildOpeners(dict, preview.name, preview.tagline, preview.description)}
        />
      )}
    </div>
  );
}

function DiscoverPortraitCard({
  card,
  index,
  wanted,
  onPreview,
  onToggleWant,
}: {
  card: GridCard;
  index: number;
  wanted: boolean;
  onPreview: () => void;
  onToggleWant: () => void;
}) {
  const { dict } = useLocale();
  const cover = bustCharacterAssetCache(card.coverUrl);
  const chatsLabel = formatDiscoverCount(card.chats);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className="group relative aspect-[3/4] animate-float-up overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.08)] bg-[#f3ebe6] shadow-[0_12px_32px_-20px_rgba(120,72,54,0.55)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(120,72,54,0.6)]"
      style={{ animationDelay: `${Math.min(index, 12) * 0.03}s` }}
      onTouchStart={() => {
        longPressed.current = false;
        longPressTimer.current = setTimeout(() => {
          longPressed.current = true;
          onPreview();
        }, 420);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Link
        href={card.href}
        className="absolute inset-0"
        onClick={(e) => {
          if (longPressed.current) {
            e.preventDefault();
            longPressed.current = false;
          }
        }}
      >
        {card.source === "db" ? (
          <CharacterImage
            slug={card.slug}
            src={card.coverUrl}
            alt={card.name}
            variant="cover"
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 280px"
            className="transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Image
            src={cover}
            alt={card.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 280px"
            className="object-cover object-top transition duration-300 group-hover:scale-[1.03]"
          />
        )}
      </Link>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(42,30,26,0.88)] via-[rgba(42,30,26,0.18)] to-transparent" />

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleWant();
        }}
        className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition ${
          wanted ? "bg-[#ef7488] text-white" : "bg-black/35 text-white/90"
        }`}
        aria-label={wanted ? dict.discover.wantChatRemove : dict.discover.wantChatAdd}
      >
        <MIcon name="favorite" className="text-[17px]" filled={wanted} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
        <div className="font-display text-[14px] font-black leading-snug text-white sm:text-[15px]">
          {card.name}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-white/75">
          <MIcon name="forum" className="text-[13px]" />
          {chatsLabel}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-white/65 sm:text-[12px]">
          {card.description || card.tagline}
        </p>
      </div>

      <div className="absolute inset-x-2.5 bottom-2.5 z-10 hidden translate-y-1 gap-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPreview();
          }}
          className="pointer-events-auto flex flex-1 items-center justify-center gap-1 rounded-full border border-white/55 bg-white/90 py-2 text-[11px] font-bold text-[#5a4f48] shadow-[0_10px_22px_-14px_rgba(58,51,48,0.55)] backdrop-blur-md transition hover:bg-white"
        >
          <MIcon name="visibility" className="text-[15px] text-[#ef7488]" />
          {dict.discover.preview}
        </button>
        <Link
          href={card.chatHref}
          onClick={(e) => e.stopPropagation()}
          className="btn-primary pointer-events-auto flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-[11px] shadow-[0_10px_22px_-12px_rgba(239,116,136,0.85)]"
        >
          <MIcon name="chat" className="text-[15px] text-white" />
          {dict.discover.tryChat}
        </Link>
      </div>
    </div>
  );
}

function PreviewSheet({
  card,
  wanted,
  onClose,
  onToggleWant,
  openers,
}: {
  card: GridCard;
  wanted: boolean;
  onClose: () => void;
  onToggleWant: () => void;
  openers: string[];
}) {
  const { dict } = useLocale();
  const cover = bustCharacterAssetCache(card.coverUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label={dict.common.close}
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[86vh] w-full max-w-[420px] overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="relative aspect-[4/3] bg-[#fbf4f1]">
          <Image src={cover} alt="" fill className="object-cover object-top" sizes="420px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white"
          >
            <MIcon name="close" className="text-[18px] text-white" />
          </button>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="font-display text-xl font-black">{card.name}</div>
            <div className="mt-0.5 text-[12px] text-white/80">{card.tagline}</div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-1.5">
            {card.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="tag-pill text-[10.5px]">
                #{localizeTag(dict, tag)}
              </span>
            ))}
            <span className="ml-auto text-[11px] font-bold text-[#b0a099]">
              {formatDiscoverCount(card.chats)} {dict.discover.chats}
            </span>
          </div>

          <p className="text-[13px] leading-relaxed text-[#5a4f48]">{card.description}</p>

          <div className="rounded-[16px] bg-[#fbf4f1] p-3.5">
            <div className="mb-2 text-[11px] font-bold text-[#b0a099]">
              {dict.discover.openerTitle}
            </div>
            <div className="space-y-2">
              {openers.map((line, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-[#3a3330]">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleWant}
              className={`inline-flex items-center justify-center gap-1 rounded-full py-3 text-[13px] font-bold ${
                wanted
                  ? "bg-[#fff4f6] text-[#ef7488]"
                  : "border border-[rgba(120,72,54,0.12)] text-[#5a4f48]"
              }`}
            >
              <MIcon name="favorite" className="text-[18px]" filled={wanted} />
              {wanted ? dict.discover.wantChatAdded : dict.discover.wantChatAdd}
            </button>
            <Link
              href={card.chatHref}
              className="btn-primary inline-flex items-center justify-center gap-1 rounded-full py-3 text-[13px]"
            >
              <MIcon name="chat" className="text-[18px] text-white" />
              {dict.discover.startChat}
            </Link>
          </div>
          <Link
            href={card.href}
            className="block text-center text-[12px] font-bold text-[#8a7a72]"
          >
            {dict.discover.viewProfile}
          </Link>
        </div>
      </div>
    </div>
  );
}

function WantChatTray({
  items,
  onClose,
  onRemove,
  onClear,
}: {
  items: WantChatItem[];
  onClose: () => void;
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  const { dict, t } = useLocale();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label={dict.common.close}
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[70vh] w-full max-w-[520px] overflow-hidden rounded-t-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[rgba(120,72,54,0.07)] px-5 py-4">
          <div>
            <div className="font-display text-lg font-black text-[#3a3330]">
              {dict.discover.wantChatTrayTitle}
            </div>
            <div className="text-[12px] text-[#8a7a72]">
              {t(dict.discover.wantChatTraySub, { n: items.length })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[12px] font-bold text-[#b0a099]"
              >
                {dict.common.clear}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fbf4f1]"
            >
              <MIcon name="close" className="text-[18px]" />
            </button>
          </div>
        </div>
        <ul className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-[16px] border border-[rgba(120,72,54,0.07)] bg-[#fbf4f1] p-2.5"
            >
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-[10px]">
                <Image
                  src={bustCharacterAssetCache(item.coverUrl)}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="44px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[14px] font-black text-[#3a3330]">
                  {item.name}
                </div>
                <div className="truncate text-[11px] text-[#8a7a72]">{item.tagline}</div>
              </div>
              <Link
                href={item.chatHref}
                className="btn-primary shrink-0 rounded-full px-3 py-1.5 text-[11px]"
              >
                {dict.discover.wantChatChat}
              </Link>
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#b0a099]"
                aria-label={dict.common.remove}
              >
                <MIcon name="close" className="text-[16px]" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
