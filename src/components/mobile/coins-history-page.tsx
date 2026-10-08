import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginPath } from "@/lib/login-path";
import { formatTimeAgo } from "@/lib/feed";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { MIcon } from "@/components/ui/m-icon";

const REASON_LABEL: Record<string, string> = {
  signup_bonus: "β版テスター特典",
  subscription: "推し登録",
  gift: "ギフト",
  order: "ボイスオーダー",
  admin_adjust: "運営による調整",
  refund: "返金",
};

/** 金币流水：余额 + 最近 100 笔收支 */
export async function CoinsHistoryPage({ basePath }: { basePath: "" | "/h5" | "/app" }) {
  const session = await auth();
  const coinsPath = `${basePath}/coins`;
  if (!session?.user) redirect(basePath ? loginPath(basePath, coinsPath) : `/login?callbackUrl=${coinsPath}`);

  const [user, rows] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { coinBalance: true } }),
    prisma.coinTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title="コイン履歴" backHref={basePath ? `${basePath}/me` : "/me"} />
      <div className="mx-auto max-w-[560px] px-[18px] py-3">
        <div className="rounded-[22px] border border-[rgba(214,160,60,0.25)] bg-gradient-to-br from-[#fff8ea] to-[#fff1d6] p-5">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#b8862e]">
            <MIcon name="toll" className="text-[18px] text-[#e0a93a]" filled />
            所持コイン
          </div>
          <div className="mt-1 font-display text-[32px] font-black tabular-nums text-[#8a6320]">
            {(user?.coinBalance ?? 0).toLocaleString("ja-JP")}
          </div>
          <p className="mt-1 text-[11.5px] text-[#b0956a]">
            推し登録・ギフト・ボイスオーダーに使えます。β版ではチャージはまだできません。
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8a7a72]">まだ履歴がありません</p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 border-b border-[rgba(120,72,54,0.05)] px-4 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="text-[13.5px] font-bold text-[#3a3330]">{REASON_LABEL[row.reason] ?? row.reason}</div>
                  <div className="text-[11px] text-[#b0a099]">{formatTimeAgo(row.createdAt)}</div>
                </div>
                <div className="text-right leading-snug">
                  <div
                    className={`font-display text-[15px] font-black tabular-nums ${
                      row.delta > 0 ? "text-[#3fae76]" : "text-[#e0607a]"
                    }`}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta.toLocaleString("ja-JP")}
                  </div>
                  <div className="text-[10.5px] tabular-nums text-[#b0a099]">
                    残高 {row.balanceAfter.toLocaleString("ja-JP")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
