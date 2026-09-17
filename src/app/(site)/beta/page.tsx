import type { Metadata } from "next";
import { BetaApplyClient } from "./beta-apply-client";

export const metadata: Metadata = {
  title: "β版テスター募集 | 日常 Nichijou",
};

export default function BetaApplyPage() {
  return <BetaApplyClient />;
}
