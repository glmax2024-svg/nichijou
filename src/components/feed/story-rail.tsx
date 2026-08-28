import Link from "next/link";
import { CharacterImage } from "@/components/ui/character-image";

type StoryCharacter = {
  slug: string;
  name: string;
  avatarUrl: string;
  _count: { posts: number };
};

const RINGS = [
  "linear-gradient(135deg,#f79aa8,#ef7488,#f6b26b)",
  "linear-gradient(135deg,#8fb8e8,#b6a6e8)",
  "linear-gradient(135deg,#f79aa8,#ef7488)",
  "linear-gradient(135deg,#d8ccc4,#d8ccc4)",
];

export function StoryRail({
  characters,
  basePath = "",
  variant = "web",
}: {
  characters: StoryCharacter[];
  basePath?: string;
  variant?: "web" | "mobile";
}) {
  if (characters.length === 0) return null;

  const isMobile = variant === "mobile";

  return (
    <div className={isMobile ? "" : "border-b border-[rgba(120,72,54,0.06)]"}>
      <div
        className={`scrollbar-hide flex overflow-x-auto ${
          isMobile
            ? "gap-3.5 px-4 py-1.5 pb-3"
            : "gap-4 px-[22px] py-[18px] border-b border-[rgba(120,72,54,0.06)]"
        }`}
      >
        {characters.map((c, i) => (
          <Link
            key={c.slug}
            href={`${basePath}/characters/${c.slug}`}
            className={`flex shrink-0 flex-col items-center ${isMobile ? "w-[52px] gap-1" : "w-[62px] gap-1.5"}`}
          >
            <div
              className="rounded-full p-[2.5px]"
              style={{ background: RINGS[i % RINGS.length] }}
            >
              <div className={`rounded-full bg-white ${isMobile ? "p-0.5" : "p-[2.5px]"}`}>
                <div
                  className={`relative overflow-hidden rounded-full ${
                    isMobile ? "h-[52px] w-[52px]" : "h-[52px] w-[52px]"
                  }`}
                >
                  <CharacterImage slug={c.slug} src={c.avatarUrl} alt={c.name} fill sizes="52px" className="rounded-full" />
                </div>
              </div>
            </div>
            <span
              className={`truncate text-[#7a6a62] ${
                isMobile ? "max-w-[52px] text-[10.5px]" : "max-w-[60px] text-[11px] font-medium"
              }`}
            >
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
