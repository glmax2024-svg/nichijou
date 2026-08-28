import Image from "next/image";
import {
  resolveAnimeAvatar,
  resolveAnimeCover,
  resolveAnimePostImage,
} from "@/lib/character-media";

type CharacterImageProps = {
  slug: string;
  src?: string | null;
  alt: string;
  variant?: "avatar" | "cover" | "post";
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

function resolveUrl(
  slug: string,
  src: string | null | undefined,
  variant: "avatar" | "cover" | "post",
) {
  if (variant === "cover") return resolveAnimeCover(slug, src);
  if (variant === "post") return resolveAnimePostImage(slug, src) ?? resolveAnimeCover(slug, src);
  return resolveAnimeAvatar(slug, src);
}

export function CharacterImage({
  slug,
  src,
  alt,
  variant = "avatar",
  width,
  height,
  fill,
  className = "",
  sizes,
  priority,
}: CharacterImageProps) {
  const url = resolveUrl(slug, src, variant);
  const path = url.split("?")[0];

  if (path.endsWith(".svg")) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className={`absolute inset-0 h-full w-full object-cover object-top ${className}`} />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        width={width}
        height={height}
        className={`object-cover object-top ${className}`}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        className={`object-cover object-top ${className}`}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={width ?? 48}
      height={height ?? 48}
      className={`object-cover object-top ${className}`}
      priority={priority}
    />
  );
}
