# 日常 Nichijou — Android

Kotlin + Jetpack Compose 混合客户端：

- **原生**：登录、首页 Feed、发现
- **WebView**：消息、我的、角色页、聊天、设置、工作室等（`/app/*`）

## 环境

- Android Studio Ladybug+ / JDK 17
- 后端 Next.js（本地 `http://localhost:3100` 或 AutoDL `6006`）

## 打开工程

```bash
# Android Studio → Open → 选择本目录
open -a "Android Studio" android
```

## API Base URL

在 `gradle.properties` 或命令行设置 `nichijou.apiBaseUrl`，不要把临时云主机地址写进仓库。

| Build | 默认 |
|-------|------|
| debug | `http://10.0.2.2:3100`（模拟器访问本机） |
| release | `https://api.nichijou.invalid`（必须覆盖） |

```properties
# android/gradle.properties（本地，可覆盖）
nichijou.apiBaseUrl=http://192.168.1.8:3100
```

真机调试请改成电脑局域网 IP。生产包必须指向正式 HTTPS 域名。

## Demo 账号

- `fan@demo.jp` / `demo123`
- `creator@demo.jp` / `demo123`

## 构建

```bash
cd android
./gradlew :app:assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

若尚无 Gradle Wrapper jar，用 Android Studio 首次 Sync 会自动生成。
