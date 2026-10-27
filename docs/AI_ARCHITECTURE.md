# Nichijou AI 底层架构

## 对话 Pipeline（四步）

```
用户消息
    │
    ▼
┌──────────────────────────┐
│ 1. PostgreSQL Memory Query │  ← 检索 user×character 永久记忆
└──────────┬───────────────┘
           ▼
┌──────────────────────┐
│ 2. LoRA Resolve      │  ← 加载角色 adapter（若已训练）
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ 3. LLM Generate      │  ← 记忆 + LoRA 注入 system prompt
└──────────┬───────────┘
           ▼
┌──────────────────────────┐
│ 4. Memory Store + Bond     │  ← 去重写入；失败不阻断回复
└──────────┬───────────────┘
           ▼
        角色回复
```

代码入口：`src/lib/ai/pipeline.ts` → `runChatPipeline()`

---

## 三大核心能力

### 1. LoRA 角色形象 / 人设训练

| 项 | 说明 |
|----|------|
| 目的 | 每个 Character 独立 LoRA adapter，形象与说话风格与画师设定高度一致 |
| 画师流程 | Studio → 角色 → **LoRA 训练**（设定 → 数据集上传标注 → 配方 → 确认）→ **LoRA 生成** |
| 触发 | `POST /api/ai/lora` `{ characterId, datasetImages, triggerWord, baseModel, recipe }` |
| 上传 | `POST /api/ai/lora/upload` multipart `files` + `characterId` |
| 生成 | `POST /api/ai/lora/generate` `{ characterId, prompt, weight, steps, batch }` |
| 参数 | networkDim/alpha/epochs 可配；默认面向角色精调 |
| 状态 | `Character.loraStatus`: NONE → QUEUED → TRAINING → READY（轮询 `GET /api/ai/lora` 推进模拟进度） |

### 2. TTS 5 秒声纹克隆

| 项 | 说明 |
|----|------|
| 目的 | 最短 **5 秒**参考音频提取 embedding，用于全部语音合成 |
| 触发 | `POST /api/ai/voice` `{ characterId, sampleAudioUrl, durationSec }` |
| 校验 | `durationSec >= 5` 且 `<= 15` |
| 合成 | 定制订单 / 叫床 / 生日祝福 → `synthesizeWithVoiceClone()` |
| 存储 | `VoiceProfile.embeddingId` → `Character.voiceEmbeddingId` |

### 3. PostgreSQL 永久记忆

| 项 | 说明 |
|----|------|
| 目的 | AI 角色拥有**永久记忆**，跨会话记住用户偏好与关系 |
| Query | 每次对话前查询 `CharacterMemory`，按关键词与重要度召回 |
| Store | 对话后按内容哈希去重写入，失败不阻断角色回复 |
| 存储 | 统一使用 `DATABASE_URL` 指向的 PostgreSQL，不再切换远程与本地数据源 |
| 删除 | 设置页 / `DELETE /api/ai/memory`，本地事务删除记忆、聊天、关系与请求记录 |
| 调试 | `POST /api/ai/memory` 查看检索结果 |

---

## 环境变量

```bash
# 永久记忆使用 DATABASE_URL 指向的 PostgreSQL

# LoRA 训练 & 推理
LORA_TRAINING_API_URL=
LORA_TRAINING_API_KEY=
LORA_INFERENCE_API_URL=

# TTS 声纹克隆（本地默认独立进程 :3210）
TTS_CLONE_API_URL=http://127.0.0.1:3210
TTS_CLONE_API_KEY=

# LLM / 生图 / TTS 统一网关（中转站）—— 见 AI_ROUTING.md
AI_GATEWAY_BASE_URL=
AI_GATEWAY_API_KEY=
AI_MODEL_NANO=
AI_MODEL_FAST=
AI_MODEL_BALANCED=
AI_MODEL_FLAGSHIP=
AI_MODEL_IMAGE=
```

未配置外部服务时，LoRA 模拟训练完成，TTS 降级网关通用 TTS。

模型选择策略（按场景分档、预算守卫、失败降档）见 [`AI_ROUTING.md`](AI_ROUTING.md)。

---

## 文件结构

```
src/lib/ai/
├── pipeline.ts        # 主链路编排
├── memos-plugin.ts    # PostgreSQL 记忆 query/store（保留历史文件名）
├── lora.ts            # LoRA 训练 & adapter 解析
├── tts-voice-clone.ts # 5 秒声纹 & 克隆合成
├── llm.ts             # LLM 推理（记忆+LoRA 注入）
└── types.ts           # 类型定义
```
