import { redirect } from "next/navigation";
import { loginPath } from "@/lib/login-path";
import { auth } from "@/lib/auth";
import { loadMySubscriptions } from "@/lib/my-subscriptions";
import { MySubscriptions } from "@/components/subscriptions/my-subscriptions";

export default async function H5SubscriptionsPage() {
  const session = await auth();
  if (!session?.user) redirect(loginPath("/h5", "/h5/subscriptions"));

  const data = await loadMySubscriptions(session.user.id);

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <div className="flex items-center justify-between px-[18px] pb-1.5 pt-2.5">
        <h2 className="font-display text-[22px] font-black text-[#3a3330]">マイ推し</h2>
        <span className="rounded-full bg-[#ffeef1] px-3 py-1.5 text-[11.5px] font-bold text-[#e0607a]">
          {data.subscriptions.length} 件 · 加入中
        </span>
      </div>
      <div className="px-[18px] py-2 pb-4">
        <MySubscriptions data={data} basePath="/h5" variant="h5" />
      </div>
    </div>
  );
}
