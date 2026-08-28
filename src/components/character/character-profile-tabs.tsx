"use client";

import { useState, type ReactNode } from "react";
import { MIcon } from "@/components/ui/m-icon";
import { PrivateMediaPanel } from "@/components/character/private-media-panel";
import { CharacterSkillsPanel } from "@/components/character/character-skills-panel";
import type { CharacterMediaItem } from "@/lib/character-media";
import type { CharacterSkill } from "@/lib/character-skills";
import { useLocale } from "@/components/i18n/locale-provider";

export type ProfileTab = "daily" | "private" | "skills";

type CharacterProfileTabsProps = {
  dailyContent: ReactNode;
  privateMedia: CharacterMediaItem[];
  skills: CharacterSkill[];
  characterName: string;
  characterSlug: string;
  isSubscribed: boolean;
  isLoggedIn: boolean;
  subscriptionPrice: number;
  loginHref: string;
  chatHref: string;
  variant?: "web" | "mobile";
};

export function CharacterProfileTabs({
  dailyContent,
  privateMedia,
  skills,
  characterName,
  characterSlug,
  isSubscribed,
  isLoggedIn,
  subscriptionPrice,
  loginHref,
  chatHref,
  variant = "web",
}: CharacterProfileTabsProps) {
  const { dict } = useLocale();
  const [tab, setTab] = useState<ProfileTab>("daily");
  const tabs: { id: ProfileTab; icon: string; label: string }[] = [
    { id: "daily", icon: "grid_view", label: dict.character.dailyTab },
    { id: "private", icon: "lock", label: dict.character.privateTab },
    { id: "skills", icon: "auto_awesome", label: dict.character.skillsTab },
  ];

  return (
    <>
      <div
        className={
          variant === "mobile"
            ? "sticky top-0 z-20 border-y border-[rgba(120,72,54,0.08)] bg-white px-4 py-2"
            : "mt-5 inline-flex gap-1.5 rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white p-1.5 shadow-[0_10px_30px_-24px_rgba(120,72,54,0.5)]"
        }
      >
        {variant === "mobile" ? (
          <div className="flex gap-1">
            {tabs.map((t) => (
              <TabButton
                key={t.id}
                icon={t.icon}
                label={t.label}
                active={tab === t.id}
                onClick={() => setTab(t.id)}
                fullWidth
              />
            ))}
          </div>
        ) : (
          tabs.map((t) => (
            <TabButton
              key={t.id}
              icon={t.icon}
              label={t.label}
              active={tab === t.id}
              onClick={() => setTab(t.id)}
            />
          ))
        )}
      </div>

      <div className={variant === "mobile" ? "px-4 py-3.5" : "mt-6"}>
        {tab === "daily" && dailyContent}
        {tab === "private" && (
          <PrivateMediaPanel
            media={privateMedia}
            characterName={characterName}
            isSubscribed={isSubscribed}
            subscriptionPrice={subscriptionPrice}
            loginHref={loginHref}
          />
        )}
        {tab === "skills" && (
          <CharacterSkillsPanel
            skills={skills}
            characterName={characterName}
            characterSlug={characterSlug}
            isSubscribed={isSubscribed}
            isLoggedIn={isLoggedIn}
            chatHref={chatHref}
            loginHref={loginHref}
          />
        )}
      </div>
    </>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
  fullWidth,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-[13px] font-display text-sm font-bold transition ${
        fullWidth ? "flex-1 py-2.5" : "px-5 py-2"
      } ${active ? "bg-[#3a3330] text-white" : "text-[#8a7a72] hover:text-[#3a3330]"}`}
    >
      <MIcon name={icon} className="text-[19px]" />
      {label}
    </button>
  );
}
