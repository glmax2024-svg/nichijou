import { Suspense } from "react";
import { MobileLoginForm } from "@/components/mobile/mobile-login-form";
import { isDemoMode } from "@/lib/runtime";

export default function H5LoginPage() {
  return (
    <Suspense>
      <MobileLoginForm showDemoHints={isDemoMode()} />
    </Suspense>
  );
}
