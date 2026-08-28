import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const GIFT_OPTIONS = [
  { id: "flower", label: "花束", emoji: "💐", amount: 300 },
  { id: "coffee", label: "コーヒー", emoji: "☕", amount: 500 },
  { id: "cake", label: "ケーキ", emoji: "🎂", amount: 980 },
  { id: "star", label: "星", emoji: "⭐", amount: 1500 },
] as const;

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

export function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}
