import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import AuthBootstrap from "@/components/AuthBootstrap";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  variable: "--font-serif",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const notoSans = Noto_Sans_SC({
  variable: "--font-sans",
  weight: ["300", "400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "拾梦 Gleam",
  description: "把梦境变成可被看见、可被回应、可被珍藏的地方",
  // iOS 添加到主屏幕：独立窗口 + 夜色状态栏 + 图标
  appleWebApp: {
    capable: true,
    title: "拾梦",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1026",
  width: "device-width",
  initialScale: 1,
  // 表单聚焦时 iOS 会自动放大，锁定视口保持排版
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSerif.variable} ${notoSans.variable}`}>
        <AuthBootstrap />
        <div className="bg-stage">{children}</div>
      </body>
    </html>
  );
}
