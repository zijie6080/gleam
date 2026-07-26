"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/apiClient";

type Dream = {
  id: string;
  raw_text: string;
  emotion_score: number | null;
  lucidity: number | null;
  is_recurring: boolean;
  visibility: "private" | "public";
  is_night_mode: boolean;
  created_at: string;
  motifs: string[];
};

export default function MyDreamsPage() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | "private" | "public">("all");
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  const filteredDreams = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return dreams.filter((dream) => {
      if (visibility !== "all" && dream.visibility !== visibility) return false;
      if (!needle) return true;
      return (dream.raw_text + " " + dream.motifs.join(" "))
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [dreams, query, visibility]);

  const stats = useMemo(() => {
    const now = new Date();
    const motifCounts = new Map<string, number>();
    let thisMonth = 0;
    for (const dream of dreams) {
      const date = new Date(dream.created_at);
      if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
        thisMonth += 1;
      }
      for (const motif of dream.motifs) {
        motifCounts.set(motif, (motifCounts.get(motif) ?? 0) + 1);
      }
    }
    const topMotif = [...motifCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { thisMonth, topMotif: topMotif?.[0] ?? "\u6682\u65e0" };
  }, [dreams]);

  async function load() {
    setLoading(true);
    const response = await authFetch("/api/account/dreams");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setDreams(data.dreams ?? []);
    else setMessage(data.error ?? "读取失败");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(id: string) {
    const response = await authFetch(`/api/dreams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "保存失败");
      return;
    }
    setDreams((items) =>
      items.map((item) =>
        item.id === id ? { ...item, raw_text: draft.trim() } : item,
      ),
    );
    setEditing(null);
    setMessage("已保存；AI 意象会在你打开详情后重新生成。");
  }

  async function reanalyze(id: string) {
    setReanalyzing(id);
    setMessage(null);
    const response = await authFetch("/api/dreams/" + id + "/reprocess", {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "\u5206\u6790\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
    } else {
      const motifs = (data.motifs ?? []).map((item: { name: string }) => item.name);
      setDreams((items) =>
        items.map((item) => (item.id === id ? { ...item, motifs } : item)),
      );
      setMessage("AI \u6807\u7b7e\u5df2\u7ecf\u66f4\u65b0\u3002");
    }
    setReanalyzing(null);
  }

  async function remove(id: string) {
    if (!window.confirm("确定删除这个梦吗？删除后无法恢复。")) return;
    const response = await authFetch(`/api/dreams/${id}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "删除失败");
      return;
    }
    setDreams((items) => items.filter((item) => item.id !== id));
    setMessage("这个梦已经删除。");
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-6 pb-32 pt-14">
      <header className="space-y-2">
        <h1 className="font-serif text-4xl text-ink">我的梦境</h1>
        <p className="text-sm text-muted">查看、修改或删除你记录过的梦。</p>
      </header>

      {!loading && dreams.length > 0 && (
        <>
          <section className="grid grid-cols-3 gap-3" aria-label={"\u68a6\u5883\u7edf\u8ba1"}>
            <div className="glass p-3 text-center">
              <p className="font-serif text-2xl text-ink">{dreams.length}</p>
              <p className="mt-1 text-xs text-muted">{"\u5168\u90e8\u68a6\u5883"}</p>
            </div>
            <div className="glass p-3 text-center">
              <p className="font-serif text-2xl text-ink">{stats.thisMonth}</p>
              <p className="mt-1 text-xs text-muted">{"\u672c\u6708\u8bb0\u5f55"}</p>
            </div>
            <div className="glass p-3 text-center">
              <p className="truncate font-serif text-lg text-gold">{stats.topMotif}</p>
              <p className="mt-1 text-xs text-muted">{"\u5e38\u89c1\u610f\u8c61"}</p>
            </div>
          </section>

          <section className="space-y-3">
            <label className="glass flex items-center gap-3 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={"\u641c\u7d22\u68a6\u5883\u5185\u5bb9\u6216 AI \u6807\u7b7e"}
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </label>
            <div className="flex gap-2" aria-label={"\u53ef\u89c1\u8303\u56f4\u7b5b\u9009"}>
              {([
                ["all", "\u5168\u90e8"],
                ["private", "\u4ec5\u81ea\u5df1"],
                ["public", "\u5df2\u516c\u5f00"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setVisibility(value)}
                  className={"rounded-full border px-4 py-2 text-xs transition-colors " + (
                    visibility === value
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-glass-border text-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {message && <p className="glass p-4 text-sm text-gold">{message}</p>}

      {loading ? (
        <p className="pt-20 text-center text-sm text-muted">正在翻找梦境…</p>
      ) : dreams.length === 0 ? (
        <div className="space-y-5 pt-20 text-center">
          <p className="font-serif text-xl text-ink">这里还没有梦。</p>
          <Link href="/capture" className="text-sm text-gold">
            去记录第一个梦
          </Link>
        </div>
      ) : filteredDreams.length === 0 ? (
        <div className="space-y-2 pt-12 text-center">
          <p className="font-serif text-xl text-ink">
            {"\u6ca1\u6709\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u68a6\u3002"}
          </p>
          <button
            onClick={() => { setQuery(""); setVisibility("all"); }}
            className="text-sm text-gold"
          >
            {"\u6e05\u9664\u7b5b\u9009"}
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          {filteredDreams.map((dream) => {
            const date = new Date(dream.created_at);
            const isEditing = editing === dream.id;
            return (
              <article key={dream.id} className="glass space-y-4 p-5">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日
                  </span>
                  <span>{dream.visibility === "public" ? "已投放" : "仅自己可见"}</span>
                </div>

                {isEditing ? (
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-glass-border bg-transparent p-3 text-sm leading-relaxed text-ink outline-none"
                  />
                ) : (
                  <Link
                    href={`/dream/${dream.id}`}
                    className="block whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink"
                  >
                    {dream.raw_text.length > 160
                      ? `${dream.raw_text.slice(0, 160)}…`
                      : dream.raw_text}
                  </Link>
                )}

                {dream.motifs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dream.motifs.map((motif) => (
                      <button
                        key={motif}
                        onClick={() => setQuery(motif)}
                        className="rounded-full border border-gold/25 px-3 py-1 text-xs text-gold"
                      >
                        #{motif}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditing(null)}
                        aria-label="取消"
                        className="text-muted"
                      >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => save(dream.id)}
                        aria-label="保存"
                        className="text-gold"
                      >
                        <Check className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    </>
                  ) : (
                    <>
                      {!dream.is_night_mode && (
                        <button
                          onClick={() => reanalyze(dream.id)}
                          disabled={reanalyzing === dream.id}
                          aria-label={"\u91cd\u65b0\u5206\u6790 AI \u6807\u7b7e"}
                          title={"\u4f1a\u4f7f\u7528\u4e00\u6b21 AI \u989d\u5ea6"}
                          className="text-muted disabled:opacity-40"
                        >
                          <RefreshCw
                            className={"h-5 w-5 " + (reanalyzing === dream.id ? "animate-spin" : "")}
                            strokeWidth={1.5}
                          />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditing(dream.id);
                          setDraft(dream.raw_text);
                          setMessage(null);
                        }}
                        aria-label="编辑"
                        className="text-muted"
                      >
                        <Pencil className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => remove(dream.id)}
                        aria-label="删除"
                        className="text-muted"
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <BottomNav />
    </main>
  );
}

