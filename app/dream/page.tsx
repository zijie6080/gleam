"use client";

import { motion } from "framer-motion";
import { ChevronDown, Feather, RefreshCw, Waves } from "lucide-react";
import Art from "@/components/Art";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";

const tags = ["坠落", "水", "月", "独身"];

const actions = [
  { label: "再生成", Icon: RefreshCw },
  { label: "续写故事", Icon: Feather },
  { label: "投放回响", Icon: Waves },
];

export default function DreamPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md pb-32">
      <Art className="h-[46vh] w-full" />

      <motion.div {...fadeIn} className="space-y-6 px-6">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl text-ink">坠入无声的海</h1>
          <p className="text-sm text-muted">
            7月8日 · 清醒度 · 情绪 <span className="text-ink">沉静</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gold-deep px-5 py-1.5 text-sm text-gold"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="space-y-2 leading-relaxed text-ink">
          <p>我从高处坠落，却没有恐惧。</p>
          <p>风在耳边退去，世界变得越来越静，</p>
          <p>直到我落进一片黑色的海，柔软，冰冷，接住了我。</p>
        </div>

        <button className="flex items-center gap-2 text-gold transition-opacity duration-fade hover:opacity-70">
          展开全文
          <ChevronDown strokeWidth={1.5} className="h-4 w-4" />
        </button>

        <div className="flex justify-between pt-8">
          {actions.map(({ label, Icon }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-3 transition-opacity duration-fade hover:opacity-70"
            >
              <span className="glass flex h-20 w-20 items-center justify-center !rounded-full">
                <Icon strokeWidth={1.5} className="h-6 w-6 text-gold" />
              </span>
              <span className="text-sm text-ink">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <BottomNav />
    </main>
  );
}
