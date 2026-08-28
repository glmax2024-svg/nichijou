export type CharacterMediaItem = {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
};

/** Local anime demo assets keyed by slug (PNG for broad browser support). */
export const CHARACTER_ANIME_ASSETS: Record<
  string,
  { avatar: string; cover: string; gallery: CharacterMediaItem[] }
> = {
  aoi: {
    avatar: "/characters/aoi/avatar.png",
    cover: "/characters/aoi/gallery-1.png",
    gallery: [
      { type: "image", url: "/characters/aoi/gallery-1.png" },
      { type: "image", url: "/characters/aoi/gallery-2.png" },
      { type: "image", url: "/characters/aoi/gallery-3.png" },
      { type: "image", url: "/characters/aoi/avatar.png" },
    ],
  },
  mio: {
    avatar: "/characters/mio/avatar.png",
    cover: "/characters/mio/gallery-1.png",
    gallery: [
      { type: "image", url: "/characters/mio/gallery-1.png" },
      { type: "image", url: "/characters/mio/gallery-2.png" },
      { type: "image", url: "/characters/mio/gallery-3.png" },
      { type: "image", url: "/characters/mio/avatar.png" },
    ],
  },
};

const FALLBACK_AVATAR = "/characters/default-avatar.png";

/** Bump after swapping assets to bust Next/Image + browser cache. */
export const CHARACTER_ASSET_VERSION = "20260709";

function isRemoteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function toLocalAsset(url: string) {
  const path = url.split("?")[0];
  if (path.endsWith(".svg")) return path.replace(/\.svg$/, ".png");
  return path;
}

export function bustCharacterAssetCache(url: string): string {
  if (!url.startsWith("/characters/")) return url;
  const [path, query] = url.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set("v", CHARACTER_ASSET_VERSION);
  return `${path}?${params.toString()}`;
}

function withCache(url: string) {
  return bustCharacterAssetCache(url);
}

export function resolveAnimeAvatar(slug: string, dbUrl?: string | null) {
  if (CHARACTER_ANIME_ASSETS[slug]) return withCache(CHARACTER_ANIME_ASSETS[slug].avatar);
  if (dbUrl && !isRemoteUrl(dbUrl)) return withCache(toLocalAsset(dbUrl));
  return withCache(FALLBACK_AVATAR);
}

export function resolveAnimeCover(slug: string, dbUrl?: string | null) {
  if (CHARACTER_ANIME_ASSETS[slug]) return withCache(CHARACTER_ANIME_ASSETS[slug].cover);
  if (dbUrl && !isRemoteUrl(dbUrl)) return withCache(toLocalAsset(dbUrl));
  return withCache(FALLBACK_AVATAR);
}

export function resolveAnimePostImage(slug: string, dbUrl?: string | null) {
  if (!dbUrl) return null;
  if (CHARACTER_ANIME_ASSETS[slug]) {
    if (isRemoteUrl(dbUrl) || dbUrl.split("?")[0].endsWith(".svg")) {
      const gallery = CHARACTER_ANIME_ASSETS[slug].gallery;
      const hash = dbUrl.length % gallery.length;
      return withCache(gallery[hash]?.url ?? CHARACTER_ANIME_ASSETS[slug].cover);
    }
    return withCache(toLocalAsset(dbUrl));
  }
  if (isRemoteUrl(dbUrl)) return null;
  return withCache(toLocalAsset(dbUrl));
}

export function getCharacterGalleryMedia(
  slug: string,
  opts?: {
    avatarUrl?: string;
    coverUrl?: string | null;
    postImages?: (string | null)[];
  },
): CharacterMediaItem[] {
  const curated = (CHARACTER_ANIME_ASSETS[slug]?.gallery ?? []).map((item) => ({
    ...item,
    url: withCache(item.url),
    posterUrl: item.posterUrl ? withCache(item.posterUrl) : undefined,
  }));
  if (curated.length > 0) return curated;

  const fromPosts: CharacterMediaItem[] = (opts?.postImages ?? [])
    .map((url) => resolveAnimePostImage(slug, url))
    .filter((u): u is string => !!u)
    .map((url) => ({ type: "image" as const, url }));

  const cover = resolveAnimeCover(slug, opts?.coverUrl);
  return fromPosts.length > 0 ? fromPosts : [{ type: "image", url: cover }];
}

/** Subscriber-only private image/video list. */
export function getCharacterPrivateMedia(slug: string): CharacterMediaItem[] {
  const assets = CHARACTER_ANIME_ASSETS[slug];
  if (!assets) {
    return [
      { type: "image", url: FALLBACK_AVATAR },
      { type: "image", url: FALLBACK_AVATAR },
    ];
  }

  const [g1, g2, g3] = assets.gallery;
  return [
    { type: "image", url: withCache(g2?.url ?? g1.url) },
    {
      type: "video",
      url: withCache(g3?.url ?? g2?.url ?? g1.url),
      posterUrl: withCache(g3?.url ?? g2?.url ?? g1.url),
    },
    { type: "image", url: withCache(g3?.url ?? g1.url) },
    { type: "image", url: withCache(assets.avatar) },
    { type: "video", url: withCache(g1.url), posterUrl: withCache(g1.url) },
    { type: "image", url: withCache(g2?.url ?? assets.cover) },
  ];
}
