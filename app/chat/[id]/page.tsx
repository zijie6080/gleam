"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Flag, Send, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { anonUserId } from "@/lib/user";

type Msg = { id: string; content: string; own: boolean };

// 48h 匿名对话：全程无身份信息，到期自动关闭且不留痕
export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "waiting" | "open" | "closed">(
    "loading",
  );
  const [messages, setMessages] = useState<Msg[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/conversations/${id}?userId=${anonUserId()}`,
    ).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setStatus(data.status);
    setMessages(data.messages ?? []);
    setExpiresAt(data.expiresAt ?? null);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    await fetch(`/api/conversations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId(), content }),
    }).catch(() => {});
    load();
  }

  const hoursLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600_000))
    : null;

  if (status === "closed") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
        <div className="flex flex-1 items-center justify-center text-center">
          <p className="font-serif text-2xl leading-relaxed text-ink">
            对话已经关闭。
            <br />
            <span className="text-lg text-muted">它不会留下痕迹。</span>
          </p>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <header className="flex items-start justify-between pb-6">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl text-ink">匿名对话</h1>
          <p className="text-xs text-muted">
            {status === "waiting"
              ? "等待对方同意…"
              : hoursLeft !== null
                ? `剩余约 ${hoursLeft} 小时 · 关闭后不留痕`
                : "48 小时后自动关闭"}
          </p>
        </div>
        {/* 自保出口：随时离开且不留痕 */}
        <div className="flex gap-4 pt-1 text-muted">
          <button
            onClick={async () => {
              if (!window.confirm("举报这个对话？内容会留证给我们复核，对话立即关闭。")) return;
              await fetch(`/api/conversations/${id}/report`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: anonUserId() }),
              }).catch(() => {});
              setStatus("closed");
            }}
            aria-label="举报"
            className="transition-opacity duration-fade hover:opacity-70"
          >
            <Flag strokeWidth={1.5} className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("关闭对话？消息会立即销毁，不可恢复。")) return;
              await fetch(`/api/conversations/${id}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: anonUserId() }),
              }).catch(() => {});
              setStatus("closed");
            }}
            aria-label="关闭对话"
            className="transition-opacity duration-fade hover:opacity-70"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`glass max-w-[80%] p-4 text-sm text-ink ${
              m.own ? "ml-auto !border-gold-deep" : ""
            }`}
          >
            {m.content}
          </div>
        ))}
        {status === "open" && messages.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">
            对方也梦见了同一件事。说句话吧。
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {status === "open" && (
        <div className="glass mt-4 flex items-center gap-3 p-2 pl-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="说句话…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <button
            onClick={send}
            className="glass flex h-10 w-10 shrink-0 items-center justify-center !rounded-full transition-opacity duration-fade hover:opacity-70"
          >
            <Send strokeWidth={1.5} className="h-4 w-4 text-gold" />
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
