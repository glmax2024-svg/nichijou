import Image from "next/image";
import { resolveAnimeAvatar } from "@/lib/character-media";

type CharacterAvatarProps = {
  slug: string;
  src: string;
  alt: string;
  size?: number;
  className?: string;
  rounded?: "full" | "2xl" | "xl" | "none";
};

const roundedClass = {
  full: "rounded-full",
  "2xl": "rounded-2xl",
  xl: "rounded-xl",
  none: "",
};

export function CharacterAvatar({
  slug,
  src,
  alt,
  size = 48,
  className = "",
  rounded = "full",
}: CharacterAvatarProps) {
  const url = resolveAnimeAvatar(slug, src);
  const isSvg = url.split("?")[0].endsWith(".svg");

  if (isSvg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        width={size}
        height={size}
        className={`object-cover object-top ${roundedClass[rounded]} ${className}`}
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      width={size}
      height={size}
      className={`object-cover object-top ${roundedClass[rounded]} ${className}`}
    />
  );
}
