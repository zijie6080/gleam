"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, Send } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import VoiceRing from "@/components/VoiceRing";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function CapturePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTime(nowHHMM());
    const t = setInterval(() => setTime(nowHHMM()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function startRecording() {
    if (recording || saving || transcribing) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(s);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        s.getTracks().forEach((t) => t.stop());
        setStream(null);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size < 2000) return; // 误触，太短不转写
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("file", blob);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (res.ok && data.text) {
            setText((prev) => (prev ? `${prev}\n${data.text}` : data.text));
          } else {
            setError("转写失败了，直接打字也可以");
          }
        } catch {
          setError("转写失败了，直接打字也可以");
        } finally {
          setTranscribing(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setStream(s);
      setRecording(true);
      setError(null);
    } catch {
      // 录音权限被拒 → 降级为文本输入（v2 §8）
      setVoiceUnavailable(true);
      textareaRef.current?.focus();
    }
  }

  function stopRecording() {
    if (!recording) return;
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          userId: anonUserId(),
          localHour: new Date().getHours(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      // 网络断开等场景：本地暂存已在 catch 中处理
      localStorage.removeItem("gleam_draft");
      router.push(`/dream/${data.dream.id}`);
    } catch (e) {
      // 本地暂存，恢复后可再提交（v2 §8）
      localStorage.setItem("gleam_draft", text);
      setError(`没能保存：${(e as Error).message}。已在本地暂存，稍后再试。`);
      setSaving(false);
    }
  }

  // 恢复本地暂存
  useEffect(() => {
    const draft = localStorage.getItem("gleam_draft");
    if (draft) setText(draft);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <Moon strokeWidth={1.5} className="h-7 w-7 text-gold" />

      <motion.div
        {...fadeIn}
        className="flex flex-1 flex-col items-center justify-center gap-10"
      >
        <h1 className="font-serif text-4xl tracking-[0.2em] text-ink">
          说吧，我在听
        </h1>

        {/* 长按录音区：全圆环可按（30 秒闭眼可完成） */}
        <button
          aria-label={recording ? "松手结束录音" : "长按开始录音"}
          className="select-none"
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          onContextMenu={(e) => e.preventDefault()}
        >
          <VoiceRing stream={stream} />
        </button>

        <p className="text-sm text-muted">
          {recording
            ? `松手结束 · ${time}`
            : transcribing
              ? "正在整理你说的话…"
              : voiceUnavailable
                ? "录音不可用 · 直接写下来"
                : `长按圆环说话 · ${time}`}
        </p>

        <div className="glass w-full p-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="想到什么写什么"
            rows={4}
            autoFocus
            className="w-full resize-none bg-transparent text-ink outline-none placeholder:text-muted"
          />
          <div className="flex items-center justify-between pt-2">
            {error ? (
              <span className="pr-3 text-xs text-gold-deep">{error}</span>
            ) : (
              <span />
            )}
            <button
              onClick={submit}
              disabled={!text.trim() || saving}
              className="glass flex h-11 w-11 shrink-0 items-center justify-center !rounded-full transition-opacity duration-fade hover:opacity-70 disabled:opacity-30"
            >
              <Send strokeWidth={1.5} className="h-5 w-5 text-gold" />
            </button>
          </div>
        </div>
        {saving && <p className="text-sm text-muted">正在收好这个梦…</p>}
      </motion.div>

      <BottomNav />
    </main>
  );
}
