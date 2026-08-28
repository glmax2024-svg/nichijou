import type { Metadata, Viewport } from "next";
import { H5Shell } from "@/components/mobile/h5-shell";

export const metadata: Metadata = {
  title: "日常 Nichijou",
  description: "キャラクターの日常を追いかける AI 陪伴アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "日常",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf4f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-[100dvh] w-full bg-[#fbf4f1]">
      <H5Shell basePath="/app">{children}</H5Shell>
    </div>
  );
}
