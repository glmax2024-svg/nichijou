import type { Metadata, Viewport } from "next";
import { H5Shell } from "@/components/mobile/h5-shell";

export const metadata: Metadata = {
  title: "日常 Nichijou — H5",
  description: "キャラクターの日常を追いかける — モバイル Web 版",
};

export const viewport: Viewport = {
  themeColor: "#fbf4f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function H5Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-[100dvh] w-full bg-[#fbf4f1]">
      <H5Shell basePath="/h5">{children}</H5Shell>
    </div>
  );
}
