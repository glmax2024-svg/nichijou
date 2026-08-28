import Image from "next/image";
import { resolveAnimeCover } from "@/lib/character-media";

type ProfileCoverProps = {
  slug: string;
  coverUrl?: string | null;
  variant?: "web" | "mobile";
};

export function ProfileCover({ slug, coverUrl, variant = "web" }: ProfileCoverProps) {
  const height = variant === "mobile" ? "h-[150px]" : "h-[180px]";
  const src = resolveAnimeCover(slug, coverUrl);

  return (
    <div className={`relative overflow-hidden ${height}`}>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover object-top"
        sizes={variant === "mobile" ? "100vw" : "1080px"}
        priority
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            variant === "mobile"
              ? "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(251,242,238,0.55) 100%)"
              : "linear-gradient(180deg, transparent 40%, rgba(255,255,255,0.92) 100%)",
        }}
      />
      <span className="petal absolute left-[20%] -top-1.5" style={{ animationDelay: "0s" }} />
      <span className="petal absolute left-1/2 -top-1.5" style={{ animationDelay: "1s" }} />
      <span className="petal absolute left-[75%] -top-1.5" style={{ animationDelay: "0.4s" }} />
    </div>
  );
}
