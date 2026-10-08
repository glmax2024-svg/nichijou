import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { H5MeLoggedIn } from "@/components/mobile/h5-me-logged-in";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { activeSubscriptionWhere } from "@/lib/subscriptions";
import { getCoinBalance } from "@/lib/coins";

export default async function H5MePage() {
  const session = await auth();

  const subscriptions = session?.user
    ? await prisma.subscription.findMany({
        where: { userId: session.user.id, ...activeSubscriptionWhere() },
        include: { character: true },
        take: 5,
      })
    : [];

  const giftCount = session?.user
    ? await prisma.gift.count({ where: { userId: session.user.id } })
    : 0;
  const coinBalance = session?.user ? await getCoinBalance(session.user.id) : 0;

  if (!session?.user) {
    return (
      <Suspense>
        <MobileLoginForm
          defaultCallbackUrl="/h5/me"
          embedded
          legalBasePath="/h5"
        />
      </Suspense>
    );
  }

  return (
    <H5MeLoggedIn
      session={session}
      subscriptions={subscriptions}
      basePath="/h5"
      giftCount={giftCount}
      coinBalance={coinBalance}
    />
  );
}
