import { redirect } from "next/navigation";
import { loginPath } from "@/lib/login-path";
import { auth } from "@/lib/auth";
import { loadMySubscriptions } from "@/lib/my-subscriptions";
import { MySubscriptions } from "@/components/subscriptions/my-subscriptions";

export default async function AppSubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect(loginPath("/app", "/app/subscriptions"));

  const data = await loadMySubscriptions(session.user.id);

  return (
    <div className="min-h-full bg-[#fbf4f1] px-[18px] py-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[22px] font-black text-[#3a3330]">マイ推し</h2>
        <span className="rounded-full bg-[#ffeef1] px-3 py-1.5 text-[11.5px] font-bold text-[#e0607a]">
          {data.subscriptions.length} 件 · 加入中
        </span>
      </div>
      <MySubscriptions data={data} basePath="/app" variant="h5" />
    </div>
  );
}
