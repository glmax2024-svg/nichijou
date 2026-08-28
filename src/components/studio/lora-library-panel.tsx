"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { DEMO_COMPLETED_LORAS, type DemoLoraCard } from "@/lib/lora-demos";
import { useLocale } from "@/components/i18n/locale-provider";

type TrainedJob = {
  id: string;
  status: string;
  progress: number;
  adapterId: string | null;
  triggerWord: string | null;
  baseModel: string | null;
  createdAt: string;
  datasetNote?: string | null;
};

type LibraryItem = DemoLoraCard & {
  adapterId?: string | null;
  isActive?: boolean;
};

function parseCoverFromNote(note: string | null | undefined, fallback: string) {
  if (!note) return fallback;
  try {
    const data = JSON.parse(note) as { images?: { url: string }[] };
    return data.images?.[0]?.url ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDownloads(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export function LoraLibraryPanel({
  characterId,
  characterName,
  characterCover,
  onUseForGenerate,
}: {
  characterId: string;
  characterName: string;
  characterCover?: string | null;
  onUseForGenerate?: (trigger: string, name: string, coverUrl: string) => void;
}) {
  const { dict, t } = useLocale();
  const [jobs, setJobs] = useState<TrainedJob[]>([]);
  const [activeAdapter, setActiveAdapter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "official" | "demo">("all");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ai/lora?characterId=${characterId}`);
    if (!res.ok) return;
    const data = await res.json();
    setActiveAdapter(data.loraAdapterId ?? null);
    setJobs((data.loraJobs ?? []).filter((j: TrainedJob) => j.status === "READY"));
  }, [characterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fallbackCover = characterCover || "/characters/default-avatar.png";

  const trainedItems: LibraryItem[] = useMemo(
    () =>
      jobs.map((job, index) => ({
        id: job.id,
        name: `${characterName} · Official LoRA`,
        trigger: job.triggerWord || `${characterName.toLowerCase()}_lora`,
        baseModel: job.baseModel || "Pony",
        kind: "image" as const,
        coverUrl: parseCoverFromNote(job.datasetNote, fallbackCover),
        previewUrls: [parseCoverFromNote(job.datasetNote, fallbackCover)],
        description: t(dict.studio.trainDesc, { name: characterName }),
        source: "trained" as const,
        sourceLabel: dict.studio.trainedHere,
        downloads: 0,
        fileSizeMb: 64 + index * 8,
        version: `v${index + 1}`,
        trainedAtLabel: new Date(job.createdAt).toLocaleDateString("ja-JP"),
        tags: ["official", "character", "ready"],
        adapterId: job.adapterId,
        isActive: Boolean(job.adapterId && job.adapterId === activeAdapter),
      })),
    [jobs, characterName, fallbackCover, activeAdapter, dict, t],
  );

  const items: LibraryItem[] = useMemo(
    () => [...trainedItems, ...DEMO_COMPLETED_LORAS],
    [trainedItems],
  );

  const visible = useMemo(() => {
    if (filter === "official") return items.filter((i) => i.source === "trained");
    if (filter === "demo") return items.filter((i) => i.source === "demo");
    return items;
  }, [items, filter]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

  async function copyTrigger(trigger: string) {
    try {
      await navigator.clipboard.writeText(trigger);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5">
      {/* page head — Char-9 My LoRAs */}
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-display text-2xl font-black tracking-tight text-[#3a3330]">
            My LoRAs
          </h2>
          <p className="mt-1 text-[13px] text-[#8a7a72]">
            {items.length} trained · {trainedItems.length} official · {DEMO_COMPLETED_LORAS.length}{" "}
            demo
          </p>
        </div>
        <div className="flex gap-1.5 rounded-full border border-[rgba(120,72,54,0.1)] bg-white p-1">
          {(
            [
              { key: "all" as const, label: t(dict.studio.allCount, { n: items.length }) },
              { key: "official" as const, label: `Official (${trainedItems.length})` },
              { key: "demo" as const, label: `Demo (${DEMO_COMPLETED_LORAS.length})` },
            ]
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                filter === f.key
                  ? "bg-[#3a3330] text-white"
                  : "text-[#8a7a72] hover:bg-[#fbf4f1]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* style grid — portrait cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {visible.map((item) => {
          const on = selected?.id === item.id;
          return (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedId(item.id);
                }
              }}
              className={`group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-[18px] border transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(120,72,54,0.55)] ${
                on
                  ? "border-transparent ring-2 ring-[#ef7488] shadow-[0_16px_32px_-20px_rgba(239,116,136,0.55)]"
                  : "border-[rgba(120,72,54,0.08)]"
              }`}
            >
              <Image
                src={item.coverUrl}
                alt={item.name}
                fill
                className="object-cover object-top"
                sizes="(max-width:640px) 50vw, 280px"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(40,28,24,0.92)] via-[rgba(40,28,24,0.15)] to-transparent" />

              <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#eafaf1]/95 px-2 py-0.5 text-[10px] font-bold text-[#3fae76] backdrop-blur-sm">
                    <MIcon name="check" className="text-[12px]" />
                    Ready
                  </span>
                  <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    {item.source === "demo" ? "Demo" : "Official"}
                  </span>
                </div>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                  {item.baseModel}
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 pt-10">
                <div className="pr-16">
                  <div className="line-clamp-2 font-display text-[14px] font-black leading-snug text-white">
                    {item.name}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-[#ffc3cc] backdrop-blur-sm">
                      #{item.trigger}
                    </span>
                    <span className="text-[10px] text-white/65">
                      {item.source === "demo"
                        ? `${formatDownloads(item.downloads)} uses`
                        : item.version}
                    </span>
                  </div>
                </div>

                {onUseForGenerate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUseForGenerate(item.trigger, item.name, item.coverUrl);
                    }}
                    className="absolute bottom-3 right-3 inline-flex translate-y-1 items-center gap-1 rounded-[10px] bg-white px-3 py-1.5 text-[11px] font-bold text-[#3a3330] opacity-0 shadow-sm transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
                  >
                    <MIcon name="bolt" className="text-[14px]" />
                    {dict.studio.useThisShort}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* detail strip under grid — full width, Char-9 detail feel */}
      {selected && (
        <div className="overflow-hidden rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_16px_40px_-28px_rgba(120,72,54,0.45)]">
          <div className="grid gap-0 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="relative aspect-[3/4] bg-[#fbf4f1] md:aspect-auto md:min-h-[240px]">
              <Image
                src={selected.coverUrl}
                alt=""
                fill
                className="object-cover object-top"
                sizes="200px"
              />
            </div>
            <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-black text-[#3a3330]">
                    {selected.name}
                  </h3>
                  <span className="rounded-full bg-[#eafaf1] px-2 py-0.5 text-[10px] font-bold text-[#3fae76]">
                    Ready
                  </span>
                  {selected.isActive && (
                    <span className="rounded-full bg-[#fff4f6] px-2 py-0.5 text-[10px] font-bold text-[#ef7488]">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[12px] font-bold text-[#8a7a72]">{selected.sourceLabel}</p>
                <p className="mt-3 max-w-[540px] text-[13px] leading-relaxed text-[#5a4f48]">
                  {selected.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#fff4f6] px-2.5 py-1 text-[11px] font-bold text-[#ef7488]">
                    #{selected.trigger}
                  </span>
                  <span className="rounded-full bg-[#fbf4f1] px-2.5 py-1 text-[11px] font-bold text-[#8a7a72]">
                    {selected.baseModel}
                  </span>
                  <span className="rounded-full bg-[#fbf4f1] px-2.5 py-1 text-[11px] font-bold text-[#8a7a72]">
                    {selected.version}
                  </span>
                  <span className="rounded-full bg-[#fbf4f1] px-2.5 py-1 text-[11px] font-bold text-[#8a7a72]">
                    {selected.fileSizeMb} MB
                  </span>
                  {selected.source === "demo" && (
                    <span className="rounded-full bg-[#fbf4f1] px-2.5 py-1 text-[11px] font-bold text-[#8a7a72]">
                      {formatDownloads(selected.downloads)} DL
                    </span>
                  )}
                </div>

                {selected.previewUrls.length > 1 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {selected.previewUrls.map((url) => (
                      <div
                        key={url}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border border-[rgba(120,72,54,0.08)]"
                      >
                        <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[rgba(120,72,54,0.07)] pt-4">
                <button
                  type="button"
                  onClick={() => void copyTrigger(selected.trigger)}
                  className="inline-flex items-center gap-1 rounded-[12px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-3.5 py-2.5 text-[12px] font-bold text-[#5a4f48]"
                >
                  <MIcon name="content_copy" className="text-[16px]" />
                  {copied ? dict.studio.copied : dict.studio.copyTrigger}
                </button>
                {onUseForGenerate && (
                  <button
                    type="button"
                    onClick={() =>
                      onUseForGenerate(selected.trigger, selected.name, selected.coverUrl)
                    }
                    className="btn-primary inline-flex items-center gap-1 rounded-[12px] px-4 py-2.5 text-[12px]"
                  >
                    <MIcon name="bolt" className="text-[16px] text-white" />
                    {dict.studio.useThis}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
