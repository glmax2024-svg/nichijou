/**
 * 价格与金币展示。前后端共用，不能引入服务端依赖。
 *
 * 平台内一切消费（推し登録、ギフト、オーダー）都用金币支付，价格数值就是金币数。
 */

/** 推し登録一次购买的天数。没有自动续费，到期前可以再次购买来延长 */
export const SUBSCRIPTION_PERIOD_DAYS = 30;
export const SUBSCRIPTION_PERIOD_MS = SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/** 到期前多少天提示「まもなく期限」 */
export const SUBSCRIPTION_EXPIRING_DAYS = 7;

export const ORDER_OPTIONS = [
  {
    type: "BIRTHDAY" as const,
    label: "誕生日祝福",
    description: "キャラクターからの誕生日メッセージ＋音声",
    amount: 1980,
  },
  {
    type: "WAKE_UP" as const,
    label: "モーニングコール",
    description: "指定時間にキャラクターが起こしてくれる",
    amount: 980,
  },
  {
    type: "CUSTOM" as const,
    label: "カスタムボイス",
    description: "好きなセリフを音声でお届け",
    amount: 2980,
  },
];

export type OrderOptionType = (typeof ORDER_OPTIONS)[number]["type"];

export function formatCoins(amount: number): string {
  return `${amount.toLocaleString("ja-JP")} コイン`;
}

/** 剩余天数（向上取整，已过期返回 0） */
export function daysLeft(periodEnd: Date | string | null | undefined, now = new Date()): number {
  if (!periodEnd) return 0;
  const ms = new Date(periodEnd).getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / (24 * 60 * 60 * 1000)) : 0;
}

/** 运营直接创建的账号没有生年月日，需要先在设定页登录 */
export const AGE_REQUIRED_MESSAGE = "18歳以上の確認が必要です。設定 → 年齢確認 で生年月日を登録してください";

/** 购买接口失败时给用户看的文案（余额不足时带上差额） */
export function purchaseErrorMessage(data: {
  error?: string;
  code?: string;
  balance?: number;
  required?: number;
}): string {
  if (data.code === "AGE_REQUIRED") return AGE_REQUIRED_MESSAGE;
  if (data.code === "INSUFFICIENT_COINS" && data.balance != null && data.required != null) {
    return `コインが足りません（所持 ${data.balance.toLocaleString("ja-JP")} / 必要 ${data.required.toLocaleString("ja-JP")}）`;
  }
  return data.error ?? "エラーが発生しました";
}
