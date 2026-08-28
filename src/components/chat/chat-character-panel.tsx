import Link from "next/link";
import { parseTags } from "@/lib/utils";
import { MIcon } from "@/components/ui/m-icon";
import { AffinityBar } from "@/components/ui/affinity-bar";
import { CharacterLiveStatusPanel } from "@/components/character/character-live-status-panel";
import { mockAffinity } from "@/lib/scenes";
import type { DailyMediaItem, DayPeriod, LiveStatus } from "@/lib/character-live-status";

export type ChatCharacterPanelData = {
  slug: string;
  name: string;
  avatarUrl: string;
  coverUrl: string | null;
  tagline: string | null;
  bio: string;
  personality: string;
  tags: string;
  subscriptionPrice: number;
  subscribed: boolean;
  subscriberCount: number;
  postCount: number;
  creatorName: string;
  creatorId?: string;
  liveStatus: LiveStatus;
  dailyMedia: DailyMediaItem[];
  dayPeriod: DayPeriod;
};

type ChatCharacterPanelProps = {
  character: ChatCharacterPanelData;
  basePath?: "" | "/h5" | "/app";
};

export function ChatCharacterPanel({ character, basePath = "" }: ChatCharacterPanelProps) {
  const profileHref = `${basePath}/characters/${character.slug}`;
  const tags = parseTags(character.tags);
  const affinity = mockAffinity(character.slug);

  return (
    <div className="h-full overflow-y-auto bg-[#fbf4f1]">
      <CharacterLiveStatusPanel
        variant="sidebar"
        liveStatus={character.liveStatus}
        dailyMedia={character.dailyMedia}
        dayPeriod={character.dayPeriod}
      />

      <div className="border-t border-[rgba(120,72,54,0.08)] bg-white px-4 pb-4 pt-3">
        <h2 className="font-display text-[20px] font-black leading-tight text-[#3a3330]">
          {character.name}
        </h2>
        {character.tagline && (
          <p className="mt-0.5 text-[12px] text-[#b0a099]">{character.tagline}</p>
        )}
        <Link
          href={character.creatorId ? `/creators/${character.creatorId}` : "/studio"}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#6b7fd0] hover:text-[#ef7488]"
        >
          <MIcon name="verified" className="text-[13px]" />
          Official by {character.creatorName}
          <MIcon name="arrow_forward" className="text-[14px]" />
        </Link>

        <div className="mt-2.5">
          <AffinityBar level={affinity.level} percent={affinity.percent} compact />
        </div>

        <p className="mt-3 text-[13px] leading-[1.65] text-[#5a4f48]">{character.bio}</p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 5).map((t) => (
              <span key={t} className="tag-pill text-[10px]">
                #{t}
              </span>
            ))}
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "性格", value: character.personality.slice(0, 36) },
            { label: "推し", value: `${character.subscriberCount.toLocaleString()} 人` },
            { label: "投稿", value: `${character.postCount} 件` },
            { label: "月額", value: `¥${character.subscriptionPrice.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[12px] bg-[#fbf4f1] px-3 py-2">
              <dt className="text-[10px] text-[#b0a099]">{label}</dt>
              <dd className="mt-0.5 truncate text-[11.5px] font-bold text-[#3a3330]">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-2 pt-4">
          {!character.subscribed && (
            <Link
              href={profileHref}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-[14px] py-2.5 text-sm"
            >
              <MIcon name="favorite" className="text-[18px] text-white" />
              月額 ¥{character.subscriptionPrice.toLocaleString()} で推す
            </Link>
          )}
          <Link
            href={profileHref}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] py-2.5 text-sm font-bold text-[#5a4f48] transition hover:border-[#ef7488]/25 hover:text-[#ef7488]"
          >
            <MIcon name="person" className="text-[18px] text-[#8a7a72]" />
            プロフィールを見る
          </Link>
        </div>
      </div>
    </div>
  );
}
