import { Suspense } from "react";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { isDemoMode } from "@/lib/runtime";
import { isInviteOnly } from "@/lib/beta/invite";

export default async function H5LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; tab?: string; mode?: string }>;
}) {
  const { invite, tab, mode } = await searchParams;
  return (
    <Suspense>
      {/* 地址参数变化时重新挂载，避免沿用旧的邀请码 */}
      <MobileLoginForm
        key={[invite, tab, mode].join("|")}
        legalBasePath="/h5"
        showDemoHints={isDemoMode()}
        inviteOnly={isInviteOnly()}
      />
    </Suspense>
  );
}
