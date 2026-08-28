"use client";

import { useEffect, useRef, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";
import type { CharacterSkill } from "@/lib/character-skills";
import { buildSkillCommand } from "@/lib/chat-skill-command";
import { useLocale } from "@/components/i18n/locale-provider";

const VISIBLE_SKILL_LIMIT = 3;
export const CHAT_MESSAGE_TEXT_CLASS = "text-[13.5px] leading-relaxed";

/** 13.5px × leading-relaxed(1.625) ≈ 21.94px per line */
const COMPOSER_LINE_HEIGHT_PX = 13.5 * 1.625;
const COMPOSER_MAX_LINES = 8;
const COMPOSER_MAX_HEIGHT_PX = COMPOSER_LINE_HEIGHT_PX * COMPOSER_MAX_LINES;

type ChatComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  skills: CharacterSkill[];
  onSelectCommand: (command: string) => void;
  onStartCall?: () => void;
  callDisabled?: boolean;
  profileHref?: string;
  disabled?: boolean;
  canSend?: boolean;
  onLockedFocus?: () => void;
  floating?: boolean;
};

function SkillPill({
  skill,
  disabled,
  onSelect,
}: {
  skill: CharacterSkill;
  disabled?: boolean;
  onSelect: (command: string) => void;
}) {
  const isTarot = skill.skillType === "tarot";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(buildSkillCommand(skill))}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-bold transition disabled:opacity-50 ${
        isTarot
          ? "border-[#c9a227]/30 bg-[#fff9eb] text-[#8a6d1a] hover:border-[#c9a227]/50"
          : "border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] text-[#5a4f48] hover:border-[#ef7488]/30 hover:text-[#ef7488]"
      }`}
    >
      <MIcon
        name={skill.icon}
        className={`text-[13px] ${isTarot ? "text-[#c9a227]" : "text-[#ef7488]"}`}
      />
      <span className="max-w-[5.5rem] truncate">{skill.name}</span>
      {skill.demoFree && (
        <span className="rounded-full bg-[#eafaf1] px-1 py-px text-[8px] font-bold text-[#3fae76]">
          試用
        </span>
      )}
    </button>
  );
}

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  skills,
  onSelectCommand,
  onStartCall,
  callDisabled,
  disabled,
  canSend = true,
  onLockedFocus,
  floating = true,
}: ChatComposerProps) {
  const { dict } = useLocale();
  const quickSkills = skills.filter((s) => s.id !== "daily-chat" && s.skillType !== "call");
  const visibleSkills = quickSkills.slice(0, VISIBLE_SKILL_LIMIT);
  const overflowSkills = quickSkills.slice(VISIBLE_SKILL_LIMIT);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [input]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || disabled) return;
      onSubmit(e as unknown as React.FormEvent);
    }
  }

  function selectSkill(command: string) {
    onSelectCommand(command);
    setMenuOpen(false);
  }

  const sendButton = (
    <button
      type="submit"
      disabled={disabled || !input.trim()}
      className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
    >
      <MIcon name="send" className="text-[17px] text-white" />
    </button>
  );

  const form = (
    <form
      onSubmit={onSubmit}
      className="rounded-[22px] border border-[rgba(120,72,54,0.1)] bg-white px-3 py-2 shadow-[0_8px_28px_-12px_rgba(120,72,54,0.22)]"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder={canSend ? "メッセージを入力…" : "推し登録でメッセージを続ける"}
        disabled={disabled}
        onFocus={() => {
          if (!canSend) onLockedFocus?.();
        }}
        className={`w-full resize-none overflow-y-hidden bg-transparent py-0.5 ${CHAT_MESSAGE_TEXT_CLASS} text-[#3a3330] outline-none placeholder:text-[#b0a099] disabled:opacity-60`}
        style={{
          minHeight: `${COMPOSER_LINE_HEIGHT_PX}px`,
          maxHeight: `${COMPOSER_MAX_HEIGHT_PX}px`,
        }}
      />

      <div className="mt-1.5 flex items-center gap-2">
        {onStartCall && (
          <button
            type="button"
            disabled={disabled || callDisabled}
            onClick={onStartCall}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3fae76]/35 bg-[#eafaf1] text-[#3fae76] transition hover:border-[#3fae76]/55 hover:bg-[#dff5ea] disabled:opacity-50"
            aria-label={dict.chatUi.voiceCall}
          >
            <MIcon name="call" className="text-[17px]" />
          </button>
        )}
        {quickSkills.length > 0 ? (
          <>
            <MIcon name="auto_awesome" className="shrink-0 text-[12px] text-[#ef7488]" />
            <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
              {visibleSkills.map((skill) => (
                <SkillPill
                  key={skill.id}
                  skill={skill}
                  disabled={disabled}
                  onSelect={selectSkill}
                />
              ))}
              {overflowSkills.length > 0 && (
                <div ref={menuRef} className="relative shrink-0">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] text-[#8a7a72] transition hover:border-[#ef7488]/30 hover:text-[#ef7488] disabled:opacity-50"
                    aria-label="その他のスキル"
                    aria-expanded={menuOpen}
                  >
                    <MIcon name="more_horiz" className="text-[16px]" />
                  </button>
                  {menuOpen && (
                    <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 min-w-[148px] rounded-[14px] border border-[rgba(120,72,54,0.1)] bg-white py-1 shadow-[0_8px_24px_-8px_rgba(120,72,54,0.25)]">
                      {overflowSkills.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => selectSkill(buildSkillCommand(skill))}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-[#5a4f48] transition hover:bg-[#fbf4f1] disabled:opacity-50"
                        >
                          <MIcon
                            name={skill.icon}
                            className={`text-[14px] ${skill.skillType === "tarot" ? "text-[#c9a227]" : "text-[#ef7488]"}`}
                          />
                          <span className="min-w-0 flex-1 truncate">{skill.name}</span>
                          {skill.demoFree && (
                            <span className="shrink-0 rounded-full bg-[#eafaf1] px-1.5 py-0.5 text-[8px] font-bold text-[#3fae76]">
                              試用
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1" />
        )}
        {sendButton}
      </div>
    </form>
  );

  if (!floating) {
    return <div className="shrink-0 border-t border-[rgba(120,72,54,0.07)] bg-transparent p-2.5">{form}</div>;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-transparent px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2">
      <div className="pointer-events-auto mx-auto max-w-2xl">{form}</div>
    </div>
  );
}
