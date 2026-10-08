import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * 脚本生成的账号密码只写进这个文件（被 .gitignore 的 .env* 规则忽略），不打印到终端，
 * 避免出现在日志、截图或聊天记录里。
 */
export const CREDENTIALS_FILE = ".env.accounts.local";

export function saveCredential(email: string, password: string, note: string) {
  if (!existsSync(CREDENTIALS_FILE)) {
    writeFileSync(CREDENTIALS_FILE, "# 脚本生成的账号（本地文件，勿提交、勿外传）\n# email,password,note\n", { mode: 0o600 });
  }
  const lines = readFileSync(CREDENTIALS_FILE, "utf8").split("\n").filter((l) => !l.startsWith(`${email},`));
  lines.push(`${email},${password},${note}`);
  writeFileSync(CREDENTIALS_FILE, lines.filter(Boolean).join("\n") + "\n", { mode: 0o600 });
}

