"use client";

import { useEffect, useState } from "react";
import { LoraTrainWizard } from "./lora-train-wizard";
import { AnimaTrainPanel, type TrainingStatusPayload } from "./anima-train-panel";

/**
 * 训练 tab：配置了 Anima 训练服务时用新流程（自动标注、固定参数、版本管理），
 * 否则沿用旧的配方向导（本地演示 / 模拟训练）。
 */
export function LoraTrainTab(props: { characterId: string; characterName: string; suggestedTrigger: string }) {
  const [status, setStatus] = useState<TrainingStatusPayload | null>(null);
  const [failed, setFailed] = useState(false);

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

  if (failed) return <LoraTrainWizard {...props} />;
  if (!status) {
    return <div className="h-48 animate-pulse rounded-[28px] bg-white/70" aria-busy />;
  }
  return status.trainingMode === "anima" ? (
    <AnimaTrainPanel characterId={props.characterId} characterName={props.characterName} initialStatus={status} />
  ) : (
    <LoraTrainWizard {...props} />
  );
}
