"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import Art from "@/components/Art";
import StarCanvas, {
  constellations,
  focusStar,
} from "@/components/StarCanvas";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";

export default function StarmapPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-md overflow-hidden">
      <div className="absolute inset-0 bottom-28">
        <StarCanvas />

        {/* 星座名 */}
        {constellations.map((c) => (
          <span
            key={c.name}
            className="absolute -translate-x-1/2 font-serif text-sm text-gold"
            style={{ left: `${c.label.x * 100}%`, top: `${c.label.y * 100}%` }}
          >
            {c.name}
          </span>
        ))}

        {/* 高亮星 tooltip */}
        <motion.div
          {...fadeIn}
          className="glass absolute flex items-center gap-3 p-3 pr-5"
          style={{
            left: `${(focusStar.x + 0.07) * 100}%`,
            top: `${(focusStar.y + 0.02) * 100}%`,
          }}
        >
          <Art className="h-12 w-12 shrink-0 rounded-lg" />
          <span className="whitespace-nowrap text-sm text-ink">
            坠入无声的海 · 7月8日
          </span>
        </motion.div>
      </div>

      <motion.header
        {...fadeIn}
        className="relative flex items-start justify-between px-6 pt-12"
      >
        <h1 className="font-serif text-2xl text-ink">
          我的星图
          <span className="ml-2 text-sm font-sans text-muted">
            · 共 247 个梦
          </span>
        </h1>
        <div className="glass flex !rounded-full p-1 text-sm">
          <span className="rounded-full bg-glass px-4 py-1 text-gold">
            我的
          </span>
          <span className="px-4 py-1 text-muted">全站</span>
        </div>
      </motion.header>

      {/* 缩放控件（静态占位） */}
      <div className="absolute bottom-44 right-6 flex flex-col items-center gap-3 text-muted">
        <Plus strokeWidth={1.5} className="h-5 w-5" />
        <span className="relative h-32 w-px bg-glass-border">
          <span className="absolute left-1/2 top-1/3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gold" />
        </span>
        <Minus strokeWidth={1.5} className="h-5 w-5" />
      </div>

      <BottomNav />
    </main>
  );
}
