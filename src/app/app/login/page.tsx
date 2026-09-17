import { Suspense } from "react";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { isDemoMode } from "@/lib/runtime";
import { isInviteOnly } from "@/lib/beta/invite";

export default function AppLoginPage() {
  return (
    <Suspense>
      <MobileLoginForm defaultCallbackUrl="/app" legalBasePath="/app" showDemoHints={isDemoMode()} inviteOnly={isInviteOnly()} />
    </Suspense>
  );
}
