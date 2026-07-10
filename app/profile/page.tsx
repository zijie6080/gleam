"use client";

import { motion } from "framer-motion";
import { Download, HeartHandshake, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";

// 日历热力图占位：5 周 × 7 天，0–3 档情绪强度（静态假数据，后续接真实数据）
const heat = [
  0, 1, 0, 2, 0, 0, 1, 2, 0, 3, 1, 0, 2, 0, 0, 1, 0, 0, 2, 1, 3, 0, 2, 1, 0,
  0, 1, 0, 3, 0, 1, 2, 0, 1, 0,
];
const heatClasses = [
  "bg-glass",
  "bg-gold-deep/40",
  "bg-gold-deep",
  "bg-gold",
] as const;

export default function ProfilePage() {
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-6 pb-32 pt-14">
      <motion.header {...fadeIn}>
        <h1 className="font-serif text-4xl text-ink">我的</h1>
        <p className="mt-2 text-sm text-muted">匿名 · 梦游者</p>
      </motion.header>

      <motion.section {...fadeIn} className="grid grid-cols-2 gap-4">
        <div className="glass p-6">
          <p className="font-serif text-4xl text-gold">247</p>
          <p className="mt-2 text-sm text-muted">累计记录的梦</p>
        </div>
        <div className="glass p-6">
          <p className="flex items-baseline gap-2 font-serif text-4xl text-gold">
            132
            <HeartHandshake strokeWidth={1.5} className="h-5 w-5 self-center" />
          </p>
          <p className="mt-2 text-sm text-muted">被「我也是」的次数</p>
          <p className="mt-1 text-xs text-gold-deep">仅自己可见</p>
        </div>
      </motion.section>

      <motion.section {...fadeIn} className="glass space-y-5 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">梦境日历</h2>
          <span className="text-xs text-muted">7 月</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {heat.map((level, i) => (
            <span
              key={i}
              className={`aspect-square rounded-md ${heatClasses[level]}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted">颜色深浅 · 梦境情绪强度</p>
      </motion.section>

      <motion.section {...fadeIn} className="space-y-3">
        <button className="glass flex w-full items-center gap-3 p-5 text-sm text-ink transition-opacity duration-fade hover:opacity-70">
          <Download strokeWidth={1.5} className="h-5 w-5 text-gold" />
          导出全部数据
        </button>
        <button className="glass flex w-full items-center gap-3 p-5 text-sm text-muted transition-opacity duration-fade hover:opacity-70">
          <Trash2 strokeWidth={1.5} className="h-5 w-5" />
          彻底删除账号及所有数据
        </button>
      </motion.section>

      <BottomNav />
    </main>
  );
}
