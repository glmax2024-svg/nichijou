import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import Link from "next/link";

const faqs = [
  {
    q: "推し（サブスク）とは？",
    a: "月額プランに加入すると、キャラクターの日常投稿の全閲覧とチャット機能が使えます。",
  },
  {
    q: "チャットはどうやって始めますか？",
    a: "推しに加入後、プロフィールの「メッセージ」ボタン、またはメッセージタブから会話を開始できます。",
  },
  {
    q: "ギフトとは？",
    a: "推しキャラに花束やケーキなどを贈れる機能です。プロフィールから送れます。",
  },
  {
    q: "モーニングコールとは？",
    a: "指定時間にキャラクターの声で起こしてくれる有料サービスです。",
  },
  {
    q: "解約方法は？",
    a: "マイ推しページの「管理」からサブスクの管理ができます（デモ版では即時反映）。",
  },
];

export function HelpPage({ basePath }: { basePath: "" | "/h5" | "/app" }) {
  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title="ヘルプ" backHref={basePath ? `${basePath}/me` : "/me"} />
      <div className="px-[18px] py-4">
        <div className="overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white">
          {faqs.map((item, i) => (
            <div
              key={item.q}
              className={`px-4 py-4 ${i < faqs.length - 1 ? "border-b border-[rgba(120,72,54,0.05)]" : ""}`}
            >
              <div className="font-display text-[14px] font-bold text-[#3a3330]">{item.q}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8a7a72]">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[12px] text-[#b0a099]">
          お問い合わせ: support@nichijou.app
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-[12px] text-[#b0a099]">
          <Link href={`${basePath}/legal/terms`} className="hover:text-[#ef7488]">
            利用規約
          </Link>
          <Link href={`${basePath}/legal/privacy`} className="hover:text-[#ef7488]">
            プライバシー
          </Link>
          <Link href={`${basePath}/legal/tokushoho`} className="hover:text-[#ef7488]">
            特定商取引法
          </Link>
        </div>
      </div>
    </div>
  );
}
