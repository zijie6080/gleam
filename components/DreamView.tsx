"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Feather,
  HeartHandshake,
  LifeBuoy,
  RefreshCw,
  Star,
  Waves,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DreamImage from "@/components/DreamImage";
import BottomNav from "@/components/BottomNav";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

export type DreamData = {
  id: string;
  raw_text: string;
  lucidity: number | null;
  emotion_score: number | null;
  is_night_mode: boolean;
  created_at: string;
  motifs: string[];
};

const PRESET_WORDS = ["坠落", "等待", "失去", "自由", "追逐", "无声"];

function emotionLabel(score: number | null) {
  if (score === null) return null;
  if (score > 0.3) return "平静";
  if (score < -0.3) return "惊惧";
  return "沉静";
}

export default function DreamView({ dream }: { dream: DreamData }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [story, setStory] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [published, setPublished] = useState(false);
  const [iamtooCount, setIamtooCount] = useState(0);
  const [iamtooDone, setIamtooDone] = useState(false);
  const [wordSent, setWordSent] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [wordCloud, setWordCloud] = useState<{ word: string; count: number }[]>([]);
  const [wordTotal, setWordTotal] = useState(0);
  const [resonance, setResonance] = useState<{
    strong: number;
    weak: number;
    motif: string | null;
    window: "today" | "month" | "ever";
  } | null>(null);
  const [findings, setFindings] = useState<{ message: string }[]>([]);

  const date = new Date(dream.created_at);
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
  const lines = dream.raw_text.split("\n").filter(Boolean);
  const preview = expanded ? lines : lines.slice(0, 3);

  useEffect(() => {
    if (dream.is_night_mode) return;
    fetch(`/api/dreams/${dream.id}/iamtoo`)
      .then((r) => r.json())
      .then((d) => setIamtooCount(d.count ?? 0))
      .catch(() => {});
    fetch(`/api/dreams/${dream.id}/words`)
      .then((r) => r.json())
      .then((d) => {
        setWordCloud(d.top ?? []);
        setWordTotal(d.total ?? 0);
      })
      .catch(() => {});
    fetch(`/api/dreams/${dream.id}/resonance`)
      .then((r) => r.json())
      .then((d) => setResonance(d))
      .catch(() => {});
    fetch(`/api/dreams/${dream.id}/archaeology`)
      .then((r) => r.json())
      .then((d) => setFindings(d.findings ?? []))
      .catch(() => {});
  }, [dream.id, dream.is_night_mode]);

  async function sendIamtoo() {
    if (iamtooDone) return; // 不可撤销，不可重复
    setIamtooDone(true);
    const res = await fetch(`/api/dreams/${dream.id}/iamtoo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => null);
    if (res?.ok) setIamtooCount((await res.json()).count);
  }

  async function sendWord(word: string) {
    if (wordSent || !word.trim()) return;
    setWordSent(true);
    await fetch(`/api/dreams/${dream.id}/words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId(), word: word.trim() }),
    }).catch(() => {});
  }

  // 已有故事则带出
  useEffect(() => {
    if (dream.is_night_mode) return;
    fetch(`/api/dreams/${dream.id}/story`)
      .then((r) => r.json())
      .then((d) => setStory(d.story?.content ?? null))
      .catch(() => {});
  }, [dream.id, dream.is_night_mode]);

  async function generateStory() {
    if (storyLoading) return;
    setStoryLoading(true);
    const res = await fetch(`/api/dreams/${dream.id}/story`, {
      method: "POST",
    }).catch(() => null);
    if (res?.ok) setStory((await res.json()).story.content);
    setStoryLoading(false);
  }

  async function reprocess() {
    if (reprocessing) return;
    setReprocessing(true);
    await fetch(`/api/dreams/${dream.id}/reprocess`, { method: "POST" }).catch(
      () => {},
    );
    setReprocessing(false);
    router.refresh();
  }

  async function publish() {
    const res = await fetch(`/api/dreams/${dream.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => null);
    if (res?.ok) setPublished(true);
  }

  // 深夜模式：不解读、不生成、不推送。产品让路。
  if (dream.is_night_mode) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
        <motion.div
          {...fadeIn}
          className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
        >
          <p className="font-serif text-3xl leading-relaxed tracking-wider text-ink">
            你记下来了。
            <br />
            天亮了再看。
          </p>
          <a
            href="https://www.chinacdc.cn/xlwsrx/"
            target="_blank"
            rel="noreferrer"
            aria-label="心理援助资源"
            className="text-muted transition-opacity duration-fade hover:opacity-70"
          >
            <LifeBuoy strokeWidth={1.5} className="h-5 w-5" />
          </a>
        </motion.div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md pb-32">
      <DreamImage src={null} />

      <motion.div {...fadeIn} className="space-y-6 px-6">
        <div className="space-y-3">
          <h1 className="font-serif text-3xl leading-snug text-ink">
            {(lines[0]?.slice(0, 12) ?? "一个梦").replace(/[，。、；：,.;:]+$/, "")}
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            {dateStr}
            {dream.lucidity !== null && (
              <>
                <span>·</span> 清醒度
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      strokeWidth={1.5}
                      className={`h-3.5 w-3.5 ${
                        n <= (dream.lucidity ?? 0)
                          ? "text-gold"
                          : "text-gold-deep"
                      }`}
                      fill={n <= (dream.lucidity ?? 0) ? "currentColor" : "none"}
                    />
                  ))}
                </span>
              </>
            )}
            {emotionLabel(dream.emotion_score) && (
              <>
                <span>·</span> 情绪{" "}
                <span className="text-ink">
                  {emotionLabel(dream.emotion_score)}
                </span>
              </>
            )}
          </p>
        </div>

        {dream.motifs.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {dream.motifs.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gold-deep px-5 py-1.5 text-sm text-gold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2 leading-relaxed text-ink">
          {preview.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {lines.length > 3 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 text-gold transition-opacity duration-fade hover:opacity-70"
          >
            展开全文
            <ChevronDown strokeWidth={1.5} className="h-4 w-4" />
          </button>
        )}

        {/* 三个动作：再生成 / 续写故事 / 投放回响（显式发布） */}
        <div className="flex justify-between pt-4">
          {[
            {
              label: reprocessing ? "重新提取中…" : "再生成",
              Icon: RefreshCw,
              onClick: reprocess,
              done: false,
            },
            {
              label: storyLoading ? "书写中…" : "续写故事",
              Icon: Feather,
              onClick: generateStory,
              done: false,
            },
            {
              label: published ? "已投放" : "投放回响",
              Icon: Waves,
              onClick: publish,
              done: published,
            },
          ].map(({ label, Icon, onClick, done }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center gap-3 transition-opacity duration-fade hover:opacity-70"
            >
              <span
                className={`glass flex h-16 w-16 items-center justify-center !rounded-full ${
                  done ? "!border-gold" : ""
                }`}
              >
                <Icon strokeWidth={1.5} className="h-5 w-5 text-gold" />
              </span>
              <span className="text-xs text-ink">{label}</span>
            </button>
          ))}
        </div>

        {/* 续写的故事 */}
        {story && (
          <div className="glass space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm text-gold">
              <Feather strokeWidth={1.5} className="h-4 w-4" />
              续写的故事
            </p>
            <div className="space-y-2 text-sm leading-relaxed text-ink">
              {story.split("\n").filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* 意象考古 */}
        {findings.length > 0 && (
          <div className="glass space-y-2 p-5">
            {findings.map((f) => (
              <p key={f.message} className="text-sm leading-relaxed text-gold">
                {f.message}
              </p>
            ))}
          </div>
        )}

        {/* 产品心跳：强匹配醒目，仅弱匹配安静一行，全 0 不显示 */}
        {resonance && resonance.strong > 0 && (
          <div className="glass p-5">
            <p className="font-serif text-lg leading-relaxed text-ink">
              {resonance.window === "today"
                ? "昨晚"
                : resonance.window === "month"
                  ? "这个月"
                  : "曾经"}
              ，有 {resonance.strong} 个人和你梦见了
              {resonance.motif ? `「${resonance.motif}」` : "同一件事"}。
            </p>
          </div>
        )}
        {resonance && resonance.strong === 0 && resonance.weak > 0 && (
          <p className="text-sm leading-relaxed text-muted">
            有 {resonance.weak} 个梦，和这个梦隔着相似的影子。
          </p>
        )}

        {/* 第一级：「我也是」——最高频社交行为，最大点击区域 */}
        <button
          onClick={sendIamtoo}
          disabled={iamtooDone}
          className={`glass w-full py-4 font-serif text-lg transition-opacity duration-fade ${
            iamtooDone
              ? "!border-gold text-gold"
              : "text-ink hover:opacity-70"
          }`}
        >
          {iamtooDone ? "已共鸣" : "我也是"}
        </button>
        {iamtooCount > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <HeartHandshake strokeWidth={1.5} className="h-4 w-4 text-gold" />
            有 {iamtooCount} 个人说，他们也梦见过这个
          </p>
        )}

        {/* 第二级：一个词 */}
        <div className="space-y-3">
          {wordCloud.length > 0 && (
            <p className="text-sm leading-relaxed text-muted">
              {wordTotal} 个人看了这个梦。最常想到的
              {wordCloud.length > 1 ? `${wordCloud.length} 个词` : "词"}是：
              <span className="text-gold">
                {wordCloud.map((w) => w.word).join("、")}
              </span>
              。
            </p>
          )}
          {!wordSent ? (
            <>
              <p className="text-sm text-muted">这个梦让你想到什么？</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_WORDS.map((w) => (
                  <button
                    key={w}
                    onClick={() => sendWord(w)}
                    className="rounded-full border border-gold-deep px-4 py-1 text-sm text-gold transition-opacity duration-fade hover:opacity-70"
                  >
                    {w}
                  </button>
                ))}
                <input
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value.slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && sendWord(customWord)}
                  placeholder="一个词"
                  className="w-20 rounded-full border border-glass-border bg-transparent px-4 py-1 text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-gold-deep">收到了。</p>
          )}
        </div>

        <p className="pt-2 text-xs text-muted">
          以下为文化视角参考，非心理诊断 ·{" "}
          <Link href="/plaza" className="text-gold-deep">
            去共鸣广场
          </Link>
        </p>
      </motion.div>

      <BottomNav />
    </main>
  );
}
