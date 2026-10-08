import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { StudioDashboard } from "@/components/studio/studio-dashboard";
import { activeSubscriptionWhere } from "@/lib/subscriptions";

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CREATOR" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [creator, characters] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, bio: true },
    }),
    prisma.character.findMany({
      where: { creatorId: session.user.id },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        avatarUrl: true,
        coverUrl: true,
        subscriptionPrice: true,
        published: true,
        loraStatus: true,
        _count: { select: { posts: true, subscriptions: { where: activeSubscriptionWhere() } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!creator) redirect("/login");

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[960px] px-4 py-10">
        {session.user.role === "ADMIN" && (
          <div className="mb-4 flex flex-wrap gap-4">
            <Link href="/admin/revenue" className="text-[12px] font-bold text-[#ef7488] hover:underline">
              分成管理（Admin）
            </Link>
            <Link href="/admin/gifts" className="text-[12px] font-bold text-[#ef7488] hover:underline">
              ギフト図録
            </Link>
            <Link href="/admin/beta" className="text-[12px] font-bold text-[#ef7488] hover:underline">
              β版テスター
            </Link>
            <Link href="/admin/events" className="text-[12px] font-bold text-[#ef7488] hover:underline">
              イベント
            </Link>
          </div>
        )}
        <StudioDashboard creator={creator} characters={characters} />
      </div>
    </div>
  );
}
