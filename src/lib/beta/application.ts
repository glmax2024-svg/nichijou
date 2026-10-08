import { z } from "zod";

export const CONTACT_TYPES = ["LINE", "DISCORD", "X_DM", "OTHER"] as const;

/** "@handle" / "x.com/handle" / 完整 URL → https://x.com/handle；不是 X/Twitter 则返回 null */
export function normalizeTwitterUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const handle = value.match(/^@?([A-Za-z0-9_]{1,15})$/);
  if (handle) return `https://x.com/${handle[1]}`;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!/^(www\.|mobile\.)?(twitter|x)\.com$/i.test(url.hostname)) return null;
    const name = url.pathname.split("/").filter(Boolean)[0];
    return name && /^[A-Za-z0-9_]{1,15}$/.test(name) ? `https://x.com/${name}` : null;
  } catch {
    return null;
  }
}

/** 只接受 pixiv 的用户主页：pixiv.net/users/123 或 pixiv.me/xxx */
export function normalizePixivUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const host = url.hostname.toLowerCase();
    if (/^(www\.)?pixiv\.net$/.test(host)) {
      const id = url.pathname.match(/\/users\/(\d+)/)?.[1];
      return id ? `https://www.pixiv.net/users/${id}` : null;
    }
    if (host === "pixiv.me") {
      const name = url.pathname.split("/").filter(Boolean)[0];
      return name ? `https://pixiv.me/${name}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export const betaApplicationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("メールアドレスの形式を確認してください").max(254),
    nickname: z.string().trim().min(1, "ニックネームを入力してください").max(40),
    userType: z.enum(["FAN", "CREATOR"]),
    twitter: z.string().max(200).default(""),
    pixiv: z.string().max(200).default(""),
    contactType: z.enum(CONTACT_TYPES),
    contactValue: z.string().trim().min(1, "連絡先を入力してください").max(120),
    intro: z.string().trim().min(10, "自己紹介・応募理由は10文字以上で入力してください").max(1000),
    isAdult: z.literal(true, { message: "18歳以上の方のみ応募できます" }),
    acceptedPrivacy: z.literal(true, { message: "プライバシーポリシーへの同意が必要です" }),
  })
  .transform((data, ctx) => {
    const twitterUrl = data.twitter.trim() ? normalizeTwitterUrl(data.twitter) : null;
    const pixivUrl = data.pixiv.trim() ? normalizePixivUrl(data.pixiv) : null;
    if (data.twitter.trim() && !twitterUrl) {
      ctx.addIssue({ code: "custom", path: ["twitter"], message: "X（Twitter）のIDまたはプロフィールURLを確認してください" });
    }
    if (data.pixiv.trim() && !pixivUrl) {
      ctx.addIssue({ code: "custom", path: ["pixiv"], message: "pixiv のユーザーページURL（pixiv.net/users/…）を確認してください" });
    }
    if (!data.twitter.trim() && !data.pixiv.trim()) {
      ctx.addIssue({ code: "custom", path: ["twitter"], message: "X（Twitter）か pixiv のどちらかを入力してください" });
    }
    return { ...data, twitterUrl, pixivUrl };
  });

export type BetaApplicationInput = z.infer<typeof betaApplicationSchema>;
