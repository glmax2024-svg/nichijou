# 上线部署

架构：一台东京 VPS 上跑三样东西 —— Caddy（HTTPS 反向代理）→ Next.js 应用（systemd 管理）→ Postgres（Docker，只监听本机）。图片等媒体文件存 Cloudflare R2。

```
用户 ──HTTPS──▶ Caddy :443 ──▶ Next.js 127.0.0.1:3000 ──▶ Postgres 127.0.0.1:5432
                                      │
                                      ├──▶ Cloudflare R2（图片 / 语音）
                                      └──▶ LLM 网关 / Anima 生图 / Zetta TTS
```

---

## 第 1 步：买服务器（你来做）

推荐 **Vultr** 或 **AWS Lightsail**，区域选 **东京（Tokyo）**。

| 项 | 选择 |
|---|---|
| 规格 | **2 核 4GB 内存**（构建时需要，2GB 容易内存不足） |
| 系统 | **Ubuntu 24.04 LTS** |
| 费用 | 约 $20–24 / 月 |
| SSH Key | 创建时粘贴下面这把公钥（这样我才能帮你部署） |

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIICqqiF0QjWXjIW7tzjcJDEFvDmY6FuEt6J/vI95/Evc uu-studio@EeofoldeMacBook-Air
```

> **用 Lightsail 的话**：还要在实例的「Networking」页里手动放行 **HTTPS (443)**，默认只开了 22 和 80。

买好后记下服务器的 **公网 IP**。

---

## 第 2 步：域名解析（你来做）

在你的域名 DNS 管理后台加一条记录：

| 类型 | 名称 | 值 |
|---|---|---|
| A | `app`（或你想要的子域名） | 服务器公网 IP |

> **如果域名在 Cloudflare**：代理状态必须选 **「DNS only」（灰色云朵）**。
> 橙色云朵（代理模式）有 100 秒超时，生图请求可能超过 100 秒，会被 Cloudflare 直接断开。

---

## 第 3 步：配置 Cloudflare R2（你来做）

R2 就是存图片、语音文件的地方，类似网盘，但给程序用。

### 3.1 开通
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com) → 左侧菜单 **R2 Object Storage**
2. 首次使用要绑定付款方式（有免费额度：10GB 存储、流量免费，初期基本不花钱）

### 3.2 建存储桶（bucket）
1. 点 **Create bucket**
2. 名称填 `nichijou-media`
3. Location 选 **Asia-Pacific (APAC)**
4. 创建

### 3.3 开放公开访问（让前端能显示图片）
进入刚建的 bucket → **Settings** → **Public access**，二选一：

- **有 Cloudflare 上的域名（推荐）**：Custom Domains → Connect Domain → 填 `media.你的域名` → 按提示确认
- **没有**：R2.dev subdomain → Allow Access（有访问频率限制，只适合测试）

记下得到的公开地址，例如 `https://media.你的域名` 或 `https://pub-xxxx.r2.dev`。

### 3.4 创建访问密钥
1. 回到 R2 首页 → 右侧 **Manage R2 API Tokens**（或 API → Manage API tokens）
2. **Create API token**
3. Permissions 选 **Object Read & Write**
4. Specify bucket 选 **只允许 `nichijou-media`**
5. 创建后页面会显示三个值（**只显示一次**，马上复制保存）：
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint**：`https://<一串 ID>.r2.cloudflarestorage.com`

---

## 第 4 步：把信息交给我

| 发给我 | 例子 |
|---|---|
| 服务器 IP | `203.0.113.10` |
| 完整域名 | `app.example.com` |
| R2 公开地址 | `https://media.example.com` |
| R2 Endpoint | `https://xxxx.r2.cloudflarestorage.com` |

**R2 的 Access Key ID 和 Secret 不要发在聊天里。** 我会生成 `deploy/.env.production`，其他值都预先填好，你只需要自己打开文件把这两个密钥填进去。

---

## 第 5 步：部署（我来做）

```bash
# 一次性初始化服务器（装 Node / Docker / Caddy、防火墙、swap）
ssh root@<IP> 'bash -s' < deploy/server-setup.sh <域名>

# 首次部署（上传生产配置）
deploy/deploy.sh root@<IP> <域名> --env deploy/.env.production

# 创建第一个管理员（会打印一次初始密码，登录后请修改）
ssh root@<IP> 'cd /srv/nichijou && sudo -u nichijou npm run users:create -- --email=<你的邮箱> --name=運営 --role=ADMIN'

# 创建官方角色的创作者账号，再创建角色
ssh root@<IP> 'cd /srv/nichijou && sudo -u nichijou npm run users:create -- --email=<创作者邮箱> --role=CREATOR'
ssh root@<IP> 'cd /srv/nichijou && sudo -u nichijou npm run characters:upsert -- --creator-email=<创作者邮箱>'
```

## 内测邀请制

`NICHIJOU_INVITE_ONLY="true"`（默认）时：

- **整站需要登录**。未登录只能访问登录页、`/beta` 内测申请页和法律条款
- **注册必须有邀请码**
- 管理员在 **`/admin/beta`** 审核申请：通过后自动生成「绑定申请邮箱、只能用 1 次、14 天有效」的邀请码，复制注册链接或邀请消息发给对方
- 同一页面的「招待コード」标签可以直接发码（给熟人、合作画师，可设多次使用）

批量发码（比如活动）：

```bash
ssh root@<IP> 'cd /srv/nichijou && sudo -u nichijou npm run invites:create -- --count=20 --role=FAN --days=7 --note="イベント"'
```

正式公开时把 `NICHIJOU_INVITE_ONLY` 改成 `"false"` 并重启即可，已有账号和邀请码不受影响。

以后更新代码只需要：

```bash
deploy/deploy.sh root@<IP> <域名>
```

## 常用运维

```bash
ssh root@<IP> journalctl -u nichijou -f          # 看应用日志
ssh root@<IP> systemctl restart nichijou         # 重启应用
ssh root@<IP> 'docker exec -t $(docker ps -qf name=postgres) pg_dump -U nichijou nichijou' > backup.sql   # 备份数据库
```

## 已知限制

- 表结构同步用的是 `prisma db push`（项目目前没有 migrations）。上线后改表结构前要先备份数据库。
- 支付（Stripe）未配置：订阅和订单会显示「未开通」。
- 所有媒体文件目前都是公开访问的。付费内容的私有存储、签名地址是下一阶段的工作。
