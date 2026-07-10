import Link from "next/link";
import { notFound } from "next/navigation";

// 开发调试导航，production 下不存在
const pages = [
  { href: "/tokens", label: "设计系统 Tokens" },
  { href: "/capture", label: "01 晨间捕捉" },
  { href: "/dream", label: "02 梦境详情" },
  { href: "/plaza", label: "03 回响广场（二级页面）" },
  { href: "/echo", label: "04 回响详情" },
  { href: "/starmap", label: "05 梦境星图" },
  { href: "/resonance", label: "06 梦境共鸣" },
  { href: "/profile", label: "07 我的" },
];

export default function DevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5">
      {pages.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="font-serif text-lg text-gold transition-opacity duration-fade hover:opacity-70"
        >
          {label}
        </Link>
      ))}
    </main>
  );
}
