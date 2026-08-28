import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WebMePage } from "@/components/account/web-me-page";

export default async function SiteMePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/me");

  const [subscriptions, giftCount] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { character: true },
      take: 6,
    }),
    prisma.gift.count({ where: { userId: session.user.id } }),
  ]);

  return <WebMePage session={session} subscriptions={subscriptions} giftCount={giftCount} />;
}
