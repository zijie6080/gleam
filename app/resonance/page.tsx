"use client";

import { motion } from "framer-motion";
import Art from "@/components/Art";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";

// 4 行 × 6 列的匹配梦境球，第 16 个（第 3 行第 4 列）为高亮
const orbs = Array.from({ length: 24 }, (_, i) => i);
const focusIndex = 15;

export default function ResonancePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <motion.section {...fadeIn} className="space-y-14">
        {/* 顶部：两个梦境球，连线，中间主题标签 */}
        <div className="flex items-center px-2">
          <Art className="aspect-square w-24 shrink-0 rounded-full" />
          <span aria-hidden className="h-px flex-1 bg-gold-deep" />
          <span className="rounded-full border border-gold-deep px-6 py-1.5 font-serif text-lg text-gold">
            坠落
          </span>
          <span aria-hidden className="h-px flex-1 bg-gold-deep" />
          <Art className="aspect-square w-24 shrink-0 rounded-full" />
        </div>

        <h1 className="text-center font-serif text-3xl leading-relaxed tracking-wider text-ink">
          今晚，有 37 个人和你
          <br />
          梦见了同一件事
        </h1>

        {/* 匹配矩阵 */}
        <div className="grid grid-cols-6 gap-x-4 gap-y-8">
          {orbs.map((i) =>
            i === focusIndex ? (
              <div key={i} className="relative">
                <span className="absolute -inset-1.5 rounded-full border border-gold" />
                <Art className="aspect-square w-full rounded-full" />
                <span className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap text-xs text-gold">
                  相似度 92% · 观星人
                </span>
              </div>
            ) : (
              <Art key={i} className="aspect-square w-full rounded-full" />
            ),
          )}
        </div>
      </motion.section>

      <motion.section
        {...fadeIn}
        className="mt-auto space-y-4 pt-16 text-center"
      >
        <button className="glass w-full !border-gold-deep py-4 font-serif text-lg text-gold transition-opacity duration-fade hover:opacity-70">
          开启 48 小时匿名对话
        </button>
        <p className="text-sm text-muted">48 小时后自动关闭</p>
      </motion.section>

      <BottomNav />
    </main>
  );
}
