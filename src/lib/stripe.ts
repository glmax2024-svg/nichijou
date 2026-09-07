import Stripe from "stripe";
import { FailClosedError } from "@/lib/runtime";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new FailClosedError("決済が未設定です", "PAYMENTS_DISABLED");
  }
  return stripe;
}

function appBaseUrl() {
  return (process.env.AUTH_URL || "http://localhost:3100").replace(/\/$/, "");
}

export async function createYenCheckout(input: {
  userId: string;
  amount: number;
  name: string;
  successPath: string;
  cancelPath: string;
  metadata: Record<string, string>;
}) {
  const client = requireStripe();
  const base = appBaseUrl();
  const session = await client.checkout.sessions.create({
    mode: "payment",
    success_url: `${base}${input.successPath}?paid=1`,
    cancel_url: `${base}${input.cancelPath}?paid=0`,
    client_reference_id: input.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: input.amount,
          product_data: { name: input.name },
        },
      },
    ],
    metadata: input.metadata,
  });
  if (!session.url) {
    throw new Error("Stripe Checkout URL を発行できませんでした");
  }
  return session;
}

export { GIFT_OPTIONS } from "@/lib/gifts/types";

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
