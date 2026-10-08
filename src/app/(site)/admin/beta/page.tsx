import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { AdminBetaPanel } from "@/components/admin/admin-beta-panel";

export default async function AdminBetaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/beta");
  if (session.user.role !== "ADMIN") redirect("/");

  const [applications, invites] = await Promise.all([
    prisma.betaApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { inviteCode: { select: { code: true, usedCount: true, expiresAt: true, revokedAt: true } } },
    }),
    prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { users: { select: { email: true, name: true }, take: 5 } },
    }),
  ]);

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[980px] px-4 py-10">
        <div className="flex flex-wrap gap-3 text-[12px] font-bold text-[#ef7488]">
          <Link href="/studio" className="hover:underline">
            ← スタジオ
          </Link>
          <Link href="/admin/revenue" className="hover:underline">
            分成
          </Link>
          <Link href="/admin/gifts" className="hover:underline">
            ギフト図録
          </Link>
          <Link href="/admin/events" className="hover:underline">
            イベント
          </Link>
        </div>
        <h1 className="mt-3 font-display text-2xl font-black text-[#3a3330]">β版テスター</h1>
        <p className="mt-1 text-sm text-[#8a7a72]">
          応募を審査して招待コードを発行します。承認するとそのメールアドレス専用・1回限りのコードが作られるので、
          登録リンクをコピーして応募者に送ってください。
        </p>
        <div className="mt-6">
          <AdminBetaPanel
            applications={applications.map((a) => ({
              id: a.id,
              email: a.email,
              nickname: a.nickname,
              userType: a.userType,
              twitterUrl: a.twitterUrl,
              pixivUrl: a.pixivUrl,
              contactType: a.contactType,
              contactValue: a.contactValue,
              intro: a.intro,
              status: a.status,
              reviewNote: a.reviewNote,
              createdAt: a.createdAt.toISOString(),
              invite: a.inviteCode
                ? {
                    code: a.inviteCode.code,
                    used: a.inviteCode.usedCount > 0,
                    expiresAt: a.inviteCode.expiresAt?.toISOString() ?? null,
                    revoked: Boolean(a.inviteCode.revokedAt),
                  }
                : null,
            }))}
            invites={invites.map((i) => ({
              id: i.id,
              code: i.code,
              note: i.note,
              grantRole: i.grantRole,
              email: i.email,
              maxUses: i.maxUses,
              usedCount: i.usedCount,
              expiresAt: i.expiresAt?.toISOString() ?? null,
              revokedAt: i.revokedAt?.toISOString() ?? null,
              createdAt: i.createdAt.toISOString(),
              users: i.users.map((u) => u.name || u.email),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
