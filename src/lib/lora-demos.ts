/**
 * 画师工作室「已完成 LoRA」演示条目。
 * CivitAI 不可达时使用本地素材；字段形态对齐导入后的库卡片。
 */

export type DemoLoraCard = {
  id: string;
  name: string;
  trigger: string;
  baseModel: string;
  kind: "image";
  coverUrl: string;
  previewUrls: string[];
  description: string;
  source: "demo" | "trained";
  sourceLabel: string;
  sourceUrl?: string;
  downloads: number;
  fileSizeMb: number;
  version: string;
  trainedAtLabel: string;
  tags: string[];
};

/** Two ready demo LoRAs for offline showcase. */
export const DEMO_COMPLETED_LORAS: DemoLoraCard[] = [
  {
    id: "demo-lora-school-soft",
    name: "School Soft Portrait",
    trigger: "softschool_aoi",
    baseModel: "Pony",
    kind: "image",
    coverUrl: "/characters/aoi/gallery-1.png",
    previewUrls: [
      "/characters/aoi/gallery-1.png",
      "/characters/aoi/gallery-2.png",
      "/characters/aoi/gallery-3.png",
    ],
    description:
      "校园软光人像 LoRA。适合放課后、窗边、制服日常。Trigger 放在 prompt 最前，权重 0.7–0.9。",
    source: "demo",
    sourceLabel: "Demo · CivitAI 风格导入",
    sourceUrl: "https://civitai.com/models",
    downloads: 12840,
    fileSizeMb: 72,
    version: "v1.2",
    trainedAtLabel: "3 日前",
    tags: ["character", "school", "portrait", "pony"],
  },
  {
    id: "demo-lora-cafe-mood",
    name: "Cafe Artist Mood",
    trigger: "cafemio_mood",
    baseModel: "SDXL 1.0",
    kind: "image",
    coverUrl: "/characters/mio/gallery-1.png",
    previewUrls: [
      "/characters/mio/gallery-1.png",
      "/characters/mio/gallery-2.png",
      "/characters/mio/gallery-3.png",
      "/characters/mio-showcase-1.png",
    ],
    description:
      "咖啡店 / 艺术系氛围风格 LoRA。拉花、橱窗、傍晚街景更稳。建议与角色 LoRA 叠加时把本风格权重降到 0.55。",
    source: "demo",
    sourceLabel: "Demo · CivitAI 风格导入",
    sourceUrl: "https://civitai.com/models",
    downloads: 8620,
    fileSizeMb: 118,
    version: "v2.0",
    trainedAtLabel: "1 周前",
    tags: ["style", "cafe", "artist", "sdxl"],
  },
];
