"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type DatasetImage = {
  id: string;
  url: string;
  caption: string;
  uploading?: boolean;
};

type Recipe = {
  epochs: number;
  repeats: number;
  resolution: number;
  networkDim: number;
  alpha: number;
  optimizer: string;
};

type LoraJob = {
  id: string;
  status: string;
  progress: number;
  adapterId: string | null;
  triggerWord: string | null;
  baseModel: string | null;
  errorMsg: string | null;
  createdAt: string;
};

type LoraStatusPayload = {
  loraAdapterId: string | null;
  loraStatus: string;
  loraVersion: number;
  loraJobs: LoraJob[];
  activeJob: LoraJob | null;
};

const BASE_MODELS = [
  { id: "sdxl", label: "SDXL" },
  { id: "pony", label: "Pony" },
  { id: "flux", label: "Flux" },
  { id: "ani", label: "Anime" },
];

const RECIPE_IDS = ["char-simple", "char-complex", "style-small"] as const;

const RECIPE_DATA: Record<(typeof RECIPE_IDS)[number], Recipe> = {
  "char-simple": {
    epochs: 15,
    repeats: 10,
    resolution: 1024,
    networkDim: 8,
    alpha: 4,
    optimizer: "Prodigy",
  },
  "char-complex": {
    epochs: 12,
    repeats: 13,
    resolution: 1024,
    networkDim: 16,
    alpha: 8,
    optimizer: "Prodigy",
  },
  "style-small": {
    epochs: 20,
    repeats: 15,
    resolution: 1024,
    networkDim: 32,
    alpha: 16,
    optimizer: "AdamW8bit",
  },
};

const QUICK_TAGS = [
  "portrait",
  "full body",
  "close-up",
  "upper body",
  "looking at viewer",
  "smile",
  "outdoors",
  "indoors",
  "simple background",
];

function defaultCaption(i: number) {
  const captions = [
    "portrait, looking at viewer",
    "full body, dynamic pose",
    "close-up, soft lighting",
    "upper body, simple background",
    "side view, outdoors",
    "three-quarter view, smile",
  ];
  return captions[i % captions.length];
}

function statusTone(status: string) {
  if (status === "READY") return "bg-[#eafaf1] text-[#3fae76]";
  if (status === "TRAINING" || status === "QUEUED") return "bg-[#fff4f6] text-[#ef7488]";
  if (status === "FAILED") return "bg-[#fdecec] text-[#d46565]";
  return "bg-[#fbf4f1] text-[#8a7a72]";
}

export function LoraTrainWizard({
  characterId,
  characterName,
  suggestedTrigger,
}: {
  characterId: string;
  characterName: string;
  suggestedTrigger: string;
}) {
  const { dict, t } = useLocale();
  const steps = dict.studio.trainSteps;
  const presets = useMemo(
    () => [
      {
        id: "char-simple" as const,
        label: dict.studio.recipeSimple,
        desc: dict.studio.recipeSimpleDesc,
        recipe: RECIPE_DATA["char-simple"],
      },
      {
        id: "char-complex" as const,
        label: dict.studio.recipeComplex,
        desc: dict.studio.recipeComplexDesc,
        recipe: RECIPE_DATA["char-complex"],
      },
      {
        id: "style-small" as const,
        label: dict.studio.recipeStyle,
        desc: dict.studio.recipeStyleDesc,
        recipe: RECIPE_DATA["style-small"],
      },
    ],
    [dict],
  );

  const [step, setStep] = useState(0);
  const [trigger, setTrigger] = useState(suggestedTrigger);
  const [baseModel, setBaseModel] = useState("pony");
  const [images, setImages] = useState<DatasetImage[]>([]);
  const [selected, setSelected] = useState(0);
  const [presetId, setPresetId] = useState<(typeof RECIPE_IDS)[number]>("char-complex");
  const [recipe, setRecipe] = useState<Recipe>(RECIPE_DATA["char-complex"]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LoraStatusPayload | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepsTotal = useMemo(
    () => Math.round((Math.max(images.length, 1) * recipe.repeats * recipe.epochs) / 10) * 10,
    [images.length, recipe.epochs, recipe.repeats],
  );

  const captioned = images.filter((img) => img.caption.trim()).length;
  const canNext = [
    Boolean(trigger.trim()),
    images.length >= 5 && !uploading,
    true,
    true,
  ][step];

  const refreshStatus = useCallback(async () => {
    const res = await fetch(`/api/ai/lora?characterId=${characterId}`);
    if (!res.ok) return;
    const data = (await res.json()) as LoraStatusPayload;
    setStatus(data);
    return data;
  }, [characterId]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const busy =
      status?.loraStatus === "TRAINING" ||
      status?.loraStatus === "QUEUED" ||
      (status?.activeJob &&
        (status.activeJob.status === "TRAINING" || status.activeJob.status === "QUEUED"));

    if (busy) {
      pollRef.current = setInterval(() => {
        void refreshStatus();
      }, 1200);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status?.loraStatus, status?.activeJob?.status, status?.activeJob?.progress, refreshStatus]);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("characterId", characterId);
      for (const file of files.slice(0, 30)) form.append("files", file);

      const res = await fetch("/api/ai/lora/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.studio.uploadFailed);

      setImages((prev) => {
        const next = [
          ...prev,
          ...data.images.map(
            (img: { url: string }, i: number) =>
              ({
                id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                url: img.url,
                caption: defaultCaption(prev.length + i),
              }) satisfies DatasetImage,
          ),
        ];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.studio.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  function applyPreset(id: (typeof RECIPE_IDS)[number]) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setRecipe(preset.recipe);
  }

  function toggleTag(tag: string) {
    const cur = images[selected];
    if (!cur) return;
    const parts = cur.caption
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = parts.includes(tag) ? parts.filter((p) => p !== tag) : [...parts, tag];
    setImages((imgs) =>
      imgs.map((img, i) => (i === selected ? { ...img, caption: next.join(", ") } : img)),
    );
  }

  async function startTraining() {
    if (images.length < 5) {
      setError(dict.studio.needImages);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/lora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          triggerWord: trigger.trim().toLowerCase().replace(/\s+/g, "_"),
          baseModel,
          recipe,
          datasetImages: images.map((img) => ({ url: img.url, caption: img.caption })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? dict.studio.trainFailed);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.studio.trainFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const progress = status?.activeJob?.progress ?? (status?.loraStatus === "READY" ? 100 : 0);
  const training =
    status?.loraStatus === "TRAINING" ||
    status?.loraStatus === "QUEUED" ||
    status?.activeJob?.status === "TRAINING" ||
    status?.activeJob?.status === "QUEUED";

  return (
    <div className="overflow-hidden rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_20px_50px_-36px_rgba(120,72,54,0.45)]">
      <div
        className="border-b border-[rgba(120,72,54,0.07)] px-5 py-5 sm:px-6"
        style={{ background: "linear-gradient(135deg,#fff4f6 0%,#fff 55%,#eef1ff 100%)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488]">
                <MIcon name="model_training" className="text-[22px] text-white" />
              </div>
              <div>
                <h2 className="font-display text-lg font-black text-[#3a3330]">
                  {dict.studio.trainTitle}
                </h2>
                <p className="text-[12px] text-[#8a7a72]">
                  {t(dict.studio.trainSubtitle, { name: characterName })}
                </p>
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status?.loraStatus ?? "NONE")}`}
          >
            LoRA · {status?.loraStatus ?? "NONE"}
            {status?.loraVersion ? ` · v${status.loraVersion}` : ""}
          </span>
        </div>

        {(training || status?.loraStatus === "READY") && (
          <div className="mt-4 rounded-[16px] border border-[rgba(120,72,54,0.08)] bg-white/80 p-4">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#5a4f48]">
              <span>{training ? dict.studio.trainingNow : dict.studio.trainDone}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#fbf4f1]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f79aa8] to-[#ef7488] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {status?.activeJob?.adapterId && (
              <p className="mt-2 truncate text-[11px] text-[#b0a099]">
                adapter: {status.activeJob.adapterId}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[rgba(120,72,54,0.07)] px-4 py-3 sm:px-6">
        {steps.map((label, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
              i === step
                ? "bg-[#fff4f6] text-[#ef7488]"
                : i < step
                  ? "text-[#3fae76]"
                  : "text-[#b0a099]"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                i < step
                  ? "bg-[#eafaf1] text-[#3fae76]"
                  : i === step
                    ? "bg-[#ef7488] text-white"
                    : "bg-[#fbf4f1] text-[#b0a099]"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-black text-[#3a3330]">
                {dict.studio.triggerTitle}
              </h3>
              <p className="mt-1 text-[13px] text-[#8a7a72]">{dict.studio.triggerHint}</p>
            </div>
            <label className="block">
              <span className="text-[12px] font-bold text-[#5a4f48]">Trigger word *</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-3 py-2.5">
                <span className="text-sm font-bold text-[#ef7488]">#</span>
                <input
                  value={trigger}
                  onChange={(e) =>
                    setTrigger(e.target.value.replace(/\s+/g, "_").toLowerCase())
                  }
                  placeholder="aoi_nichijou"
                  className="w-full bg-transparent text-sm text-[#3a3330] outline-none"
                />
              </div>
            </label>
            <div>
              <span className="text-[12px] font-bold text-[#5a4f48]">Base model</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {BASE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setBaseModel(m.id)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                      baseModel === m.id
                        ? "bg-[#ef7488] text-white"
                        : "bg-[#fbf4f1] text-[#8a7a72]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-black text-[#3a3330]">
                  {dict.studio.datasetTitle}
                </h3>
                <p className="mt-1 text-[13px] text-[#8a7a72]">{dict.studio.datasetHint}</p>
              </div>
              <p className="text-[12px] font-bold text-[#8a7a72]">
                {t(dict.studio.imagesCaptioned, { n: images.length, c: captioned })}
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-[20px] border-2 border-dashed px-4 py-8 text-center transition ${
                dragOver
                  ? "border-[#ef7488] bg-[#fff4f6]"
                  : "border-[rgba(120,72,54,0.15)] bg-[#fbf4f1] hover:border-[#ef7488]/40"
              }`}
            >
              <MIcon name="upload" className="mx-auto text-[28px] text-[#ef7488]" />
              <p className="mt-2 text-sm font-bold text-[#3a3330]">
                {uploading ? dict.studio.dropping : dict.studio.dropOrClick}
              </p>
              <p className="mt-1 text-[11px] text-[#b0a099]">{dict.studio.maxSize}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {images.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-[140px_1fr]">
                <div className="flex max-h-[320px] flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-y-auto">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border-2 ${
                        selected === i ? "border-[#ef7488]" : "border-transparent"
                      }`}
                    >
                      <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                    </button>
                  ))}
                </div>
                {images[selected] && (
                  <div className="space-y-3">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#fbf4f1]">
                      <Image
                        src={images[selected].url}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="480px"
                      />
                    </div>
                    <textarea
                      value={images[selected].caption}
                      onChange={(e) => {
                        const value = e.target.value;
                        setImages((imgs) =>
                          imgs.map((img, i) =>
                            i === selected ? { ...img, caption: value } : img,
                          ),
                        );
                      }}
                      rows={3}
                      className="w-full rounded-[14px] border border-[rgba(120,72,54,0.12)] bg-[#fbf4f1] px-3 py-2.5 text-sm outline-none focus:border-[#ef7488]/40"
                      placeholder="caption / tags"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TAGS.map((tag) => {
                        const on = images[selected].caption
                          .split(",")
                          .map((s) => s.trim())
                          .includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              on ? "bg-[#ef7488] text-white" : "bg-[#fbf4f1] text-[#8a7a72]"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setImages((imgs) =>
                            imgs.map((img, i) =>
                              img.caption.trim() ? img : { ...img, caption: defaultCaption(i) },
                            ),
                          )
                        }
                        className="rounded-[12px] border border-[rgba(120,72,54,0.12)] px-3 py-2 text-[12px] font-bold text-[#5a4f48]"
                      >
                        {dict.studio.autoCaption}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImages((imgs) => imgs.filter((_, i) => i !== selected));
                          setSelected((s) => Math.max(0, s - 1));
                        }}
                        className="rounded-[12px] border border-[rgba(212,101,101,0.25)] px-3 py-2 text-[12px] font-bold text-[#d46565]"
                      >
                        {dict.studio.deleteImage}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-black text-[#3a3330]">
                {dict.studio.recipeTitle}
              </h3>
              <p className="mt-1 text-[13px] text-[#8a7a72]">{dict.studio.recipeHint}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-[16px] border p-3 text-left ${
                    presetId === p.id
                      ? "border-[#ef7488] bg-[#fff4f6]"
                      : "border-[rgba(120,72,54,0.08)] bg-[#fbf4f1]"
                  }`}
                >
                  <div className="text-[13px] font-bold text-[#3a3330]">{p.label}</div>
                  <div className="mt-0.5 text-[11px] text-[#8a7a72]">{p.desc}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["epochs", "Epochs", recipe.epochs, 1, 40],
                  ["repeats", "Repeats", recipe.repeats, 1, 40],
                  ["networkDim", "Network Dim", recipe.networkDim, 4, 128],
                  ["alpha", "Alpha", recipe.alpha, 1, 128],
                ] as const
              ).map(([key, label, value, min, max]) => (
                <label key={key} className="block">
                  <span className="text-[12px] font-bold text-[#5a4f48]">
                    {label}: {value}
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) =>
                      setRecipe((r) => ({ ...r, [key]: Number(e.target.value) }))
                    }
                    className="mt-2 w-full accent-[#ef7488]"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[768, 1024, 1280].map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setRecipe((r) => ({ ...r, resolution: res }))}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                    recipe.resolution === res
                      ? "bg-[#ef7488] text-white"
                      : "bg-[#fbf4f1] text-[#8a7a72]"
                  }`}
                >
                  {res}px
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-base font-black text-[#3a3330]">
                {dict.studio.confirmTitle}
              </h3>
              <p className="mt-1 text-[13px] text-[#8a7a72]">{dict.studio.confirmHint}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Trigger", value: `#${trigger || "—"}` },
                { label: "Base model", value: baseModel },
                {
                  label: dict.studio.imageCount,
                  value: t(dict.studio.imageCountValue, { n: images.length }),
                },
                { label: dict.studio.estSteps, value: String(stepsTotal) },
                {
                  label: dict.studio.recipeLabel,
                  value: `${recipe.epochs}ep · dim ${recipe.networkDim} · α${recipe.alpha}`,
                },
                { label: "Optimizer", value: recipe.optimizer },
              ].map((item) => (
                <div key={item.label} className="rounded-[14px] bg-[#fbf4f1] px-3 py-2.5">
                  <div className="text-[10px] font-bold text-[#b0a099]">{item.label}</div>
                  <div className="mt-0.5 text-sm font-bold text-[#3a3330]">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 8).map((img) => (
                <div
                  key={img.id}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]"
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-[12px] bg-[#fdecec] px-3 py-2 text-[12px] font-bold text-[#d46565]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(120,72,54,0.07)] pt-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-[14px] border border-[rgba(120,72,54,0.12)] px-4 py-2.5 text-sm font-bold text-[#5a4f48] disabled:opacity-40"
          >
            <MIcon name="arrow_back" className="text-[18px]" />
            {dict.studio.prevStep}
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary inline-flex items-center gap-1 rounded-[14px] px-5 py-2.5 text-sm disabled:opacity-40"
            >
              {dict.studio.nextStep}
              <MIcon name="arrow_forward" className="text-[18px] text-white" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || training || images.length < 5}
              onClick={() => void startTraining()}
              className="btn-primary inline-flex items-center gap-1.5 rounded-[14px] px-5 py-2.5 text-sm disabled:opacity-40"
            >
              <MIcon name="bolt" className="text-[18px] text-white" />
              {submitting || training ? dict.studio.trainingNow : dict.studio.startTrain}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
