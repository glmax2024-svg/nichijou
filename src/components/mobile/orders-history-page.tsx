import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginPath } from "@/lib/login-path";
import { ORDER_OPTIONS, formatYen } from "@/lib/stripe";
import { formatTimeAgo } from "@/lib/feed";
import { MobilePageHeader } from "@/components/mobile/mobile-page-header";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";

const orderMap = Object.fromEntries(ORDER_OPTIONS.map((o) => [o.type, o]));

const statusLabel: Record<string, string> = {
  PENDING: "処理中",
  PAID: "支払済",
  FULFILLED: "完了",
  CANCELED: "キャンセル",
};

export async function OrdersHistoryPage({ basePath }: { basePath: "" | "/h5" | "/app" }) {
  const session = await auth();
  const ordersPath = basePath ? `${basePath}/orders` : "/orders";
  if (!session?.user) redirect(basePath ? loginPath(basePath, ordersPath) : `/login?callbackUrl=${ordersPath}`);

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { character: { select: { name: true, avatarUrl: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <MobilePageHeader title="モーニングコール" backHref={basePath ? `${basePath}/me` : "/me"} />
      <div className="px-[18px] py-3">
        {orders.length === 0 ? (
          <div className="py-16 text-center">
            <MIcon name="alarm" className="mx-auto text-[48px] text-[#7d97e0]/40" />
            <p className="mt-4 font-display font-bold text-[#3a3330]">まだ注文がありません</p>
            <p className="mt-2 text-sm text-[#8a7a72]">推しキャラのプロフィールから注文できます</p>
            <Link href={`${basePath}/discover`} className="btn-primary mt-5 inline-block rounded-full px-6 py-2.5 text-sm">
              キャラクターを探す
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {orders.map((order) => {
              const meta = orderMap[order.type];
              return (
                <li
                  key={order.id}
                  className="rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <CharacterAvatar
                      slug={order.character.slug}
                      src={order.character.avatarUrl}
                      alt={order.character.name}
                      size={44}
                      rounded="xl"
                    />
                    <div className="min-w-0 flex-1 leading-snug">
                      <div className="font-display text-sm font-bold">{meta?.label ?? order.type}</div>
                      <div className="text-[11.5px] text-[#8a7a72]">{order.character.name}</div>
                    </div>
                    <span className="rounded-full bg-[#eef1ff] px-2.5 py-1 text-[10px] font-bold text-[#6b7fd0]">
                      {statusLabel[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11.5px] text-[#8a7a72]">
                    <span>{formatYen(order.amount)} · {formatTimeAgo(order.createdAt)}</span>
                    <Link href={`${basePath}/characters/${order.character.slug}`} className="font-bold text-[#ef7488]">
                      プロフィール
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
