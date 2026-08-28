# AI 模型路由与成本控制

所有 LLM / 生图 / TTS 调用统一走中转站网关。**「什么时候调哪个模型」由场景决定，不由调用点自己决定。**

```
调用点  →  AiScene  →  SceneConfig(档位/上限/上下文预算)  →  预算守卫  →  gateway  →  记账
```

| 文件 | 职责 |
|------|------|
| `src/lib/ai/gateway.ts` | 怎么调 —— 三协议适配、超时、重试、用量解析 |
| `src/lib/ai/model-router.ts` | 调哪个 —— 场景表、档位、预算守卫、失败降档 |
| `src/lib/ai/usage.ts` | 花了多少 —— 每次调用落 `AiUsageLog` |

---

## 一、三协议自动选择

中转站同时暴露三套协议，按模型名前缀自动路由：

| 模型名前缀 | 协议 | 路径 | 鉴权头 |
|---|---|---|---|
| `gemini*` | gemini | `/v1beta/models/{model}:generateContent` | `x-goog-api-key` |
| `claude*` | anthropic | `/v1/messages` | `x-api-key` + `anthropic-version` |
| 其余 | openai | `/v1/chat/completions` | `Authorization: Bearer` |

生图走 `/v1/images/generations`，TTS 走 `/v1/audio/speech`（都是 OpenAI 兼容格式）。

若中转站已把全部模型归一到 OpenAI 协议，设 `AI_GATEWAY_PROTOCOL=openai` 一把强制，省得逐个判断。

---

## 二、四个档位

档位只是**环境变量里的模型名**，随时可换，代码不动：

| 档位 | 环境变量 | 用途 |
|------|----------|------|
| `nano` | `AI_MODEL_NANO` | 最便宜的小模型 —— 评论回复、审核判定 |
| `fast` | `AI_MODEL_FAST` | 便宜 —— 免费用户聊天、LoRA 配套文案 |
| `balanced` | `AI_MODEL_BALANCED` | 中档 —— 订阅用户聊天、SNS 文案草稿 |
| `flagship` | `AI_MODEL_FLAGSHIP` | 旗舰 —— 付费订单文案、订阅用户塔罗长文 |

降档链：`flagship → balanced → fast → nano`。

---

## 三、场景路由表

分档三个维度：**谁在付钱** / **输出多显眼** / **调用多频繁**。

| 场景 | 调用点 | 档位 | maxTokens | 历史 | 记忆 | 可降档 | 理由 |
|------|--------|------|-----------|------|------|--------|------|
| `chat.subscribed` | `/api/chat` 订阅用户 | balanced | 320 | 20 条 | 8 条 | 否 | 付费核心体验，预算再紧也不动 |
| `chat.free` | `/api/chat` 免费用户 | fast | 200 | 8 条 | 4 条 | 是 | 每日 10 条免费额度，拉新成本压到最低 |
| `chat.creator` | 画师自测自己的角色 | fast | 260 | 10 条 | 4 条 | 是 | 无收入，够用即可 |
| `skill.tarot.paid` | 塔罗（订阅） | flagship | 700 | — | 4 条 | 否 | 长文展示性强，是订阅卖点 |
| `skill.tarot.free` | 塔罗（demo free） | balanced | 480 | — | 2 条 | 是 | 免费体验，砍掉三成输出 |
| `post.comment` | 帖子评论自动回复 | **nano** | 100 | — | 0 | 是 | 量最大、输出最短，是最大的成本黑洞 |
| `post.draft` | 画师 SNS 文案草稿 | balanced | 220 | — | 0 | 是 | 画师主动触发，量小但要质量 |
| `lora.caption` | LoRA 出图配套文案 | fast | 200 | — | 0 | 是 | 批量伴随出图 |
| `order.voiceText` | 生日/叫醒/定制语音 | flagship | 160 | — | 0 | 否 | 单次付费订单，字少钱多 |
| `moderation` | 内容审核判定 | nano | 16 | — | 0 | 是 | 只要一个标签 |

改档位不用改代码：

```bash
AI_SCENE_TIER_OVERRIDES='{"chat.free":"nano","skill.tarot.free":"fast"}'
```

### 换模型之外的三个旋钮

输入 token 常常比输出更烧钱，**截上下文比换模型更有效**：

- `historyMessages` —— 免费用户只送 8 条历史，订阅用户送 20 条
- `memoryTopK` + `memoryCharCap` —— 免费用户 4 条 x 120 字，订阅用户 8 条 x 200 字
- `maxTokens` —— 每个场景单独封顶

另外，Anthropic 协议下人设 system prompt 自动带 `cache_control: ephemeral`（`cacheSystem: true` 的场景）。人设 prompt 每轮都一样，缓存命中后这部分输入近乎免费 —— 聊天场景全开。

**记忆抽取刻意不上模型。** `memos-plugin` 的 `extractMemorableFacts` 是正则实现，每轮对话都跑，一旦换成 LLM 调用量直接翻倍。

---

## 四、生图：LoRA 优先，网关兜底

```
角色 adapter READY + LORA_INFERENCE_API_URL 已配
   |- 自建 LoRA 推理            <- 首选：自有算力，人设一致性最好
        v 未配置 / 未训练 / 失败
      AI_MODEL_IMAGE 已配
        |- 网关通用图像模型       <- 兜底：prompt 里补人设描述，质量次一档
             v 失败
           复用训练集 / 封面图     <- 最后：Demo 行为，不产生费用
```

`AI_MODEL_IMAGE` 留空 = 不启用网关兜底，只走自建 LoRA 和训练集复用。

网关返回 base64 时自动落盘到 `public/uploads/generated/{characterId}/`，返回 http URL 时原样存。

TTS 同理：声纹克隆服务 → 网关通用 TTS（丢角色声线）→ 无语音。

---

## 五、预算守卫

```bash
AI_DAILY_OUTPUT_TOKEN_BUDGET=2000000   # 0 或留空 = 不限
```

按日本时间切日，统计当日 `AiUsageLog` 输出 token：

| 用量 | 动作 |
|------|------|
| < 80% | 正常 |
| >= 80% | 「可降档」场景降一档（`chat.free` fast→nano） |
| >= 100% | 「可降档」场景全压 nano，且 maxTokens 砍到 160 |

`downgradable: false` 的场景（订阅聊天、订阅塔罗、付费订单）**永远不受影响** —— 省钱不能省到付了钱的人头上。

另外，任一档位调用失败会自动沿降档链换更便宜的模型重试，所以配错一个模型名不会导致整条链路挂掉。

---

## 六、验证与观测

```bash
npm run ai:smoke          # 三协议连通性 + 模型清单 + 各档位延迟
npm run db:push           # 建 AiUsageLog 表（首次必须）
```

`GET /api/ai/usage?days=7`（ADMIN）返回按 scene / model 聚合的用量、当前档位映射、预算状态。

服务端每次调用打一行结构化日志：

```
[ai-usage] scene=chat.free tier=fast model=... proto=openai in=812 cached=640 out=96 ms=1240 ok=true
```

`cached` 越接近 `in`，说明 prompt 缓存命中越好。
