"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { Send, User } from "lucide-react";
import { anonUserId } from "@/lib/user";

type Comment = {
  id: string;
  content: string;
  nickname: string;
  avatarUrl: string | null;
  created_at: string;
};

// 广场评论区：列表（昵称+头像+内容）+ 输入框。评论走已有 echoes 接口（带机审）。
export default function CommentSection({ dreamId }: { dreamId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch(`/api/dreams/${dreamId}/echoes`).catch(() => null);
    if (res?.ok) setComments((await res.json()).echoes ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dreamId]);

  async function send() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/dreams/${dreamId}/echoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId(), content }),
    }).catch(() => null);
    setSending(false);
    if (!res) return;
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "发送失败");
      return;
    }
    setInput("");
    load();
  }

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-xl text-ink">回响</h2>

      <div className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted">还没有人回响。你想对做这个梦的人说什么？</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <span className="glass flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden !rounded-full">
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ filter: "saturate(0.85)" }}
                />
              ) : (
                <User strokeWidth={1.5} className="h-4 w-4 text-muted" />
              )}
            </span>
            <div className="space-y-1">
              <p className="text-xs text-muted">{c.nickname}</p>
              <p className="text-sm leading-relaxed text-ink">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass flex items-center gap-3 p-2 pl-5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="你想对做这个梦的人说什么？"
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        <button
          onClick={send}
          disabled={sending}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center !rounded-full transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
        >
          <Send strokeWidth={1.5} className="h-4 w-4 text-gold" />
        </button>
      </div>
      {error && <p className="text-xs text-gold-deep">{error}</p>}
    </div>
  );
}
