"use client";

import { motion } from "framer-motion";
import { Heart, Link2, MessageCircleQuestion, Sparkles } from "lucide-react";
import Art from "@/components/Art";
import TabBar from "@/components/TabBar";
import { fadeIn } from "@/lib/motion";

const filters = [
  { label: "最新", active: false },
  { label: "待回响", active: true },
  { label: "高共鸣", active: false },
];

const aiActions = [
  { label: "共感", Icon: Heart },
  { label: "联想", Icon: Link2 },
  { label: "追问", Icon: MessageCircleQuestion },
];

const cards = [
  {
    title: "我走进一扇发光的门",
    lines: ["门后是熟悉的街道，却没有人。", "我一直在找一个人，却想不起是谁。"],
    tags: ["门", "探索", "记忆", "寻找"],
  },
  {
    title: "我爬上没有尽头的楼梯",
    lines: ["每一步都很轻，却永远到不了顶端。", "我在找出口，还是在找答案？"],
    tags: ["楼梯", "迷途", "成长", "追寻"],
  },
];

function CardHead({
  title,
  lines,
  tags,
}: {
  title: string;
  lines: string[];
  tags: string[];
}) {
  return (
    <div className="flex gap-5">
      <Art className="h-28 w-28 shrink-0 rounded-glass" />
      <div className="space-y-3">
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        <div className="text-sm leading-relaxed text-muted">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gold-deep px-2.5 py-0.5 text-xs text-gold"
            >
              {tag}
            </span>
          ))}
          <span className="ml-auto text-xs text-muted">12 回响</span>
        </div>
      </div>
    </div>
  );
}

export default function PlazaPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-6 pb-32 pt-14">
      <motion.header {...fadeIn} className="space-y-5 px-2">
        <h1 className="font-serif text-4xl text-ink">回响广场</h1>
        <div className="flex items-center gap-3 text-sm">
          {filters.map(({ label, active }, i) => (
            <span key={label} className="flex items-center gap-3">
              {i > 0 && <span className="text-muted">·</span>}
              <span
                className={
                  active
                    ? "border-b border-gold pb-1 text-gold"
                    : "text-muted"
                }
              >
                {label}
              </span>
            </span>
          ))}
        </div>
      </motion.header>

      <motion.article {...fadeIn} className="glass space-y-5 p-5">
        <CardHead
          title="我在梦里遇见一只鲸鱼"
          lines={[
            "它静静地从云层中游过，周围没有水，",
            "只有风在流动。",
            "我想触碰它，却醒了。",
          ]}
          tags={["鲸鱼", "飞行", "孤独", "梦中相遇"]}
        />

        <div className="glass space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Sparkles strokeWidth={1.5} className="h-5 w-5 text-gold" />
            <span className="text-ink">AI 意象拆解</span>
          </div>
          <p className="text-xs text-muted">以下为文化视角参考，非心理诊断</p>
          <p className="text-sm leading-relaxed text-ink">
            鲸鱼在梦中常象征深层的情感与潜意识的智慧。它在云层中游动，
            可能反映了你对自由与超越现实的渴望，也暗示你正与内在深处
            的自己相遇。触碰未果，或许表达了你对连接的向往与现实中的
            距离感。
          </p>
        </div>

        <div className="flex gap-3">
          {aiActions.map(({ label, Icon }) => (
            <button
              key={label}
              className="glass flex flex-1 items-center justify-center gap-2 !rounded-2xl py-3 text-sm text-ink transition-opacity duration-fade hover:opacity-70"
            >
              <Icon strokeWidth={1.5} className="h-4 w-4 text-gold" />
              {label}
            </button>
          ))}
        </div>
      </motion.article>

      {cards.map((card) => (
        <motion.article key={card.title} {...fadeIn} className="glass p-5">
          <CardHead {...card} />
        </motion.article>
      ))}

      <TabBar active="echo" />
    </main>
  );
}
