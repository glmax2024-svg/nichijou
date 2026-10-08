import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AmbientBg } from "@/components/ui/ambient-bg";
import { loadMySubscriptions } from "@/lib/my-subscriptions";
import { MySubscriptions } from "@/components/subscriptions/my-subscriptions";

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await loadMySubscriptions(session.user.id);

  return (
    <div className="relative min-h-[calc(100vh-60px)]">
      <AmbientBg />
      <div className="relative z-10 mx-auto max-w-[480px] px-4 py-10">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[22px] font-black text-[#3a3330]">マイ推し</h1>
            <span className="rounded-full bg-[#ffeef1] px-3 py-1.5 text-xs font-bold text-[#e0607a]">
              {data.subscriptions.length} 件 · 加入中
            </span>
          </div>
          <MySubscriptions data={data} basePath="" />
        </div>
      </div>
    </div>
  );
}
