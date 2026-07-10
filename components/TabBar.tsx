import Link from "next/link";
import { BookOpen, Orbit, Radar, User } from "lucide-react";

const tabs = [
  { key: "record", label: "记录", href: "/dream", Icon: BookOpen },
  { key: "starmap", label: "星图", href: "/starmap", Icon: Orbit },
  { key: "echo", label: "回响", href: "/plaza", Icon: Radar },
  { key: "me", label: "我的", href: "#", Icon: User },
] as const;

export type TabKey = (typeof tabs)[number]["key"];

export default function TabBar({ active }: { active: TabKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-night-start to-transparent pb-6 pt-4">
      <div className="mx-auto flex max-w-md items-start justify-around">
        {tabs.map(({ key, label, href, Icon }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href}
              className={`flex flex-col items-center gap-1.5 transition-opacity duration-fade ${
                isActive ? "text-gold" : "text-muted hover:opacity-70"
              }`}
            >
              <Icon strokeWidth={1.5} className="h-6 w-6" />
              <span className="text-xs">{label}</span>
              <span
                className={`h-1 w-1 rounded-full ${
                  isActive ? "bg-gold" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
