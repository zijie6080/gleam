"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import Art from "@/components/Art";
import StarCanvas, {
  constellations,
  focusStar,
} from "@/components/StarCanvas";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

const MIN_MY_DREAMS = 20; // 自己的梦不足 20 个时，「我的」视图不可用（新用户空屏问题）

export default function StarmapPage() {
  const [zoom, setZoom] = useState(1);
  const [myDreams, setMyDreams] = useState(0);
  const [totalDreams, setTotalDreams] = useState<number | null>(null);
  const [view, setView] = useState<"all" | "mine">("all"); // 默认全站

  useEffect(() => {
    fetch(`/api/stats?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => setMyDreams(d.dreamCount ?? 0))
      .catch(() => {});
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setTotalDreams(d.totalDreams ?? 0))
      .catch(() => {});
  }, []);

  const myViewLocked = myDreams < MIN_MY_DREAMS;

  return (
    <main className="relative mx-auto min-h-screen max-w-md overflow-hidden">
      <div
        className="absolute inset-0 bottom-28 transition-transform duration-fade"
        style={{ transform: `scale(${zoom})`, transformOrigin: "50% 45%" }}
      >
        <StarCanvas />

        {constellations.map((c) => (
          <span
            key={c.name}
            className="absolute -translate-x-1/2 font-serif text-sm text-gold"
            style={{ left: `${c.label.x * 100}%`, top: `${c.label.y * 100}%` }}
          >
            {c.name}
          </span>
        ))}

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
          {view === "all" ? "全站星图" : "我的星图"}
          <span className="ml-2 font-sans text-sm text-muted">
            {totalDreams !== null && `· 共 ${totalDreams} 个梦`}
          </span>
        </h1>
        <div className="glass flex !rounded-full p-1 text-sm">
          <button
            onClick={() => !myViewLocked && setView("mine")}
            disabled={myViewLocked}
            className={`rounded-full px-4 py-1 transition-opacity duration-fade ${
              view === "mine"
                ? "bg-glass text-gold"
                : myViewLocked
                  ? "text-muted opacity-40"
                  : "text-muted hover:opacity-70"
            }`}
          >
            我的
          </button>
          <button
            onClick={() => setView("all")}
            className={`rounded-full px-4 py-1 transition-opacity duration-fade ${
              view === "all" ? "bg-glass text-gold" : "text-muted hover:opacity-70"
            }`}
          >
            全站
          </button>
        </div>
      </motion.header>

      {myViewLocked && (
        <p className="relative px-6 pt-2 text-xs text-muted">
          再记 {MIN_MY_DREAMS - myDreams} 个梦，就能解锁只属于你的星图
        </p>
      )}

      {/* 缩放控件 */}
      <div className="absolute bottom-44 right-6 flex flex-col items-center gap-3 text-muted">
        <button
          onClick={() => setZoom((z) => Math.min(2.4, z + 0.35))}
          aria-label="放大"
          className="transition-opacity duration-fade hover:opacity-70"
        >
          <Plus strokeWidth={1.5} className="h-5 w-5" />
        </button>
        <input
          type="range"
          min={1}
          max={2.4}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="缩放"
          className="h-32 w-1 cursor-pointer appearance-none rounded-full bg-glass-border accent-gold"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
        />
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.35))}
          aria-label="缩小"
          className="transition-opacity duration-fade hover:opacity-70"
        >
          <Minus strokeWidth={1.5} className="h-5 w-5" />
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
