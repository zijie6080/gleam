"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, HeartHandshake, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

const heatClasses = [
  "bg-glass",
  "bg-gold-deep/40",
  "bg-gold-deep",
  "bg-gold",
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ dreamCount: 0, iamtooCount: 0 });
  const [days, setDays] = useState<number[]>(Array(35).fill(0));
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/stats?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => {
        setStats({
          dreamCount: d.dreamCount ?? 0,
          iamtooCount: d.iamtooCount ?? 0,
        });
        if (Array.isArray(d.days)) setDays(d.days);
      })
      .catch(() => {});
  }, []);

  function exportData() {
    window.location.href = `/api/export?userId=${anonUserId()}`;
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "确定要彻底删除吗？所有的梦、意象、回响都会消失，无法恢复。",
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/account?userId=${anonUserId()}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) {
      localStorage.removeItem("gleam_anon_id");
      localStorage.removeItem("gleam_draft");
      router.push("/capture");
    } else {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-6 pb-32 pt-14">
      <motion.header {...fadeIn}>
        <h1 className="font-serif text-4xl text-ink">我的</h1>
        <p className="mt-2 text-sm text-muted">匿名 · 梦游者</p>
      </motion.header>

      <motion.section {...fadeIn} className="grid grid-cols-2 gap-4">
        <div className="glass p-6">
          <p className="font-serif text-4xl text-gold">{stats.dreamCount}</p>
          <p className="mt-2 text-sm text-muted">累计记录的梦</p>
        </div>
        <div className="glass p-6">
          <p className="flex items-baseline gap-2 font-serif text-4xl text-gold">
            {stats.iamtooCount}
            <HeartHandshake strokeWidth={1.5} className="h-5 w-5 self-center" />
          </p>
          <p className="mt-2 text-sm text-muted">被「我也是」的次数</p>
          <p className="mt-1 text-xs text-gold-deep">仅自己可见</p>
        </div>
      </motion.section>

      <motion.section {...fadeIn} className="glass space-y-5 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">梦境日历</h2>
          <span className="text-xs text-muted">近 35 天</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((level, i) => (
            <span
              key={i}
              className={`aspect-square rounded-md ${heatClasses[Math.min(level, 3)]}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted">颜色深浅 · 梦境情绪强度</p>
      </motion.section>

      <motion.section {...fadeIn} className="space-y-3">
        <button
          onClick={exportData}
          className="glass flex w-full items-center gap-3 p-5 text-sm text-ink transition-opacity duration-fade hover:opacity-70"
        >
          <Download strokeWidth={1.5} className="h-5 w-5 text-gold" />
          导出全部数据
        </button>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="glass flex w-full items-center gap-3 p-5 text-sm text-muted transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
        >
          <Trash2 strokeWidth={1.5} className="h-5 w-5" />
          {deleting ? "正在删除…" : "彻底删除账号及所有数据"}
        </button>
      </motion.section>

      <BottomNav />
    </main>
  );
}
