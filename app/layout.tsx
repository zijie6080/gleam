import type { Metadata } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
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
  title: "Gleam",
  description: "Design system foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSerif.variable} ${notoSans.variable}`}>
        <div className="bg-stage">{children}</div>
      </body>
    </html>
  );
}
