import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { formatYen } from "@/lib/stripe";
import { formatSharePercent } from "@/lib/revenue/split";
import { resolveCreatorShare } from "@/lib/revenue/ledger";

function kindLabel(kind: string) {
  if (kind === "GIFT") return "ギフト";
  if (kind === "ORDER") return "オーダー";
  return "購読";
}

export default async function StudioEarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/studio/earnings");
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") redirect("/");

  const characters = await prisma.character.findMany({
    where: session.user.role === "ADMIN" ? undefined : { creatorId: session.user.id },
    select: { id: true, name: true, creatorId: true },
  });
  const creatorId = session.user.role === "ADMIN" ? characters[0]?.creatorId : session.user.id;
  const characterId = characters[0]?.id;

  const [totals, rows, liveSplit] = await Promise.all([
    prisma.creatorEarning.aggregate({
      where: session.user.role === "ADMIN" ? undefined : { creatorId: session.user.id },
      _sum: { grossAmount: true, creatorAmount: true, platformAmount: true },
    }),
    prisma.creatorEarning.findMany({
      where: session.user.role === "ADMIN" ? undefined : { creatorId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { character: { select: { name: true } } },
    }),
    creatorId && characterId
      ? resolveCreatorShare({ creatorId, characterId })
      : Promise.resolve(null),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[860px] px-4 py-10">
        <Link href="/studio" className="text-[12px] font-bold text-[#ef7488] hover:underline">
          ← スタジオ
        </Link>
        <h1 className="mt-3 font-display text-2xl font-black text-[#3a3330]">収益</h1>
        <p className="mt-1 text-sm text-[#8a7a72]">
          購読・ギフト・音声オーダーの画师取り分です。出金は別途運営から連絡します。
        </p>

        {liveSplit && (
          <div className="mt-5 rounded-[18px] border border-[rgba(239,116,136,0.18)] bg-[#fff4f6] px-4 py-3 text-[13px] text-[#3a3330]">
            いまの分成は画师 {formatSharePercent(liveSplit.finalShareBps)}
            {liveSplit.campaign
              ? `（${liveSplit.campaign.name} +${formatSharePercent(liveSplit.bonusBps)}）`
              : "（デフォルトまたは個別設定）"}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "総売上", value: formatYen(totals._sum.grossAmount ?? 0) },
            { label: "あなたの取り分", value: formatYen(totals._sum.creatorAmount ?? 0) },
            { label: "手数料", value: formatYen(totals._sum.platformAmount ?? 0) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[18px] border border-[rgba(120,72,54,0.07)] bg-white px-4 py-3"
            >
              <div className="text-[11px] font-bold text-[#b0a099]">{item.label}</div>
              <div className="mt-1 font-display text-xl font-black text-[#3a3330]">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[rgba(120,72,54,0.07)] bg-white">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-[#b0a099]">まだ収益がありません。</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] text-[#b0a099]">
                <tr>
                  <th className="px-4 py-3 font-bold">日時</th>
                  <th className="px-4 py-3 font-bold">種別</th>
                  <th className="px-4 py-3 font-bold">キャラ</th>
                  <th className="px-4 py-3 font-bold">売上</th>
                  <th className="px-4 py-3 font-bold">取り分</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[rgba(120,72,54,0.06)]">
                    <td className="px-4 py-2.5 text-[#8a7a72]">
                      {row.createdAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-2.5">{kindLabel(row.kind)}</td>
                    <td className="px-4 py-2.5">
                      {row.character.name}
                      {row.campaignName ? (
                        <div className="text-[11px] text-[#ef7488]">{row.campaignName}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">{formatYen(row.grossAmount)}</td>
                    <td className="px-4 py-2.5 font-bold">
                      {formatYen(row.creatorAmount)}
                      <span className="ml-1 text-[11px] font-normal text-[#b0a099]">
                        {formatSharePercent(row.finalShareBps)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
