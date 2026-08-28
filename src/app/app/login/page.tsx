import { Suspense } from "react";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { isDemoMode } from "@/lib/runtime";

export default function AppLoginPage() {
  return (
    <Suspense>
      <MobileLoginForm defaultCallbackUrl="/app" showDemoHints={isDemoMode()} />
    </Suspense>
  );
}
