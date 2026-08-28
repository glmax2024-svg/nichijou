"use client";

import Link from "next/link";
import type { CharacterSkill } from "@/lib/character-skills";
import { canUseSkill } from "@/lib/character-skills";
import { MIcon } from "@/components/ui/m-icon";

type CharacterSkillsPanelProps = {
  skills: CharacterSkill[];
  characterName: string;
  characterSlug: string;
  isSubscribed: boolean;
  isLoggedIn: boolean;
  chatHref: string;
  loginHref: string;
};

export function CharacterSkillsPanel({
  skills,
  characterName,
  characterSlug,
  isSubscribed,
  isLoggedIn,
  chatHref,
  loginHref,
}: CharacterSkillsPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-[#8a7a72]">
        {characterName}の Agent に搭載されたスキル。チャットや有料オプションで利用できます。
      </p>

      {skills.map((skill) => {
        const allowed = canUseSkill(skill, { isSubscribed, isLoggedIn });
        const href = allowed ? `${chatHref}?skill=${skill.id}` : loginHref;

        return (
          <div
            key={skill.id}
            className="flex gap-3.5 rounded-[20px] border border-[rgba(120,72,54,0.07)] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(120,72,54,0.35)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff4f6] to-[#eef1ff]">
              <MIcon name={skill.icon} className="text-[26px] text-[#ef7488]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[15px] font-bold text-[#3a3330]">
                  {skill.name}
                </h3>
                {skill.demoFree ? (
                  <span className="rounded-full bg-[#f2ecff] px-2 py-0.5 text-[10px] font-bold text-[#8b76d4]">
                    無料デモ
                  </span>
                ) : skill.includedInSubscription ? (
                  <span className="rounded-full bg-[#eafaf1] px-2 py-0.5 text-[10px] font-bold text-[#3fae76]">
                    推し込み
                  </span>
                ) : skill.priceFrom ? (
                  <span className="rounded-full bg-[#fff6e6] px-2 py-0.5 text-[10px] font-bold text-[#b8862e]">
                    ¥{skill.priceFrom}〜
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#8a7a72]">
                {skill.description}
              </p>
              <Link
                href={href}
                className={`mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-bold ${
                  allowed ? "text-[#ef7488] hover:underline" : "text-[#b0a099]"
                }`}
              >
                {allowed ? (
                  <>
                    使ってみる
                    <MIcon name="arrow_forward" className="text-[16px]" />
                  </>
                ) : skill.includedInSubscription ? (
                  <>推し登録で利用可能</>
                ) : (
                  <>ログインして利用</>
                )}
              </Link>
            </div>
          </div>
        );
      })}

      <p className="pt-1 text-center text-[11.5px] text-[#b0a099]">
        クリエイターは Studio から @{characterSlug} のスキルを追加・編集できます
      </p>
    </div>
  );
}
