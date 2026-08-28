/**
 * 运行时开关：Demo 与生产 fail-closed。
 *
 * NICHJOU_DEMO_MODE=true|false 显式覆盖。
 * 未设置时：production → 关闭 Demo；其余 → 开启（本地开发）。
 */

export class FailClosedError extends Error {
  readonly status = 503;
  readonly code: string;

  constructor(message: string, code = "UNAVAILABLE") {
    super(message);
    this.name = "FailClosedError";
    this.code = code;
  }
}

function envFlag(value: string | undefined): boolean | null {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isDemoMode(): boolean {
  const explicit = envFlag(process.env.NICHJOU_DEMO_MODE);
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV !== "production";
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
