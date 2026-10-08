import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nowMs } from "@/lib/events";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { AdminEventsPanel } from "@/components/admin/admin-events-panel";

export default async function AdminEventsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/events");
  if (session.user.role !== "ADMIN") redirect("/");

  const events = await prisma.platformEvent.findMany({ orderBy: [{ startsAt: "desc" }] });

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[860px] px-4 py-10">
        <div className="flex flex-wrap gap-3 text-[12px] font-bold text-[#ef7488]">
          <Link href="/admin/revenue" className="hover:underline">
            分成
          </Link>
          <Link href="/admin/gifts" className="hover:underline">
            ギフト図録
          </Link>
          <Link href="/admin/beta" className="hover:underline">
            β版テスター
          </Link>
        </div>
        <h1 className="mt-3 font-display text-2xl font-black text-[#3a3330]">イベント</h1>
        <p className="mt-1 text-sm text-[#8a7a72]">ホームのバナーとイベントページを管理します。</p>
        <div className="mt-6">
          <AdminEventsPanel
            now={nowMs()}
            initial={events.map((e) => ({
              id: e.id,
              title: e.title,
              subtitle: e.subtitle,
              description: e.description,
              badge: e.badge,
              theme: e.theme,
              imageUrl: e.imageUrl,
              linkHref: e.linkHref,
              ctaLabel: e.ctaLabel,
              startsAt: e.startsAt.toISOString(),
              endsAt: e.endsAt.toISOString(),
              published: e.published,
              sortOrder: e.sortOrder,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
