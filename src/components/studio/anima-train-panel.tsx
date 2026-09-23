"use client";

/* 训练素材（lora/ 目录）和预览图（私有文件）都需要登录才能访问；next/image 在服务端抓图时
   不带用户 cookie，线上会裂图，所以这里用普通 <img> 让浏览器带着 cookie 直接请求。 */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { MIcon } from "@/components/ui/m-icon";
import { useLocale } from "@/components/i18n/locale-provider";

type Preview = { angle: string; assetId: string; url: string };

type TrainingJob = {
  id: string;
  status: "QUEUED" | "TRAINING" | "READY" | "FAILED" | "NONE";
  remoteStatus: string | null;
  progress: number;
  step: number | null;
  totalSteps: number | null;
  queuePosition: number | null;
  revision: number | null;
  loraId: string | null;
  imageCount: number | null;
  duplicatesRemoved: number | null;
  errorMsg: string | null;
  previews: Preview[] | null;
  activatedAt: string | null;
  createdAt: string;
  provider: string | null;
};

export type TrainingStatusPayload = {
  loraAdapterId: string | null;
  loraStatus: string;
  loraVersion: number;
  loraJobs: TrainingJob[];
  quota: { limit: number | null; used: number; remaining: number | null; resetsAt: string };
  trainingMode: "anima" | "legacy";
};

type Validation = { image_count: number; duplicates_removed: number };

const MAX_IMAGES = 100;
const POLL_MS = 5000;

const isActive = (job?: TrainingJob) => job?.status === "QUEUED" || job?.status === "TRAINING";

export function AnimaTrainPanel({
  characterId,
  characterName,
  initialStatus,
}: {
  characterId: string;
  characterName: string;
  initialStatus: TrainingStatusPayload;
}) {
  const { dict, t, locale } = useLocale();
  const s = dict.studio.anima;

  const [status, setStatus] = useState<TrainingStatusPayload>(initialStatus);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [busy, setBusy] = useState<"validate" | "start" | "cancel" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const jobs = status.loraJobs.filter((j) => j.provider === "anima");
  const activeJob = jobs.find(isActive);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ai/lora?characterId=${characterId}`);
    if (res.ok) setStatus((await res.json()) as TrainingStatusPayload);
  }, [characterId]);

  // 训练进行中才轮询；训练服务进度更新不频繁，5 秒足够
  useEffect(() => {
    if (!activeJob) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [activeJob, refresh]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { month: "numeric", day: "numeric" });
  // 额度按日本时间自然月重置；按浏览器本地时区显示会把「10/1 0:00 JST」显示成 9/30
  const fmtResetDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" });

  async function call(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? dict.studio.uploadFailed);
    return data;
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      // 上传接口单次最多 30 张，分批上传
      for (let i = 0; i < files.length && images.length + i < MAX_IMAGES; i += 30) {
        const form = new FormData();
        form.append("characterId", characterId);
        files.slice(i, i + 30).forEach((f) => form.append("files", f));
        const res = await fetch("/api/ai/lora/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? dict.studio.uploadFailed);
        setImages((prev) => [...prev, ...data.images.map((img: { url: string }) => img.url)].slice(0, MAX_IMAGES));
      }
      setValidation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.studio.uploadFailed);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const quota = status.quota;
  const noQuota = quota.remaining === 0;
  const canStart = Boolean(validation) && !noQuota && !activeJob && busy === null;

  const stageLabel = (job: TrainingJob) => {
    switch (job.remoteStatus) {
      case "uploading":
        return s.stageUploading;
      case "queued":
        return job.queuePosition ? `${s.stageQueued} · ${t(s.queueAhead, { n: job.queuePosition })}` : s.stageQueued;
      case "tagging":
        return s.stageTagging;
      case "waiting_gpu":
        return s.stageWaitingGpu;
      case "verifying":
        return s.stageVerifying;
      case "queued_previews":
      case "generating_previews":
        return s.stagePreviews;
      default:
        return job.status === "QUEUED" ? s.stageQueued : s.stageTraining;
    }
  };

  const inUse = (job: TrainingJob) => Boolean(job.loraId) && status.loraAdapterId === `anima:${job.loraId}`;
  const current = jobs.find(inUse);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[rgba(120,72,54,0.07)] bg-white shadow-[0_20px_50px_-36px_rgba(120,72,54,0.45)]">
      {/* 头部：标题 + 当月额度 + 当前版本 */}
      <div
        className="border-b border-[rgba(120,72,54,0.07)] px-5 py-5 sm:px-6"
        style={{ background: "linear-gradient(135deg,#fff4f6 0%,#fff 55%,#eef1ff 100%)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#f79aa8] to-[#ef7488]">
              <MIcon name="model_training" className="text-[22px] text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-black text-[#3a3330]">{s.title}</h2>
              <p className="text-[12px] text-[#8a7a72]">{t(s.subtitle, { name: characterName })}</p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold tabular-nums ${
              noQuota ? "bg-[#fdecec] text-[#d46565]" : "bg-white/80 text-[#5a4f48]"
            }`}
          >
            {quota.limit === null
              ? s.quotaUnlimited
              : t(s.quota, { remaining: quota.remaining ?? 0, limit: quota.limit, date: fmtResetDate(quota.resetsAt) })}
          </span>
        </div>
        <p className="mt-3 text-[12px] text-[#8a7a72]">
          {s.currentVersion}:{" "}
          <span className="font-bold text-[#3a3330]">
            {current?.revision ? `v${current.revision}` : status.loraAdapterId?.startsWith("anima:") ? status.loraAdapterId.slice(6) : s.noVersion}
          </span>
        </p>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        {error && (
          <p className="rounded-[12px] bg-[#fdecec] px-4 py-3 text-[13px] font-bold text-[#d46565]" role="alert">
            {error}
          </p>
        )}

        {activeJob ? (
          /* 训练进行中 */
          <section className="rounded-[18px] border border-[rgba(239,116,136,0.2)] bg-[#fffafb] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold text-[#5a4f48]">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef7488]" />
                {stageLabel(activeJob)}
              </span>
              {activeJob.step != null && activeJob.totalSteps ? (
                <span className="tabular-nums text-[#8a7a72]">
                  {t(s.steps, { step: activeJob.step, total: activeJob.totalSteps })}
                </span>
              ) : null}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#fbeef0]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f79aa8] to-[#ef7488] transition-all duration-700"
                style={{ width: `${Math.max(2, activeJob.progress)}%` }}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  if (!window.confirm(s.confirmCancel)) return;
                  void run("cancel", async () => {
                    await call(`/api/ai/lora/jobs/${activeJob.id}/cancel`);
                    await refresh();
                  });
                }}
                className="rounded-[10px] px-3 py-1.5 text-[12px] font-bold text-[#8a7a72] hover:bg-[#f4ece8] disabled:opacity-50"
              >
                {s.cancel}
              </button>
            </div>
          </section>
        ) : (
          /* 新训练：上传 → 检查 → 开始 */
          <section>
            <h3 className="text-[14px] font-bold text-[#3a3330]">{s.datasetTitle}</h3>
            <p className="mt-0.5 text-[12px] text-[#8a7a72]">{s.datasetHint}</p>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleFiles(e.dataTransfer.files);
              }}
              disabled={uploading || images.length >= MAX_IMAGES}
              className="mt-3 flex w-full flex-col items-center gap-1.5 rounded-[18px] border-2 border-dashed border-[rgba(239,116,136,0.3)] bg-[#fffafb] px-4 py-7 text-[13px] font-bold text-[#8a7a72] transition hover:border-[#ef7488] disabled:opacity-60"
            >
              <MIcon name={uploading ? "hourglass_top" : "add_photo_alternate"} className="text-[28px] text-[#ef7488]" />
              {uploading ? s.uploading : s.dropHere}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />

            {images.length > 0 && (
              <>
                <div className="mt-3 flex items-center justify-between text-[12px] text-[#8a7a72]">
                  <span className="tabular-nums">{t(s.imageCount, { n: images.length })}</span>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-8">
                  {images.map((url) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-[10px] bg-[#fbf4f1]">
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        aria-label={s.remove}
                        onClick={() => {
                          setImages((prev) => prev.filter((u) => u !== url));
                          setValidation(null);
                        }}
                        className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white group-hover:flex"
                      >
                        <MIcon name="close" className="text-[14px]" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={images.length < 5 || uploading || busy !== null}
                onClick={() =>
                  void run("validate", async () => {
                    const data = await call("/api/ai/lora/validate", { characterId, imageUrls: images });
                    setValidation(data as Validation);
                  })
                }
                className="rounded-[12px] bg-[#f4ece8] px-4 py-2.5 text-[13px] font-bold text-[#3a3330] hover:bg-[#efe3dd] disabled:opacity-50"
              >
                {busy === "validate" ? s.validating : s.validate}
              </button>
              {validation && (
                <span className="flex items-center gap-1 text-[12.5px] font-bold text-[#3fae76]">
                  <MIcon name="check_circle" className="text-[16px]" />
                  {t(s.validOk, { n: validation.image_count })}
                  {validation.duplicates_removed > 0 && (
                    <span className="font-normal text-[#8a7a72]">
                      （{t(s.validDuplicates, { n: validation.duplicates_removed })}）
                    </span>
                  )}
                </span>
              )}
            </div>

            <p className="mt-4 text-[12px] text-[#b0a099]">{s.fixedParams}</p>
            <button
              type="button"
              disabled={!canStart}
              title={noQuota ? s.quotaExhausted : !validation ? s.needValidate : undefined}
              onClick={() => {
                if (!window.confirm(s.confirmStart)) return;
                void run("start", async () => {
                  await call("/api/ai/lora", {
                    characterId,
                    datasetImages: images.map((url) => ({ url })),
                  });
                  setImages([]);
                  setValidation(null);
                  await refresh();
                });
              }}
              className="btn-primary mt-2 w-full rounded-[14px] py-3 text-[14px] disabled:opacity-50"
            >
              {busy === "start" ? s.starting : noQuota ? s.quotaExhausted : s.start}
            </button>
          </section>
        )}

        {/* 训练历史：版本、预览、切换 */}
        {jobs.length > 0 && (
          <section>
            <h3 className="text-[14px] font-bold text-[#3a3330]">{s.history}</h3>
            <ul className="mt-2 divide-y divide-[rgba(120,72,54,0.06)]">
              {jobs.map((job) => (
                <li key={job.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-display font-black text-[#3a3330]">
                      {job.revision ? `v${job.revision}` : "—"}
                    </span>
                    <span className="text-[12px] tabular-nums text-[#b0a099]">{fmtDate(job.createdAt)}</span>
                    {job.imageCount ? (
                      <span className="text-[12px] text-[#b0a099]">{t(s.imageCount, { n: job.imageCount })}</span>
                    ) : null}
                    {inUse(job) ? (
                      <span className="rounded-full bg-[#eafaf1] px-2 py-0.5 text-[11px] font-bold text-[#3fae76]">
                        {s.inUse}
                      </span>
                    ) : job.status === "READY" ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          if (!window.confirm(s.confirmUse)) return;
                          void run(job.id, async () => {
                            await call(`/api/ai/lora/jobs/${job.id}/activate`);
                            await refresh();
                          });
                        }}
                        className="ml-auto rounded-[10px] bg-[#fff4f6] px-3 py-1 text-[12px] font-bold text-[#ef7488] hover:bg-[#ffe9ee] disabled:opacity-50"
                      >
                        {s.useThis}
                      </button>
                    ) : job.status === "FAILED" ? (
                      <span className="rounded-full bg-[#fdecec] px-2 py-0.5 text-[11px] font-bold text-[#d46565]">
                        {s.failed}
                      </span>
                    ) : null}
                  </div>
                  {job.status === "FAILED" && job.errorMsg && (
                    <p className="mt-1 text-[12px] text-[#d46565]">{job.errorMsg}</p>
                  )}
                  {job.status === "READY" &&
                    (job.previews?.length ? (
                      <div className="mt-2 flex gap-2">
                        {job.previews.map((p) => (
                          <img
                            key={p.assetId}
                            src={p.url}
                            alt={p.angle}
                            className="h-24 w-24 rounded-[12px] bg-[#fbf4f1] object-cover"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[12px] text-[#b0a099]">{s.previewsPending}</p>
                    ))}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
