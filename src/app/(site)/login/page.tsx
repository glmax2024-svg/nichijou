import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isMobileAppPath } from "@/lib/login-path";
import LoginPageClient from "./login-client";
import { isInviteOnly } from "@/lib/beta/invite";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; invite?: string; tab?: string; mode?: string }>;
}) {
  const { callbackUrl, invite, tab, mode } = await searchParams;

  if (callbackUrl && isMobileAppPath(callbackUrl)) {
    const loginRoot = callbackUrl.startsWith("/h5") ? "/h5/login" : "/app/login";
    redirect(`${loginRoot}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense>
      {/* 表单状态只在挂载时读取地址参数；站内跳到另一个邀请链接时要重新挂载，否则会沿用旧的码 */}
      <LoginPageClient
        key={[invite, tab, mode].join("|")}
        inviteOnly={isInviteOnly()}
      />
    </Suspense>
  );
}
