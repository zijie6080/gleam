"use client";

import { motion } from "framer-motion";
import { HeartHandshake, Send, Sprout } from "lucide-react";
import Art from "@/components/Art";
import TabBar from "@/components/TabBar";
import { fadeIn } from "@/lib/motion";

const replies = [
  {
    kind: "共感",
    text: "我也梦过在水上漂着，醒来枕头是湿的。",
    count: 126,
    marked: true,
    highlighted: false,
  },
  {
    kind: "联想",
    text: "让我想起小时候学游泳沉下去那一刻。",
    count: 98,
    marked: false,
    highlighted: false,
  },
  {
    kind: "追问",
    text: "那片海是暖的还是冷的？",
    count: 143,
    marked: false,
    highlighted: true,
  },
];

export default function EchoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-10 px-6 pb-32 pt-14">
      <motion.section {...fadeIn} className="glass flex items-center gap-5 p-5">
        <Art className="h-28 w-28 shrink-0 rounded-glass" />
        <div className="space-y-2">
          <h1 className="font-serif text-2xl text-ink">坠入无声的海</h1>
          <p className="text-sm text-muted">匿名 · 织梦师</p>
        </div>
      </motion.section>

      <motion.section {...fadeIn} className="relative space-y-6 pl-4">
        {/* 左侧时间线 */}
        <span
          aria-hidden
          className="absolute -left-1 top-8 bottom-8 w-px bg-glass-border"
        />

        {replies.map(({ kind, text, count, marked, highlighted }) => (
          <div key={kind} className="relative">
            <span
              aria-hidden
              className="absolute -left-5 top-9 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-muted"
            />
            <div
              className={`glass space-y-3 p-5 ${
                highlighted ? "!border-gold" : ""
              }`}
            >
              <span className="glass inline-block !rounded-full px-3 py-1 text-xs text-ink">
                {kind}
              </span>
              <p className="text-lg text-ink">{text}</p>
              <div className="flex items-center justify-between">
                {marked ? (
                  <span className="flex items-center gap-2 text-sm text-gold">
                    <HeartHandshake strokeWidth={1.5} className="h-4 w-4" />
                    梦主标记 · 这很触动我
                  </span>
                ) : (
                  <span />
                )}
                <span className="flex items-center gap-1.5 text-sm text-gold-deep">
                  {count}
                  <Sprout strokeWidth={1.5} className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="glass flex items-center gap-3 !border-gold-deep p-3 pl-6">
          <span className="flex-1 text-muted">写下你的回响...</span>
          <button className="glass flex h-11 w-11 items-center justify-center !rounded-full transition-opacity duration-fade hover:opacity-70">
            <Send strokeWidth={1.5} className="h-5 w-5 text-gold" />
          </button>
        </div>
      </motion.section>

      <TabBar active="echo" />
    </main>
  );
}
