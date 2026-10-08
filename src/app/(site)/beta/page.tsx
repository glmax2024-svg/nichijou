import { redirect } from "next/navigation";

/** 応募フォームはログイン画面のタブに統合した。既に配布したリンクのためにリダイレクトだけ残す。 */
export default function BetaApplyPage() {
  redirect("/login?tab=apply");
}
