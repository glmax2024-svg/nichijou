import { Suspense } from "react";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { isDemoMode } from "@/lib/runtime";
import { isInviteOnly } from "@/lib/beta/invite";

export default function H5LoginPage() {
  return (
    <Suspense>
      <MobileLoginForm legalBasePath="/h5" showDemoHints={isDemoMode()} inviteOnly={isInviteOnly()} />
    </Suspense>
  );
}
