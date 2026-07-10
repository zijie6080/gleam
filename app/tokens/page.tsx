"use client";

import { motion } from "framer-motion";
import { Moon, Star, Sparkles, Feather, Compass, Wind } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section {...fadeIn} className="space-y-6">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      {children}
    </motion.section>
  );
}

function Swatch({
  name,
  hex,
  className,
}: {
  name: string;
  hex: string;
  className: string;
}) {
  return (
    <div className="glass p-6">
      <p className={`mb-4 font-serif text-xl ${className}`}>月落乌啼霜满天</p>
      <p className="text-sm text-muted">{name}</p>
      <p className="text-sm text-gold-deep">{hex}</p>
    </div>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-24 px-8 py-32">
      <motion.header {...fadeIn} className="space-y-4">
        <h1 className="font-serif text-4xl text-ink">设计系统 · Tokens</h1>
        <p className="text-muted">
          背景、玻璃、文字、字体与图标的全部设计变量。
        </p>
      </motion.header>

      <Section title="背景 · 三层叠加">
        <p className="text-muted">
          你现在看到的页面背景即为三层叠加：底层 180° 线性渐变（#0B1026 →
          #1E1B3A），中层径向光晕 blur(240px) / opacity 0.5 置于顶部偏上，
          顶层 noise 纹理 opacity 0.04 / mix-blend-mode: overlay。
        </p>
      </Section>

      <Section title="玻璃卡片">
        <div className="glass p-10">
          <p className="font-serif text-xl text-ink">玻璃质感</p>
          <p className="mt-3 text-muted">
            rgba(255,255,255,0.04) · blur(20px) · 1px solid
            rgba(255,255,255,0.10) · radius 24px
          </p>
        </div>
      </Section>

      <Section title="文字四级">
        <div className="grid gap-6 sm:grid-cols-2">
          <Swatch name="主文字 · 月白" hex="#F5F1E8" className="text-ink" />
          <Swatch name="金色强调" hex="#E8C88A" className="text-gold" />
          <Swatch name="金色暗部" hex="#967C4E" className="text-gold-deep" />
          <Swatch name="次级灰" hex="#8A8AA3" className="text-muted" />
        </div>
      </Section>

      <Section title="字体对比">
        <div className="glass space-y-8 p-10">
          <div>
            <p className="font-serif text-3xl text-ink">
              江天一色无纤尘，皎皎空中孤月轮
            </p>
            <p className="mt-2 text-sm text-muted">标题 · Noto Serif SC</p>
          </div>
          <div>
            <p className="text-lg text-ink">
              江天一色无纤尘，皎皎空中孤月轮
            </p>
            <p className="mt-2 text-sm text-muted">
              正文 · Noto Sans SC Light（300）
            </p>
          </div>
        </div>
      </Section>

      <Section title="图标 · strokeWidth 1.5">
        <div className="glass flex items-center gap-10 p-10">
          <Moon strokeWidth={1.5} className="h-6 w-6 text-gold" />
          <Star strokeWidth={1.5} className="h-6 w-6 text-gold" />
          <Sparkles strokeWidth={1.5} className="h-6 w-6 text-ink" />
          <Feather strokeWidth={1.5} className="h-6 w-6 text-ink" />
          <Compass strokeWidth={1.5} className="h-6 w-6 text-muted" />
          <Wind strokeWidth={1.5} className="h-6 w-6 text-muted" />
        </div>
      </Section>
    </main>
  );
}
