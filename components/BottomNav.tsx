"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Feather, Orbit, User, Waves } from "lucide-react";

const TABS = [
  { href: "/capture", label: "记录", Icon: Feather },
  { href: "/dreams", label: "梦境", Icon: BookOpen },
  { href: "/plaza", label: "共鸣", Icon: Waves },
  { href: "/starmap", label: "星图", Icon: Orbit },
  { href: "/profile", label: "我的", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night-start to-transparent pb-6 pt-4">
      <div className="mx-auto flex max-w-md items-start justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1.5 transition-opacity duration-fade ${
                active ? "text-gold" : "text-muted hover:opacity-70"
              }`}
            >
              <Icon strokeWidth={1.5} className="h-6 w-6" />
              <span className="text-xs">{label}</span>
              <span
                className={`h-1 w-1 rounded-full ${
                  active ? "bg-gold" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
