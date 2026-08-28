"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { TarotGame } from "@/components/skills/tarot-game";
import { VoiceCallOverlay } from "@/components/skills/voice-call-overlay";
import { ChatComposer, CHAT_MESSAGE_TEXT_CLASS } from "@/components/chat/chat-composer";
import { SubscriptionModal } from "@/components/subscriptions/subscription-modal";
import type { ChatAccess } from "@/lib/chat-quota";
import { canUseSkill, type CharacterSkill } from "@/lib/character-skills";
import { buildSkillCommand, parseSkillCommand } from "@/lib/chat-skill-command";
import { getSkillReplyOrFallback } from "@/lib/chat-skill-replies";
import { buildPostContextBanner, type PostContext } from "@/lib/chat-greeting";
import { isCallSkill, formatCallDuration } from "@/lib/skills/call";
import { isTarotSkill } from "@/lib/skills/tarot";
import type { DrawnTarotCard } from "@/lib/skills/tarot";
import { useLocale } from "@/components/i18n/locale-provider";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  isAiGenerated: boolean;
  createdAt: string;
};

type ChatThreadProps = {
  characterId: string;
  characterSlug: string;
  characterName: string;
  characterAvatar?: string;
  initialMessages: ChatMessage[];
  chatAccess: ChatAccess;
  subscriptionPrice: number;
  skills?: CharacterSkill[];
  activeSkill?: string | null;
  variant?: "embedded" | "page";
  layout?: "default" | "workspace";
  hideHeader?: boolean;
  memoryHints?: string[];
  postContext?: PostContext | null;
  initialGreeting?: string | null;
};

function buildInitialMessages(
  initialMessages: ChatMessage[],
  initialGreeting?: string | null,
): ChatMessage[] {
  if (initialMessages.length > 0 || !initialGreeting) return initialMessages;
  return [
    {
      id: "greeting-demo",
      role: "assistant",
      content: initialGreeting,
      isAiGenerated: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function ChatThread({
  characterId,
  characterSlug,
  characterName,
  characterAvatar,
  initialMessages,
  chatAccess: initialAccess,
  subscriptionPrice,
  skills = [],
  activeSkill,
  variant = "embedded",
  layout = "default",
  hideHeader = false,
  memoryHints = [],
  postContext = null,
  initialGreeting = null,
}: ChatThreadProps) {
  const { dict, t } = useLocale();
  const [messages, setMessages] = useState(() =>
    buildInitialMessages(initialMessages, initialGreeting),
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatAccess, setChatAccess] = useState(initialAccess);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [tarotLoading, setTarotLoading] = useState(false);
  const [showTarotGame, setShowTarotGame] = useState(
    () =>
      isTarotSkill(activeSkill) &&
      !initialMessages.some((m) => m.content.includes("タロット占い")),
  );
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const isPage = variant === "page";
  const isWorkspace = layout === "workspace";

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(
    buildInitialMessages(initialMessages, initialGreeting).length,
  );
  const didInitScrollRef = useRef(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const SCROLL_THRESHOLD = 56;

  const isAtBottom = useCallback((el: HTMLElement) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    pinnedToBottomRef.current = true;
    setNewMessageCount(0);
  }, []);

  const pinToBottom = useCallback(() => {
    pinnedToBottomRef.current = true;
    setNewMessageCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = isAtBottom(el);
    pinnedToBottomRef.current = atBottom;
    if (atBottom) setNewMessageCount(0);
  }, [isAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const current = messages.length;
    prevMessageCountRef.current = current;

    if (!didInitScrollRef.current) {
      didInitScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    const delta = current - prev;

    if (pinnedToBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } else if (delta > 0) {
      setNewMessageCount((count) => count + delta);
    }
  }, [messages, showTarotGame, scrollToBottom]);

  useEffect(() => {
    if (!didInitScrollRef.current) return;
    if (pinnedToBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [loading, scrollToBottom]);

  function openSubscribeModal() {
    setShowSubscribeModal(true);
  }

  function getCallSkill() {
    return skills.find((s) => s.skillType === "call" || isCallSkill(s.id));
  }

  function canUseCallSkill() {
    const callSkill = getCallSkill();
    if (!callSkill) return false;
    return canUseSkill(callSkill, {
      isSubscribed: chatAccess.isSubscribed,
      isLoggedIn: true,
    });
  }

  function startVoiceCall() {
    if (!chatAccess.canSend) {
      openSubscribeModal();
      return;
    }
    const callSkill = getCallSkill();
    if (!callSkill) return;
    if (!canUseCallSkill()) {
      openSubscribeModal();
      return;
    }
    invokeSkill(callSkill, buildSkillCommand(callSkill));
  }

  function handleCallEnd(durationSec: number) {
    setShowVoiceCall(false);
    const label = formatCallDuration(durationSec);
    setMessages((prev) => [
      ...prev,
      {
        id: `call-end-${Date.now()}`,
        role: "assistant",
        content:
          durationSec > 0
            ? `${characterName}：通话结束啦～ 今天聊了 ${label}，下次再打来哦。`
            : t(dict.chat.missedCall, { name: characterName }),
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    pinToBottom();
  }

  function invokeSkill(skill: CharacterSkill, commandText: string) {
    const userMsg: ChatMessage = {
      id: `skill-${Date.now()}`,
      role: "user",
      content: commandText,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    pinToBottom();

    if (skill.skillType === "tarot" || isTarotSkill(skill.id)) {
      setShowTarotGame(true);
      return;
    }

    if (skill.skillType === "call" || isCallSkill(skill.id)) {
      setShowVoiceCall(true);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `skill-reply-${Date.now()}`,
        role: "assistant",
        content: getSkillReplyOrFallback(
          characterSlug,
          skill.id,
          skill.name,
          characterName,
        ),
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!chatAccess.canSend) {
      openSubscribeModal();
      return;
    }

    const userText = input.trim();
    const matchedSkill = parseSkillCommand(userText, skills);

    if (matchedSkill) {
      const allowed = canUseSkill(matchedSkill, {
        isSubscribed: chatAccess.isSubscribed,
        isLoggedIn: true,
      });
      if (!allowed) {
        openSubscribeModal();
        return;
      }
      setInput("");
      invokeSkill(matchedSkill, userText);
      return;
    }

    setInput("");
    setLoading(true);
    pinToBottom();

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userText,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, message: userText }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DAILY_LIMIT") {
          setChatAccess((prev) => ({
            ...prev,
            canSend: false,
            remaining: 0,
            used: data.used ?? prev.limit,
          }));
          openSubscribeModal();
          throw new Error(data.error);
        }
        throw new Error(data.error ?? "送信に失敗しました");
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.userMessage,
        data.assistantMessage,
      ]);

      if (!chatAccess.isSubscribed && !chatAccess.isCreator) {
        setChatAccess((prev) => {
          const used = prev.used + 1;
          const remaining = Math.max(0, prev.limit - used);
          return { ...prev, used, remaining, canSend: remaining > 0 };
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      if (!(err instanceof Error && err.message.includes("上限"))) {
        alert(err instanceof Error ? err.message : "エラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTarotReading(cards: DrawnTarotCard[], question: string) {
    if (!chatAccess.canSend) {
      openSubscribeModal();
      return;
    }

    setTarotLoading(true);
    pinToBottom();
    try {
      const res = await fetch("/api/skills/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, cards, question }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DAILY_LIMIT") {
          setChatAccess((prev) => ({
            ...prev,
            canSend: false,
            remaining: 0,
            used: data.used ?? prev.limit,
          }));
          openSubscribeModal();
          return;
        }
        throw new Error(data.error ?? "占いに失敗しました");
      }

      setMessages((prev) => [
        ...prev,
        {
          ...data.userMessage,
          createdAt: data.userMessage.createdAt,
        },
        {
          ...data.assistantMessage,
          createdAt: data.assistantMessage.createdAt,
        },
      ]);
      setShowTarotGame(false);

      if (!chatAccess.isSubscribed && !chatAccess.isCreator) {
        setChatAccess((prev) => {
          const used = prev.used + 1;
          const remaining = Math.max(0, prev.limit - used);
          return { ...prev, used, remaining, canSend: remaining > 0 };
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setTarotLoading(false);
    }
  }

  const memoryBanner =
    memoryHints.length > 0 ? (
      <div className="shrink-0 border-b border-[rgba(107,127,208,0.15)] bg-[#eef1ff] px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#6b7fd0]">
          <MIcon name="psychology" className="text-[16px]" />
          {characterName} 记得你
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {memoryHints.map((hint) => (
            <span
              key={hint}
              className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#5a4f48]"
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    ) : null;

  const skillBanner = isTarotSkill(activeSkill) && (
    <div className="shrink-0 border-b border-[#c9a227]/15 bg-[#120822] px-4 py-2">
      <p className="flex items-center justify-center gap-2 text-[12px] font-bold tracking-wide text-[#e8d5a3]">
        <span className="text-[#c9a227]">✦</span>
        时间流牌阵 · 塔罗占卜
        <span className="text-[#c9a227]">✦</span>
      </p>
    </div>
  );

  const postBanner = postContext ? (
    <div className="shrink-0 border-b border-[rgba(239,116,136,0.12)] bg-[#fff4f6] px-4 py-2">
      <p className="text-center text-[11.5px] text-[#8a7a72]">
        {buildPostContextBanner(postContext, characterName)}
      </p>
    </div>
  ) : null;

  const header = (
    <div
      className={`flex shrink-0 items-center gap-2.5 border-b border-[rgba(239,116,136,0.12)] px-4 py-3 ${
        isPage ? "bg-white" : ""
      }`}
      style={isPage ? undefined : { background: "linear-gradient(120deg,#fff2f0,#ffe6ea)" }}
    >
      <div className="relative">
        {characterAvatar ? (
          <Image
            src={characterAvatar}
            alt={characterName}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#ffe4e8]" />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#4ec97a]" />
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <div className="font-display text-[15px] font-bold">{characterName}</div>
        <div className="text-[11.5px] font-bold text-[#3fae76]">オンライン · すぐ返事するね</div>
      </div>
      {!isPage && <MIcon name="call" className="text-[22px] text-[#ef7488]" />}
    </div>
  );

  const quotaBanner =
    !chatAccess.isSubscribed && !chatAccess.isCreator ? (
      <div className="shrink-0 border-b border-[rgba(239,116,136,0.12)] bg-[#fff4f6] px-4 py-2">
        {chatAccess.remaining > 0 ? (
          <p className="text-center text-[12px] text-[#8a7a72]">
            本日の無料メッセージ{" "}
            <span className="font-bold text-[#ef7488]">
              残り {chatAccess.remaining} / {chatAccess.limit}
            </span>
            通
          </p>
        ) : (
          <button
            type="button"
            onClick={openSubscribeModal}
            className="flex w-full items-center justify-center gap-1.5 text-[12.5px] font-bold text-[#ef7488]"
          >
            <MIcon name="lock" className="text-[16px]" />
            本日の無料枠を使い切りました · 推し登録で無制限
          </button>
        )}
      </div>
    ) : null;

  const messagesArea = (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        className={`flex h-full flex-col gap-2.5 overflow-y-auto p-4 pb-28 ${
          isPage ? "bg-[#fbf4f1]" : ""
        }`}
        style={isPage ? undefined : { background: "linear-gradient(180deg,#fffaf8,#fff)" }}
      >
        {messages.length === 0 && !showTarotGame && !initialGreeting && (
          <p className="py-8 text-center text-sm text-[#b0a099]">最初の一言を送ってみよう</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" && isWorkspace && characterAvatar && (
              <img
                src={characterAvatar}
                alt=""
                className="mt-1 h-8 w-8 shrink-0 rounded-full object-cover"
              />
            )}
            <div
              className={`max-w-[72%] px-3.5 py-2.5 ${CHAT_MESSAGE_TEXT_CLASS} ${
                msg.role === "user"
                  ? "rounded-[18px_18px_6px_18px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488] text-white"
                  : "rounded-[18px_18px_18px_6px] bg-white text-[#463d38] shadow-[0_2px_8px_-4px_rgba(120,72,54,0.15)]"
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        {showTarotGame && (
          <div className="flex justify-center py-2">
            <TarotGame
              characterName={characterName}
              onReading={handleTarotReading}
              loading={tarotLoading}
            />
          </div>
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-[18px] bg-white px-4 py-3 shadow-[0_2px_8px_-4px_rgba(120,72,54,0.15)]">
              {[0, 0.2, 0.4].map((delay) => (
                <span
                  key={delay}
                  className="h-[7px] w-[7px] rounded-full bg-[#c9a89a]"
                  style={{ animation: `typing 1.2s infinite ${delay}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
      </div>

      {newMessageCount > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[rgba(120,72,54,0.1)] bg-white px-4 py-2 text-[12px] font-bold text-[#ef7488] shadow-[0_4px_16px_-4px_rgba(120,72,54,0.22)] transition hover:bg-[#fff4f6]"
        >
          <MIcon name="expand_more" className="text-[18px]" />
          {newMessageCount} 条新消息
        </button>
      )}
    </div>
  );

  const handleSelectSkillCommand = (command: string) => {
    if (!chatAccess.canSend) {
      openSubscribeModal();
      return;
    }
    setInput(command);
  };

  const composer = (
    <ChatComposer
      input={input}
      onInputChange={setInput}
      onSubmit={sendMessage}
      skills={skills}
      onSelectCommand={handleSelectSkillCommand}
      onStartCall={getCallSkill() ? startVoiceCall : undefined}
      callDisabled={!canUseCallSkill()}
      disabled={loading || showVoiceCall}
      canSend={chatAccess.canSend}
      onLockedFocus={openSubscribeModal}
      floating={isPage || isWorkspace}
    />
  );

  const modal = characterAvatar && (
    <SubscriptionModal
      open={showSubscribeModal}
      onClose={() => setShowSubscribeModal(false)}
      characterId={characterId}
      characterName={characterName}
      characterAvatar={characterAvatar}
      subscriptionPrice={subscriptionPrice}
      onSubscribed={() => {
        setChatAccess({
          canSend: true,
          isSubscribed: true,
          isCreator: false,
          used: 0,
          limit: chatAccess.limit,
          remaining: chatAccess.limit,
        });
      }}
    />
  );

  if (isPage) {
    return (
      <>
        <div className="relative flex min-h-0 flex-1 flex-col">
          {!hideHeader && header}
          {memoryBanner}
          {postBanner}
          {skillBanner}
          {quotaBanner}
          {messagesArea}
          {composer}
        </div>
        {characterAvatar && (
          <VoiceCallOverlay
            open={showVoiceCall}
            characterName={characterName}
            characterAvatar={characterAvatar}
            onClose={handleCallEnd}
          />
        )}
        {modal}
      </>
    );
  }

  return (
    <>
      <div className="card relative flex h-[380px] flex-col overflow-hidden">
        {header}
        {memoryBanner}
        {postBanner}
        {skillBanner}
        {quotaBanner}
        {messagesArea}
        {composer}
      </div>
      {characterAvatar && (
        <VoiceCallOverlay
          open={showVoiceCall}
          characterName={characterName}
          characterAvatar={characterAvatar}
          onClose={handleCallEnd}
        />
      )}
      {modal}
    </>
  );
}
