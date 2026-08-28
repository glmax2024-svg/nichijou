"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type GenerationItem = {
  id: string;
  imageUrl: string | null;
  textContent: string | null;
  prompt: string;
};

type ChatTurn =
  | { id: string; role: "user"; prompt: string }
  | { id: string; role: "assistant"; item: GenerationItem; published?: boolean };

const DEFAULT_SCENE = "after school cafe, warm sunset light, soft smile, upper body";

export function LoraGeneratePanel({
  characterId,
  characterName,
  preferredTrigger,
  preferredLoraName,
  preferredCoverUrl,
}: {
  characterId: string;
  characterName: string;
  preferredTrigger?: string | null;
  preferredLoraName?: string | null;
  preferredCoverUrl?: string | null;
}) {
  const { dict } = useLocale();
  const [loraReady, setLoraReady] = useState(false);
  const [defaultTrigger, setDefaultTrigger] = useState<string | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<string>("");
  const [loraName, setLoraName] = useState("LoRA");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState(DEFAULT_SCENE);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ai/lora?characterId=${characterId}`);
    if (!res.ok) return;
    const data = await res.json();
    setLoraReady(data.loraStatus === "READY");
    const trigger =
      data.activeJob?.triggerWord ?? data.loraJobs?.[0]?.triggerWord ?? null;
    setDefaultTrigger(trigger);
  }, [characterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const trigger = preferredTrigger || defaultTrigger || "";
    setActiveTrigger(trigger);
    setLoraName(preferredLoraName || `${characterName} · Official LoRA`);
    setCoverUrl(preferredCoverUrl || null);
    if (preferredTrigger || preferredLoraName) {
      setScenePrompt(DEFAULT_SCENE);
      // Focus input when entering from the library
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [preferredTrigger, preferredLoraName, preferredCoverUrl, defaultTrigger, characterName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function generate() {
    if (!scenePrompt.trim()) return;
    const trigger = (activeTrigger || preferredTrigger || "lora").trim();
    const fullPrompt = `${trigger}, ${scenePrompt.trim()}`;
    const userTurnId = `u-${Date.now()}`;
    setTurns((prev) => [...prev, { id: userTurnId, role: "user", prompt: fullPrompt }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/lora/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          prompt: fullPrompt,
          weight: 0.85,
          steps: 28,
          batch: 1,
          // Demo / official picks from the library can use studio demo generation
          allowDemo: true,
          coverUrl: coverUrl || preferredCoverUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.studio.genFailed);
      const item = (data.items?.[0] ?? null) as GenerationItem | null;
      if (!item) throw new Error(dict.studio.noResult);
      setTurns((prev) => [
        ...prev,
        { id: `a-${item.id}`, role: "assistant", item, published: false },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.studio.genFailed);
    } finally {
      setLoading(false);
    }
  }

  async function publishAsPost(item: GenerationItem, turnId: string) {
    setPublishingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          content:
            item.textContent ??
            `${characterName}の今日。#${activeTrigger || "lora"}`,
          imageUrl: item.imageUrl,
          isAiAssisted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.studio.postFailed);
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId && turn.role === "assistant"
            ? { ...turn, published: true }
            : turn,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.studio.postFailed);
    } finally {
      setPublishingId(null);
    }
  }

  const hasSelectedLora = Boolean(preferredTrigger || preferredLoraName);
  const canChat = loraReady || hasSelectedLora;

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && scenePrompt.trim() && activeTrigger.trim()) void generate();
    }
  }

  // When picking "use for generate" from the library, skip waiting for READY polling
  if (!canChat) {
    return (
      <div className="rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white p-8 text-center shadow-sm">
        <MIcon name="auto_awesome" className="mx-auto text-[36px] text-[#ef7488]/50" />
        <h2 className="mt-3 font-display text-lg font-black text-[#3a3330]">
          {dict.studio.pickLoraTitle}
        </h2>
        <p className="mt-2 text-sm text-[#8a7a72]">{dict.studio.pickLoraHint}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[min(720px,78vh)] flex-col overflow-hidden rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_20px_50px_-36px_rgba(120,72,54,0.45)]">
      {/* header — currently selected LoRA */}
      <div
        className="flex items-center gap-3 border-b border-[rgba(120,72,54,0.07)] px-4 py-3.5 sm:px-5"
        style={{ background: "linear-gradient(135deg,#eef1ff 0%,#fff 55%,#fff4f6 100%)" }}
      >
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[14px] bg-[#fbf4f1]">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill className="object-cover object-top" sizes="44px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <MIcon name="auto_awesome" className="text-[22px] text-[#8b76d4]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-black text-[#3a3330]">
            {loraName}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#ef7488]">
              #{activeTrigger || "trigger"}
            </span>
            <span className="text-[11px] text-[#b0a099]">{dict.studio.loraLoaded}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#eafaf1] px-2.5 py-1 text-[10px] font-bold text-[#3fae76]">
          {hasSelectedLora ? "SELECTED" : "READY"}
        </span>
      </div>

      {/* chat messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fbf8f6] px-4 py-4 sm:px-5">
        {turns.length === 0 && (
          <div className="mx-auto max-w-[360px] py-10 text-center">
            <MIcon name="chat" className="mx-auto text-[32px] text-[#ef7488]/45" />
            <p className="mt-3 text-sm font-bold text-[#3a3330]">{dict.studio.describeScene}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#8a7a72]">
              Trigger <span className="font-bold text-[#ef7488]">#{activeTrigger}</span>{" "}
              {dict.studio.describeHint}
            </p>
          </div>
        )}

        {turns.map((turn) => {
          if (turn.role === "user") {
            return (
              <div key={turn.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-[18px] rounded-br-[6px] bg-[#ef7488] px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
                  {turn.prompt}
                </div>
              </div>
            );
          }

          const { item, published } = turn;
          return (
            <div key={turn.id} className="flex justify-start gap-2.5">
              <div className="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#eef1ff]">
                {coverUrl ? (
                  <Image src={coverUrl} alt="" fill className="object-cover" sizes="32px" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <MIcon name="face" className="text-[18px] text-[#6b7fd0]" />
                  </div>
                )}
              </div>
              <div className="max-w-[88%] overflow-hidden rounded-[18px] rounded-bl-[6px] border border-[rgba(120,72,54,0.07)] bg-white shadow-sm">
                {item.imageUrl && (
                  <div className="relative aspect-[3/4] max-h-[360px] w-full min-w-[220px] bg-[#fbf4f1] sm:w-[260px]">
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover object-top"
                      sizes="280px"
                    />
                  </div>
                )}
                <div className="space-y-3 p-3.5">
                  {item.textContent && (
                    <p className="text-[13px] leading-relaxed text-[#3a3330]">{item.textContent}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={published || publishingId === item.id}
                      onClick={() => void publishAsPost(item, turn.id)}
                      className={`inline-flex items-center gap-1 rounded-[12px] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60 ${
                        published ? "bg-[#3fae76]" : "bg-[#3a3330]"
                      }`}
                    >
                      <MIcon
                        name={published ? "check_circle" : "send"}
                        className="text-[16px] text-white"
                      />
                      {published
                        ? dict.studio.published
                        : publishingId === item.id
                          ? dict.studio.publishing
                          : dict.studio.publishToFeed}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#8a7a72]">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#ef7488]" />
            {dict.studio.generating}
          </div>
        )}

        {error && (
          <p className="rounded-[12px] bg-[#fdecec] px-3 py-2 text-[12px] font-bold text-[#d46565]">
            {error}
          </p>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-[rgba(120,72,54,0.07)] bg-white px-3 py-3 sm:px-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-[#b0a099]">Trigger</span>
          <input
            value={activeTrigger}
            onChange={(e) =>
              setActiveTrigger(e.target.value.replace(/\s+/g, "_").toLowerCase())
            }
            className="rounded-full border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-3 py-1 text-[12px] font-bold text-[#ef7488] outline-none focus:border-[#ef7488]/40"
            placeholder="trigger_word"
          />
        </div>
        <div className="flex items-end gap-2 rounded-[18px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] p-2 focus-within:border-[#ef7488]/35">
          <textarea
            ref={inputRef}
            value={scenePrompt}
            onChange={(e) => setScenePrompt(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={dict.studio.promptPlaceholder}
            className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[#3a3330] outline-none"
          />
          <button
            type="button"
            disabled={loading || !scenePrompt.trim() || !(activeTrigger || preferredTrigger)}
            onClick={() => void generate()}
            className="btn-primary inline-flex h-10 shrink-0 items-center gap-1 rounded-[14px] px-4 text-sm disabled:opacity-40"
          >
            <MIcon name="bolt" className="text-[18px] text-white" />
            {loading ? "…" : dict.studio.generate}
          </button>
        </div>
      </div>
    </div>
  );
}
