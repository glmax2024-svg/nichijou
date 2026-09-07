/**
 * LoRA 角色形象 / 人设适配层
 *
 * 画师上传参考图 → 训练独立 adapter → 用 trigger + prompt 生成内容。
 * 未配置外部训练服务时，走本地进度模拟（适合演示）。
 */

import { prisma } from "@/lib/prisma";
import { FailClosedError, isDemoMode } from "@/lib/runtime";
import { putUpload } from "@/lib/storage";
import { gatewayImage } from "./gateway";
import { IMAGE_MODEL } from "./model-router";
import type {
  CharacterPersona,
  LoraAdapterConfig,
  LoraGenerateInput,
  LoraGenerateResult,
  LoraTrainInput,
  LoraTrainResult,
} from "./types";

const LORA_API_URL = process.env.LORA_TRAINING_API_URL;
const LORA_API_KEY = process.env.LORA_TRAINING_API_KEY;
const LORA_INFERENCE_URL = process.env.LORA_INFERENCE_API_URL;
const LORA_INFERENCE_API_KEY = process.env.LORA_INFERENCE_API_KEY;

const DEFAULT_WEIGHT = 0.85;

export type DatasetImage = {
  url: string;
  caption: string;
};

export function loraWorkerHeaders(apiKey: string | undefined, characterId: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Nichijou-Character-Id": characterId,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export async function resolveLoraAdapter(
  character: CharacterPersona,
): Promise<LoraAdapterConfig | null> {
  if (character.loraStatus !== "READY" || !character.loraAdapterId) {
    return null;
  }

  return {
    adapterId: character.loraAdapterId,
    version: character.loraVersion ?? 0,
    status: character.loraStatus,
    weightHint: DEFAULT_WEIGHT,
    triggerWord: character.triggerWord,
  };
}

export async function enqueueLoraTraining(input: LoraTrainInput): Promise<LoraTrainResult> {
  const {
    characterId,
    personality,
    speechStyle,
    bio,
    referenceImageUrls,
    datasetImages,
    triggerWord,
    baseModel,
    recipe,
  } = input;

  const images =
    datasetImages ??
    (referenceImageUrls ?? []).map((url) => ({ url, caption: "" }));

  if (images.length < 5) {
    throw new Error("训练至少需要 5 张参考图");
  }

  const job = await prisma.loraTrainingJob.create({
    data: {
      characterId,
      status: "QUEUED",
      progress: 0,
      triggerWord: triggerWord || null,
      baseModel: baseModel || "sdxl",
      recipeJson: recipe ? JSON.stringify(recipe) : null,
      datasetNote: JSON.stringify({
        personality,
        speechStyle,
        bio,
        images,
        triggerWord,
        baseModel,
        recipe,
      }),
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: { loraStatus: "QUEUED", triggerWord: triggerWord || undefined },
  });

  if (LORA_API_URL && LORA_API_KEY) {
    try {
      return await trainLoraRemote(job.id, input, images);
    } catch (err) {
      console.error("[lora] remote training failed:", err);
      if (!isDemoMode()) {
        await markJobFailed(job.id, characterId, err);
        throw err instanceof Error ? err : new Error("LoRA 训练服务调用失败");
      }
    }
  }

  if (!isDemoMode()) {
    await markJobFailed(job.id, characterId, new Error("LoRA training API missing"));
    throw new FailClosedError("LoRA 训练服务未配置", "LORA_TRAINING_UNAVAILABLE");
  }

  return startSimulatedTraining(job.id, characterId, triggerWord);
}

async function markJobFailed(jobId: string, characterId: string, err: unknown) {
  const errorMsg = err instanceof Error ? err.message : "training failed";
  await prisma.loraTrainingJob.update({
    where: { id: jobId },
    data: { status: "FAILED", errorMsg, finishedAt: new Date() },
  });
  await prisma.character.update({
    where: { id: characterId },
    data: { loraStatus: "FAILED" },
  });
}

async function trainLoraRemote(
  jobId: string,
  input: LoraTrainInput,
  images: DatasetImage[],
): Promise<LoraTrainResult> {
  const recipe = input.recipe ?? {};
  const res = await fetch(`${LORA_API_URL}/v1/lora/train`, {
    method: "POST",
    headers: loraWorkerHeaders(LORA_API_KEY, input.characterId),
    body: JSON.stringify({
      job_id: jobId,
      character_id: input.characterId,
      trigger: input.triggerWord,
      base_model: input.baseModel ?? "sdxl",
      persona: {
        personality: input.personality,
        speech_style: input.speechStyle,
        bio: input.bio,
      },
      reference_images: images.map((img) => ({
        url: img.url,
        caption: img.caption,
      })),
      config: {
        rank: recipe.networkDim ?? 32,
        alpha: recipe.alpha ?? 16,
        epochs: recipe.epochs ?? 10,
        repeats: recipe.repeats ?? 13,
        resolution: recipe.resolution ?? 1024,
        optimizer: recipe.optimizer ?? "AdamW8bit",
        target_modules: ["q_proj", "v_proj", "k_proj", "o_proj"],
        learning_rate: 1e-4,
      },
    }),
  });

  if (!res.ok) throw new Error(`LoRA training API error: ${res.status}`);

  const data = (await res.json()) as { adapter_id: string; status: string };

  await prisma.loraTrainingJob.update({
    where: { id: jobId },
    data: {
      status: "TRAINING",
      progress: 8,
      adapterId: data.adapter_id,
      startedAt: new Date(),
    },
  });

  await prisma.character.update({
    where: { id: input.characterId },
    data: { loraStatus: "TRAINING", loraAdapterId: data.adapter_id },
  });

  return { jobId, status: "TRAINING", adapterId: data.adapter_id, progress: 8 };
}

/** Demo: enter TRAINING; progress advanced by polling. */
async function startSimulatedTraining(
  jobId: string,
  characterId: string,
  triggerWord?: string,
): Promise<LoraTrainResult> {
  const adapterId = `lora_${characterId.slice(0, 8)}_${Date.now().toString(36)}`;

  await prisma.loraTrainingJob.update({
    where: { id: jobId },
    data: {
      status: "TRAINING",
      progress: 6,
      adapterId,
      triggerWord: triggerWord || null,
      startedAt: new Date(),
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: {
      loraStatus: "TRAINING",
      loraAdapterId: adapterId,
      triggerWord: triggerWord || undefined,
    },
  });

  return { jobId, status: "TRAINING", adapterId, progress: 6 };
}

/**
 * 画师页轮询时推进模拟进度；远程任务仅原样返回。
 */
export async function tickLoraJobProgress(characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      loraAdapterId: true,
      loraStatus: true,
      loraVersion: true,
      loraJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!character) return null;

  const latest = character.loraJobs[0];
  if (!latest) {
    return {
      loraAdapterId: character.loraAdapterId,
      loraStatus: character.loraStatus,
      loraVersion: character.loraVersion,
      loraJobs: [],
      activeJob: null,
    };
  }

  let activeJob = latest;

  if (
    LORA_API_URL &&
    LORA_API_KEY &&
    (latest.status === "TRAINING" || latest.status === "QUEUED")
  ) {
    try {
      activeJob = (await syncRemoteLoraJob(characterId, latest)) ?? latest;
    } catch (err) {
      console.error("[lora] worker job sync failed:", err);
    }
  } else if (
    isDemoMode() &&
    !LORA_API_URL &&
    (latest.status === "TRAINING" || latest.status === "QUEUED") &&
    latest.progress < 100
  ) {
    const bump = latest.progress < 20 ? 14 : latest.progress < 60 ? 18 : latest.progress < 90 ? 12 : 10;
    const nextProgress = Math.min(100, latest.progress + bump);

    if (nextProgress >= 100) {
      activeJob = await prisma.loraTrainingJob.update({
        where: { id: latest.id },
        data: {
          status: "READY",
          progress: 100,
          finishedAt: new Date(),
        },
      });

      await prisma.character.update({
        where: { id: characterId },
        data: {
          loraStatus: "READY",
          loraAdapterId: latest.adapterId,
          loraVersion: { increment: 1 },
          triggerWord: latest.triggerWord ?? undefined,
        },
      });
    } else {
      activeJob = await prisma.loraTrainingJob.update({
        where: { id: latest.id },
        data: {
          status: "TRAINING",
          progress: nextProgress,
        },
      });

      if (character.loraStatus !== "TRAINING") {
        await prisma.character.update({
          where: { id: characterId },
          data: { loraStatus: "TRAINING" },
        });
      }
    }
  }

  const refreshed = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      loraAdapterId: true,
      loraStatus: true,
      loraVersion: true,
      loraJobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return {
    ...refreshed!,
    activeJob,
  };
}

export function buildLoraSystemAugment(config: LoraAdapterConfig | null): string {
  if (!config) {
    return "";
  }

  const trigger = config.triggerWord ? `\ntrigger: ${config.triggerWord}` : "";
  return `
[LoRA Adapter Active]
adapter_id: ${config.adapterId}
weight: ${config.weightHint}${trigger}
instruction: 严格遵循 LoRA 微调后的人设权重，保持角色说话风格一致性，禁止 OOC（Out of Character）。`;
}

export async function getLoraJobStatus(jobId: string) {
  return prisma.loraTrainingJob.findUnique({ where: { id: jobId } });
}

function mapWorkerStatus(status: string): "QUEUED" | "TRAINING" | "READY" | "FAILED" {
  const normalized = status.toLowerCase();
  if (normalized === "ready" || normalized === "succeeded" || normalized === "success") return "READY";
  if (normalized === "failed" || normalized === "error") return "FAILED";
  if (normalized === "queued" || normalized === "pending") return "QUEUED";
  return "TRAINING";
}

async function syncRemoteLoraJob(
  characterId: string,
  job: { id: string; adapterId: string | null; triggerWord: string | null },
) {
  if (!LORA_API_URL || !LORA_API_KEY) return null;
  const res = await fetch(`${LORA_API_URL}/v1/lora/jobs/${job.id}`, {
    headers: loraWorkerHeaders(LORA_API_KEY, characterId),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    progress?: number;
    adapter_id?: string;
  };
  const status = mapWorkerStatus(data.status ?? "training");
  const progress = Math.max(0, Math.min(100, Number(data.progress) || 0));
  const adapterId = data.adapter_id || job.adapterId;

  const updated = await prisma.loraTrainingJob.update({
    where: { id: job.id },
    data: {
      status,
      progress: status === "READY" ? 100 : progress,
      adapterId,
      finishedAt: status === "READY" || status === "FAILED" ? new Date() : undefined,
      errorMsg: status === "FAILED" ? "worker reported failure" : undefined,
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: {
      loraStatus: status,
      loraAdapterId: adapterId ?? undefined,
      triggerWord: job.triggerWord ?? undefined,
      ...(status === "READY" ? { loraVersion: { increment: 1 } } : {}),
    },
  });

  return updated;
}

function parseDatasetImages(datasetNote: string | null): DatasetImage[] {
  if (!datasetNote) return [];
  try {
    const data = JSON.parse(datasetNote) as {
      images?: DatasetImage[];
      referenceImageUrls?: string[];
    };
    if (Array.isArray(data.images) && data.images.length > 0) {
      return data.images.filter((img) => img?.url);
    }
    if (Array.isArray(data.referenceImageUrls)) {
      return data.referenceImageUrls.map((url) => ({ url, caption: "" }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

/**
 * 用已训练 LoRA 生成内容：图（优先推理 API / 否则复用训练集）+ SNS 文案。
 */
export async function generateWithLora(
  input: LoraGenerateInput,
): Promise<LoraGenerateResult> {
  const character = await prisma.character.findUnique({
    where: { id: input.characterId },
    select: {
      id: true,
      name: true,
      personality: true,
      speechStyle: true,
      bio: true,
      identity: true,
      worldRules: true,
      brandVoice: true,
      boundaries: true,
      contentRating: true,
      tagline: true,
      triggerWord: true,
      avatarUrl: true,
      coverUrl: true,
      loraAdapterId: true,
      loraStatus: true,
      loraVersion: true,
      voiceEmbeddingId: true,
      loraJobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!character) {
    throw new Error("角色不存在");
  }

  const allowDemo = isDemoMode() && Boolean(input.allowDemo);
  if (
    (!character.loraAdapterId || character.loraStatus !== "READY") &&
    !allowDemo
  ) {
    throw new Error("请先完成 LoRA 训练后再生成");
  }

  const adapterId =
    character.loraAdapterId ?? `demo_${character.id}_${Date.now().toString(36)}`;

  const latestJob = character.loraJobs[0];
  const dataset = parseDatasetImages(latestJob?.datasetNote ?? null);
  const trigger = latestJob?.triggerWord?.trim() || character.triggerWord?.trim();
  const weight = input.weight ?? DEFAULT_WEIGHT;
  const steps = input.steps ?? 28;
  const batch = Math.min(4, Math.max(1, input.batch ?? 1));

  const promptRaw = input.prompt.trim();
  const fullPrompt =
    trigger && !promptRaw.toLowerCase().startsWith(trigger.toLowerCase())
      ? `${trigger}, ${promptRaw}`
      : promptRaw;

  const textContent = await composeGenerationText(
    { ...character, loraAdapterId: adapterId, loraStatus: "READY" },
    fullPrompt,
    weight,
  );

  if (LORA_INFERENCE_URL && character.loraAdapterId) {
    try {
      const remote = await generateImageRemote({
        characterId: character.id,
        adapterId: character.loraAdapterId,
        prompt: fullPrompt,
        negativePrompt: input.negativePrompt,
        weight,
        steps,
        batch,
      });
      const results: LoraGenerateResult["items"] = [];
      for (let i = 0; i < remote.images.length; i++) {
        const row = await prisma.loraGeneration.create({
          data: {
            characterId: character.id,
            prompt: fullPrompt,
            negativePrompt: input.negativePrompt ?? null,
            imageUrl: remote.images[i],
            textContent: i === 0 ? textContent : null,
            weight,
            steps,
            status: "READY",
          },
        });
        results.push({
          id: row.id,
          imageUrl: row.imageUrl,
          textContent: row.textContent,
          prompt: row.prompt,
        });
      }
      return { items: results, adapterId: character.loraAdapterId, triggerWord: trigger ?? null };
    } catch (err) {
      console.error("[lora] remote generate failed:", err);
      if (!isDemoMode() && !IMAGE_MODEL) {
        throw err instanceof Error ? err : new Error("LoRA 推理失败");
      }
    }
  }

  // 2. 网关图像模型兜底 —— LoRA 未就绪 / 未配置 / 调用失败时才走，保证「LoRA 优先」
  if (IMAGE_MODEL) {
    try {
      const remote = await gatewayImage({
        model: IMAGE_MODEL,
        prompt: buildGatewayImagePrompt(character.name, character.bio, fullPrompt, trigger),
        negativePrompt: input.negativePrompt,
        n: batch,
      });

      const results: LoraGenerateResult["items"] = [];
      for (let i = 0; i < remote.images.length; i++) {
        const imageUrl = await persistGeneratedImage(character.id, remote.images[i]);
        const row = await prisma.loraGeneration.create({
          data: {
            characterId: character.id,
            prompt: fullPrompt,
            negativePrompt: input.negativePrompt ?? null,
            imageUrl,
            textContent: i === 0 ? textContent : null,
            weight,
            steps,
            status: "READY",
          },
        });
        results.push({
          id: row.id,
          imageUrl: row.imageUrl,
          textContent: row.textContent,
          prompt: row.prompt,
        });
      }
      if (results.length > 0) {
        return { items: results, adapterId, triggerWord: trigger ?? null };
      }
    } catch (err) {
      console.error("[lora] gateway image fallback failed:", err);
      if (!isDemoMode()) {
        throw err instanceof Error ? err : new Error("生图服务失败");
      }
    }
  }

  if (!isDemoMode()) {
    throw new FailClosedError("生图服务未配置", "IMAGE_UNAVAILABLE");
  }

  const pool =
    [
      ...(input.coverUrl ? [input.coverUrl] : []),
      ...dataset.map((d) => d.url),
      character.coverUrl,
      character.avatarUrl,
    ].filter(Boolean) as string[];

  if (pool.length === 0) {
    throw new Error("没有可用于生成的参考图");
  }

  const results: LoraGenerateResult["items"] = [];
  for (let i = 0; i < batch; i++) {
    const imageUrl = pool[(Date.now() + i) % pool.length];
    const row = await prisma.loraGeneration.create({
      data: {
        characterId: character.id,
        prompt: fullPrompt,
        negativePrompt: input.negativePrompt ?? null,
        imageUrl,
        textContent: i === 0 ? textContent : textContent,
        weight,
        steps,
        status: "READY",
      },
    });
    results.push({
      id: row.id,
      imageUrl: row.imageUrl,
      textContent: row.textContent,
      prompt: row.prompt,
    });
  }

  return {
    items: results,
    adapterId,
    triggerWord: trigger ?? null,
  };
}

async function generateImageRemote(params: {
  characterId: string;
  adapterId: string;
  prompt: string;
  negativePrompt?: string;
  weight: number;
  steps: number;
  batch: number;
}): Promise<{ images: string[] }> {
  const headers = loraWorkerHeaders(LORA_INFERENCE_API_KEY, params.characterId);
  const res = await fetch(`${LORA_INFERENCE_URL}/v1/images/generations`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      adapter_id: params.adapterId,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      weight: params.weight,
      steps: params.steps,
      n: params.batch,
    }),
  });
  if (!res.ok) throw new Error(`LoRA image API error: ${res.status}`);
  const data = (await res.json()) as { images?: string[]; data?: { url: string }[] };
  const images =
    data.images ??
    data.data?.map((d) => d.url) ??
    [];
  if (images.length === 0) throw new Error("empty image response");
  return { images };
}

async function composeGenerationText(
  character: Pick<
    CharacterPersona,
    "name" | "personality" | "speechStyle" | "loraAdapterId" | "loraStatus"
  >,
  prompt: string,
  weight: number,
): Promise<string> {
  const { generatePostDraft } = await import("./llm");
  const loraConfig: LoraAdapterConfig = {
    adapterId: character.loraAdapterId!,
    version: 0,
    status: "READY",
    weightHint: weight,
  };

  try {
    const draft = await generatePostDraft(
      {
        id: "",
        name: character.name,
        personality: `${character.personality}\n生成主题: ${prompt}`,
        speechStyle: character.speechStyle,
        bio: "",
        loraAdapterId: character.loraAdapterId,
        loraStatus: "READY",
        voiceEmbeddingId: null,
      },
      loraConfig,
      "lora.caption",
    );
    if (draft) return draft;
  } catch {
    /* fall through */
  }

  return `${character.name}の今日：${prompt.slice(0, 48)}… この感じ、ちゃんと残しておきたくて。`;
}

/**
 * 网关通用图像模型没有角色 LoRA，只能靠 prompt 把人设描述补回来。
 * 质量不如自建 adapter —— 所以它只是兜底，不是首选。
 */
function buildGatewayImagePrompt(
  name: string,
  bio: string,
  prompt: string,
  trigger?: string,
): string {
  const persona = bio ? `Character reference: ${bio.slice(0, 240)}.` : "";
  const triggerHint = trigger ? `Character token: ${trigger}.` : "";
  return [
    `Anime-style illustration of the character "${name}".`,
    persona,
    triggerHint,
    `Scene: ${prompt}`,
    "Consistent character design, clean lineart, soft lighting, high detail.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 远程 URL 原样返回；base64 data URI 写入存储层。 */
async function persistGeneratedImage(characterId: string, image: string): Promise<string> {
  if (!image.startsWith("data:")) return image;

  const match = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.*)$/);
  if (!match) return image;

  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const stored = await putUpload({
    kind: "generated",
    characterId,
    body: Buffer.from(match[2], "base64"),
    contentType: `image/${match[1] === "jpg" ? "jpeg" : match[1]}`,
    ext,
  });
  return stored.url;
}
