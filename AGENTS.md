<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 上线：PR + 交叉审核

- 不要直接推 `main`。功能做在分支上，对 `main` 开 PR。
- 至少一位同事审核通过后才能合并。作者不能自己批自己。
- 只从已与 `origin/main` 对齐的干净 `main` 部署：`deploy/deploy.sh nichijou-prod nichijou.ai`
- 未合并进 `main` 的改动禁止跑 `deploy.sh` 上生产。

