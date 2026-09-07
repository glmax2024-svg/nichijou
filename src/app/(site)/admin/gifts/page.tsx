import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { AdminGiftsPanel } from "@/components/admin/admin-gifts-panel";

export default async function AdminGiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/gifts");
  if (session.user.role !== "ADMIN") redirect("/");

  let gifts: Awaited<ReturnType<typeof prisma.giftItem.findMany>> = [];
  try {
    gifts = await prisma.giftItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    gifts = [];
  }

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[860px] px-4 py-10">
        <div className="flex flex-wrap gap-3 text-[12px] font-bold text-[#ef7488]">
          <Link href="/admin/revenue" className="hover:underline">
            ← 分成
          </Link>
          <Link href="/studio" className="hover:underline">
            スタジオ
          </Link>
        </div>
        <h1 className="mt-3 font-display text-2xl font-black text-[#3a3330]">ギフト図録</h1>
        <p className="mt-1 text-sm text-[#8a7a72]">
          名前・価格・アイコン・GIF / MP4 の演出をここで管理します。非公開にするとファンの棚から消えます。
        </p>
        <div className="mt-6">
          <AdminGiftsPanel
            initial={gifts.map((row) => ({
              id: row.id,
              slug: row.slug,
              name: row.name,
              emoji: row.emoji,
              iconUrl: row.iconUrl,
              animationUrl: row.animationUrl,
              animationKind: row.animationKind,
              amount: row.amount,
              sortOrder: row.sortOrder,
              active: row.active,
              intimacyDelta: row.intimacyDelta,
              description: row.description,
              accentColor: row.accentColor,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
