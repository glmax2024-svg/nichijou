import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Zen_Maru_Gothic } from "next/font/google";
import { Providers } from "@/components/providers";
import { getRequestLocale } from "@/i18n/server";
import { htmlLang } from "@/i18n/config";
import { ICON_FONT_URL } from "@/components/ui/icon-names";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// 标题字体：原先从 Google 外链加载，光样式表就 336KB 且不阻塞渲染，首屏会先用系统字体再跳变。
// 改成 next/font 自托管：同源、预加载，并自动生成尺寸匹配的备用字体减少跳动。
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "日常 Nichijou — AI キャラクターと過ごす毎日",
  description:
    "画師が創るキャラクターの日常を追い、チャット・ギフト・ボイスでつながる AI 陪伴プラットフォーム",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "日常",
  },
};

export const viewport: Viewport = {
  themeColor: "#f9ece7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={htmlLang(locale)}
      className={`${notoSansJp.variable} ${zenMaruGothic.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 只含项目用到的图标（约 15KB，原先全量 364KB）；清单由 npm run icons:sync 生成 */}
        <link href={ICON_FONT_URL} rel="stylesheet" precedence="default" />
      </head>
      <body className="flex min-h-full w-full flex-col bg-[#f9ece7] font-sans text-[#3a3330] antialiased">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
