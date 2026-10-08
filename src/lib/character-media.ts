export type CharacterMediaItem = {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
};

const FALLBACK_AVATAR = "/characters/default-avatar.png";

/** Bump after swapping assets to bust Next/Image + browser cache. */
export const CHARACTER_ASSET_VERSION = "20260709";

function isRemoteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

/** 客户端组件也会用到这里，所以用 NEXT_PUBLIC_ 前缀（构建时内联）。值与 S3_PUBLIC_BASE_URL 相同。 */
const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");

/** 自己对象存储里的图可以直接用；其他远程地址（旧种子数据的外链）仍然不信任。 */
function isOwnStorageUrl(url: string) {
  return Boolean(MEDIA_BASE_URL) && url.startsWith(`${MEDIA_BASE_URL}/`);
}

function usableDbUrl(url: string | null | undefined): url is string {
  return Boolean(url) && (!isRemoteUrl(url!) || isOwnStorageUrl(url!));
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
  if (usableDbUrl(dbUrl)) return isRemoteUrl(dbUrl) ? dbUrl : withCache(toLocalAsset(dbUrl));
  return withCache(FALLBACK_AVATAR);
}

export function resolveAnimeCover(slug: string, dbUrl?: string | null) {
  if (usableDbUrl(dbUrl)) return isRemoteUrl(dbUrl) ? dbUrl : withCache(toLocalAsset(dbUrl));
  return withCache(FALLBACK_AVATAR);
}

export function resolveAnimePostImage(slug: string, dbUrl?: string | null) {
  if (!dbUrl) return null;
  if (isOwnStorageUrl(dbUrl)) return dbUrl;
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
  const fromPosts: CharacterMediaItem[] = (opts?.postImages ?? [])
    .map((url) => resolveAnimePostImage(slug, url))
    .filter((u): u is string => !!u)
    .map((url) => ({ type: "image" as const, url }));

  const cover = resolveAnimeCover(slug, opts?.coverUrl);
  return fromPosts.length > 0 ? fromPosts : [{ type: "image", url: cover }];
}
