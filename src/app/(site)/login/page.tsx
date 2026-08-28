import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isMobileAppPath } from "@/lib/login-path";
import LoginPageClient from "./login-client";
import { isDemoMode } from "@/lib/runtime";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  if (callbackUrl && isMobileAppPath(callbackUrl)) {
    const loginRoot = callbackUrl.startsWith("/h5") ? "/h5/login" : "/app/login";
    redirect(`${loginRoot}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense>
      <LoginPageClient showDemoHints={isDemoMode()} />
    </Suspense>
  );
}
