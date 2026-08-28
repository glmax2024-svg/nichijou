"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { MIcon } from "@/components/ui/m-icon";
import { LoraTrainWizard } from "@/components/studio/lora-train-wizard";
import { LoraGeneratePanel } from "@/components/studio/lora-generate-panel";
import { LoraLibraryPanel } from "@/components/studio/lora-library-panel";

type Tab = "post" | "train" | "library" | "generate" | "voice";

type CharacterInfo = {
  id: string;
  name: string;
  slug: string;
  loraStatus: string;
  coverUrl?: string | null;
};

export default function ManageCharacterPage() {
  const params = useParams();
  const characterId = params.id as string;
  const [tab, setTab] = useState<Tab>("library");
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isAiAssisted, setIsAiAssisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [generateTrigger, setGenerateTrigger] = useState<string | null>(null);
  const [generateHint, setGenerateHint] = useState<string | null>(null);
  const [generateCover, setGenerateCover] = useState<string | null>(null);
  const postFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash === "train" ||
      hash === "library" ||
      hash === "generate" ||
      hash === "post" ||
      hash === "voice"
    ) {
      setTab(hash);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/characters?id=${characterId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.id) {
          setCharacter({
            id: data.id,
            name: data.name,
            slug: data.slug,
            loraStatus: data.loraStatus,
            coverUrl: data.coverUrl ?? null,
          });
        }
      } catch {
        /* character name fallback below */
      }
    })();
  }, [characterId]);

  const name = character?.name ?? "キャラクター";
  const suggestedTrigger = (character?.slug ?? "character")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");

  async function generateDraft() {
    setDraftLoading(true);
    try {
      const res = await fetch("/api/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: characterId, action: "draft-post" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.draft);
      setIsAiAssisted(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setDraftLoading(false);
    }
  }

  async function uploadPostImage(file: File) {
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("characterId", characterId);
      form.append("files", file);
      const res = await fetch("/api/studio/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロード失敗");
      const uploaded = data.images?.[0];
      if (!uploaded?.url) throw new Error("アップロード失敗");
      setImageUrl(uploaded.url);
      setAttachmentName(uploaded.name || file.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "アップロード失敗");
    } finally {
      setUploadingImage(false);
    }
  }

  async function publishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          content,
          imageUrl: imageUrl || undefined,
          isAiAssisted,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setContent("");
      setImageUrl(null);
      setAttachmentName(null);
      setIsAiAssisted(false);
      alert("投稿しました！");
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setLoading(false);
    }
  }

  async function enrollVoice() {
    const url = prompt("参考音频 URL（5–15 秒，日语朗读）");
    if (!url) return;
    const duration = parseFloat(prompt("音频时长（秒）", "5") ?? "5");
    setVoiceLoading(true);
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, sampleAudioUrl: url, durationSec: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVoiceStatus(`声纹已注册 · ${data.embeddingId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラー");
    } finally {
      setVoiceLoading(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "library", label: "已完成 LoRA", icon: "inventory_2" },
    { id: "train", label: "LoRA 训练", icon: "model_training" },
    { id: "generate", label: "LoRA 生成", icon: "auto_awesome" },
    { id: "post", label: "日常投稿", icon: "edit" },
    { id: "voice", label: "声纹", icon: "mic" },
  ];

  return (
    <div className="relative min-h-[70vh]">
      <AmbientBg />
      <div className="relative mx-auto max-w-[880px] px-4 py-8 sm:px-6">
        <Link
          href="/studio"
          className="inline-flex items-center gap-1 text-[13px] font-bold text-[#8a7a72] hover:text-[#ef7488]"
        >
          <MIcon name="arrow_back" className="text-[18px]" />
          スタジオに戻る
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-[#3a3330]">{name}</h1>
            <p className="mt-1 text-sm text-[#8a7a72]">
              训练专属 LoRA，再用它生成角色日常内容
            </p>
          </div>
          {character?.slug && (
            <Link
              href={`/characters/${character.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(120,72,54,0.12)] bg-white px-3 py-1.5 text-[12px] font-bold text-[#5a4f48]"
            >
              <MIcon name="public" className="text-[16px]" />
              公開ページ
            </Link>
          )}
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white/80 p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                window.history.replaceState(null, "", `#${t.id}`);
              }}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold transition ${
                tab === t.id
                  ? "bg-[#fff4f6] text-[#ef7488] shadow-sm"
                  : "text-[#8a7a72] hover:bg-[#fbf4f1]"
              }`}
            >
              <MIcon name={t.icon} className="text-[18px]" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "library" && (
            <LoraLibraryPanel
              characterId={characterId}
              characterName={name}
              characterCover={character?.coverUrl}
              onUseForGenerate={(trigger, loraName, cover) => {
                setGenerateTrigger(trigger);
                setGenerateHint(loraName);
                setGenerateCover(cover);
                setTab("generate");
                window.history.replaceState(null, "", "#generate");
              }}
            />
          )}

          {tab === "train" && (
            <LoraTrainWizard
              characterId={characterId}
              characterName={name}
              suggestedTrigger={suggestedTrigger}
            />
          )}

          {tab === "generate" && (
            <LoraGeneratePanel
              key={`gen-${generateTrigger ?? "default"}-${generateHint ?? "none"}`}
              characterId={characterId}
              characterName={name}
              preferredTrigger={generateTrigger}
              preferredLoraName={generateHint}
              preferredCoverUrl={generateCover}
            />
          )}

          {tab === "post" && (
            <form
              onSubmit={publishPost}
              className="space-y-4 rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-[#3a3330]">今日の出来事</label>
                <button
                  type="button"
                  onClick={() => void generateDraft()}
                  disabled={draftLoading}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f3eefc] px-3 py-1.5 text-[12px] font-bold text-[#8b76d4] disabled:opacity-50"
                >
                  <MIcon name="auto_awesome" className="text-[16px]" />
                  {draftLoading ? "生成中…" : "AI 下書き（LoRA）"}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="例：今日放課後、隣の席の子に告白されちゃった…どう返事しよう。"
                className="w-full rounded-[16px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-4 py-3 text-sm outline-none focus:border-[#ef7488]/40"
              />

              <div>
                <span className="text-[12px] font-bold text-[#5a4f48]">图片 / 手绘附件</span>
                <div className="mt-2 flex flex-wrap items-start gap-3">
                  {imageUrl ? (
                    <div className="relative h-28 w-28 overflow-hidden rounded-[16px] border border-[rgba(120,72,54,0.1)] bg-[#fbf4f1]">
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl(null);
                          setAttachmentName(null);
                        }}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                        aria-label="移除图片"
                      >
                        <MIcon name="close" className="text-[14px] text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => postFileRef.current?.click()}
                      className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-[16px] border-2 border-dashed border-[rgba(120,72,54,0.18)] bg-[#fbf4f1] text-[#8a7a72] transition hover:border-[#ef7488]/40 hover:text-[#ef7488] disabled:opacity-50"
                    >
                      <MIcon name="add_photo_alternate" className="text-[26px]" />
                      <span className="text-[11px] font-bold">
                        {uploadingImage ? "上传中…" : "添加图片"}
                      </span>
                    </button>
                  )}
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => postFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-[12px] border border-[rgba(120,72,54,0.12)] bg-white px-3 py-2 text-[12px] font-bold text-[#5a4f48] disabled:opacity-50"
                    >
                      <MIcon name="attach_file" className="text-[16px]" />
                      {imageUrl ? "更换附件" : "上传手绘图 / 附件"}
                    </button>
                    <p className="max-w-[220px] text-[11px] leading-relaxed text-[#b0a099]">
                      支持 JPG / PNG / WEBP / GIF，单张不超过 12MB。适合画师手绘投稿。
                    </p>
                    {attachmentName && (
                      <p className="truncate text-[11px] font-bold text-[#8a7a72]">
                        {attachmentName}
                      </p>
                    )}
                  </div>
                  <input
                    ref={postFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPostImage(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {isAiAssisted && (
                <p className="text-[12px] text-[#8b76d4]">
                  AI / LoRA 補助下書き — 編集してから投稿できます
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="btn-dark w-full rounded-[14px] py-3 text-sm disabled:opacity-50"
              >
                {loading ? "投稿中…" : "タイムラインに投稿"}
              </button>
            </form>
          )}

          {tab === "voice" && (
            <div className="rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff4f6]">
                  <MIcon name="mic" className="text-[22px] text-[#ef7488]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-black text-[#3a3330]">
                    5 秒声纹注册
                  </h2>
                  <p className="text-[13px] text-[#8a7a72]">
                    上传 5–15 秒参考音频，用于叫醒 / 生日祝福 TTS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void enrollVoice()}
                disabled={voiceLoading}
                className="btn-primary mt-5 rounded-[14px] px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {voiceLoading ? "注册中…" : "注册声纹"}
              </button>
              {voiceStatus && (
                <p className="mt-3 text-[12px] font-bold text-[#3fae76]">{voiceStatus}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
