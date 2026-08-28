"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { H5TabBar } from "@/components/mobile/h5-tab-bar";

const FULLSCREEN_SUFFIXES = ["/login", "/settings", "/gifts", "/orders", "/help"];

export function H5Shell({
  children,
  basePath,
}: {
  children: React.ReactNode;
  basePath: "/h5" | "/app";
}) {
  const pathname = usePathname();
  const isLogin = pathname.endsWith("/login");
  const isFullscreen =
    pathname.includes("/characters/") ||
    FULLSCREEN_SUFFIXES.some((suffix) => pathname.endsWith(suffix));

  if (isLogin) {
    return <div className="min-h-[100dvh] w-full">{children}</div>;
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <main
        className={`w-full flex-1 bg-[#fbf4f1] ${
          isFullscreen ? "pb-0" : "pb-[calc(72px+env(safe-area-inset-bottom))]"
        }`}
      >
        {children}
      </main>
      <H5TabBar basePath={basePath} />
    </div>
  );
}
