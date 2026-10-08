"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { LoraTrainWizard } from "./lora-train-wizard";
import { AnimaTrainPanel, type TrainingStatusPayload } from "./anima-train-panel";

/**
 * 训练 tab：配置了 Anima 训练服务时用新流程（自动标注、固定参数、版本管理），
 * 只配置了通用外部训练服务时用旧的配方向导，都没配置时提示不可用。
 */
export function LoraTrainTab(props: { characterId: string; characterName: string; suggestedTrigger: string }) {
  const [status, setStatus] = useState<TrainingStatusPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const { dict } = useLocale();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ai/lora?characterId=${props.characterId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: TrainingStatusPayload) => !cancelled && setStatus(data))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [props.characterId]);

  if (failed) return <Notice>{dict.studio.trainStatusFailed}</Notice>;
  if (!status) {
    return <div className="h-48 animate-pulse rounded-[28px] bg-white/70" aria-busy />;
  }
  if (status.trainingMode === "anima") {
    return <AnimaTrainPanel characterId={props.characterId} characterName={props.characterName} initialStatus={status} />;
  }
  if (status.trainingMode === "legacy") return <LoraTrainWizard {...props} />;
  return <Notice>{dict.studio.trainUnavailable}</Notice>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-white/70 px-6 py-10 text-center text-[14px] text-[#8a7a72]">{children}</div>
  );
}
