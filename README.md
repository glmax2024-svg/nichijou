# 日常 Nichijou

画师が創る AI キャラクターの「日常」を追いかける陪伴プラットフォーム。

## 特徴

- **画师スタジオ** — キャラクターの形象・性格・話し方を設定し、SNS 風の日常を投稿
- **粉丝体验** — 订阅、ギフト、誕生日祝福、モーニングコール（TTS）
- **混合 AI** — 画师が手書き + AI 下書き/チャット返信（キャラ設定に沿う）
- **日本市場向け** — 日语 UI、Stripe 決済（本番）

## AI 底层能力

| 能力 | 说明 |
|------|------|
| **LoRA 人设训练** | 每角色独立 adapter，保证对话不 OOC |
| **5 秒声纹 TTS** | 最短 5 秒参考音频克隆角色声线 |
| **Memos 永久记忆** | 每次对话强制 query/store，跨会话记住用户 |

| **成本分档路由** | 全部 AI 调用走中转站网关，按场景选模型档位 + 预算守卫 |

详见 [`docs/AI_ARCHITECTURE.md`](docs/AI_ARCHITECTURE.md) 与 [`docs/AI_ROUTING.md`](docs/AI_ROUTING.md)

## 技術スタック

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL（`docker-compose.yml`）
- NextAuth.js（Credentials 登录）
- OpenAI API（チャット・下書き・TTS）
- Stripe（订阅・单次付费，未配置时 Demo 模式）

## クイックスタート

```bash
cd ~/Projects/nichijou
cp .env.example .env   # 已有 .env 可跳过，确认 DATABASE_URL 指向 Postgres
npm install
npm run db:up          # 启动 PostgreSQL
npm run db:setup       # 创建数据库 + 种子数据
npm run worker:lora    # 可选：独立 LoRA 算力进程（:3200）
npm run worker:voice   # 可选：独立声纹进程（:3210）
npm run worker:memos   # 可选：独立记忆进程（:3220）
npm run dev
```

浏览器打开 [http://localhost:3100](http://localhost:3100)

### デモアカウント

| 角色 | メール | パスワード |
|------|--------|------------|
| 画师 | creator@demo.jp | demo123 |
| 運営 | admin@demo.jp | demo123 |
| ファン | fan@demo.jp | demo123 |

デモキャラ「葵」: `/characters/aoi`

## 環境変数

见 `.env.example`。开发环境只需 `DATABASE_URL` 和 `AUTH_SECRET` 即可运行；配置 `OPENAI_API_KEY` / `AI_GATEWAY_API_KEY` 后 AI 聊天与下書き生效。

`NICHJOU_DEMO_MODE`：本地默认开启（模拟 LoRA、无 Stripe 也可开通订阅）。**生产必须设为 `false`**，此时未配置的支付 / 训练 / 声纹会直接失败，不会假装成功。

## 页面结构

| 路径 | 说明 |
|------|------|
| `/` | **Web 首页** — X/Ins 风格社交动态流 |
| `/characters/[slug]` | 角色主页（Ins 风格 Profile） |
| `/h5` | **H5 移动 Web** — 底部 Tab 导航 |
| `/app` | **APP 壳** — PWA 可安装，独立移动端体验 |
| `/login` | 登录 / 注册 |
| `/subscriptions` | 我的订阅 |
| `/studio` | 画师工作室 |
| `/studio/earnings` | 画师收益账本 |
| `/admin/revenue` | 运营分成与限时活动 |
| `/admin/gifts` | 礼物图录（名称/价格/图标/动画） |

## 后续 Roadmap

- [x] Stripe Checkout + Webhook（订阅 / 礼物 / 语音订单）
- [ ] LINE Login（日本用户）
- [x] 内容审核与年龄门（18歳、チャット/投稿）
- [x] 利用規約・プライバシー・特定商取引法表記
- [x] Agent 01 最小切片（人格容器 / 关系快照 / 社交边界 / LoRA Worker 鉴权）
- [x] 模块入口（agent / governance / billing / media）+ 技能插件注册
- [x] 画师分成结算（默认 5:5、后台可调、限时加成）
- [ ] ElevenLabs / 声优声线
- [x] 开发库切 PostgreSQL（compose；托管实例仍需自行部署）
- [x] LoRA 算力独立进程（services/lora-worker，角色隔离）
- [x] Voice / Memos 独立进程（声纹克隆、永久记忆、用户可删除）

## 许可证

Private — Nichijou project
