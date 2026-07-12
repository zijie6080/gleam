import Link from "next/link";
import { notFound } from "next/navigation";

// 开发调试导航，production 下不存在
const pages = [
  { href: "/tokens", label: "设计系统 Tokens" },
  { href: "/capture", label: "记录（自己的梦）" },
  { href: "/dream", label: "梦境详情（私密日记）" },
  { href: "/plaza", label: "共鸣广场" },
  { href: "/starmap", label: "梦境星图" },
  { href: "/profile", label: "我的" },
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
