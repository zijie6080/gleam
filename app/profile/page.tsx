"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Download,
  HeartHandshake,
  LogIn,
  LogOut,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PushToggle from "@/components/PushToggle";
import { authFetch, ensureSession } from "@/lib/apiClient";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const heatClasses = [
  "bg-glass",
  "bg-gold-deep/40",
  "bg-gold-deep",
  "bg-gold",
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ dreamCount: 0, iamtooCount: 0 });
  const [days, setDays] = useState<number[]>(Array(35).fill(0));
  const [nickname, setNickname] = useState("梦游者");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"user" | "email">("user");
  const [authEmail, setAuthEmail] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadPrivateData() {
    const [statsResponse, profileResponse] = await Promise.all([
      authFetch("/api/stats"),
      authFetch("/api/profile"),
    ]);
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      setStats({
        dreamCount: data.dreamCount ?? 0,
        iamtooCount: data.iamtooCount ?? 0,
      });
      if (Array.isArray(data.days)) setDays(data.days);
    }
    if (profileResponse.ok) {
      const data = await profileResponse.json();
      setNickname(data.nickname ?? "梦游者");
      setAvatarUrl(data.avatarUrl ?? null);
    }
  }

  useEffect(() => {
    loadPrivateData();
    const sb = supabaseBrowser();
    sb?.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user || user.is_anonymous) return;
      const username = user.user_metadata?.username as string | undefined;
      const email = user.email?.endsWith("@users.gleam.internal")
        ? null
        : user.email;
      setAccountLabel(username ?? email ?? null);
    });
    const listener = sb?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        setAuthOpen(true);
        setAuthMode("email");
      }
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);

  async function saveProfile(form: FormData) {
    const response = await authFetch("/api/profile", {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAuthMsg(data.error ?? "保存失败");
      return;
    }
    setNickname(data.nickname);
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
    setAuthMsg(null);
  }

  async function saveName() {
    const form = new FormData();
    form.append("nickname", nameInput);
    await saveProfile(form);
    setEditingName(false);
  }

  async function onAvatarPick(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    await saveProfile(form);
  }

  async function finishLogin(
    session: { user: { id: string }; access_token: string },
    sourceToken?: string,
  ) {
    if (sourceToken) {
      await fetch("/api/account/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sourceToken }),
      }).catch(() => {});
    }
    localStorage.setItem("gleam_anon_id", session.user.id);
    window.location.reload();
  }

  async function usernameAuth(kind: "in" | "up") {
    const sb = supabaseBrowser();
    if (!sb || authBusy) return;
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      const sourceSession = await ensureSession();
      if (kind === "up") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: authUser.trim(),
            password: authPass,
            deviceId: sourceSession?.user.id,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          setAuthMsg(data.error ?? "注册失败");
          return;
        }
      }

      const { usernameToEmail, USERNAME_RE } = await import("@/lib/account");
      if (!USERNAME_RE.test(authUser.trim())) {
        setAuthMsg("用户名需为 3–16 位字母、数字或下划线");
        return;
      }
      const { data, error } = await sb.auth.signInWithPassword({
        email: usernameToEmail(authUser.trim()),
        password: authPass,
      });
      if (error || !data.session) {
        setAuthMsg(kind === "in" ? "用户名或密码不对" : "登录失败");
        return;
      }
      await finishLogin(data.session, sourceSession?.access_token);
    } finally {
      setAuthBusy(false);
    }
  }

  async function emailAuth(kind: "in" | "up") {
    const sb = supabaseBrowser();
    if (!sb || authBusy) return;
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      const sourceSession = await ensureSession();
      const result =
        kind === "in"
          ? await sb.auth.signInWithPassword({
              email: authEmail,
              password: authPass,
            })
          : await sb.auth.signUp({
              email: authEmail,
              password: authPass,
            });
      if (result.error) {
        setAuthMsg(result.error.message);
        return;
      }
      if (!result.data.session) {
        setAuthMsg("注册成功，请去邮箱点击确认链接。");
        return;
      }
      await finishLogin(result.data.session, sourceSession?.access_token);
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendResetEmail() {
    const sb = supabaseBrowser();
    if (!sb || !authEmail) {
      setAuthMsg("请先填写邮箱");
      return;
    }
    const { error } = await sb.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${window.location.origin}/profile`,
    });
    setAuthMsg(error ? error.message : "重设密码邮件已经发出，请检查邮箱。");
  }

  async function updatePassword() {
    const sb = supabaseBrowser();
    if (!sb || authPass.length < 6) {
      setAuthMsg("新密码至少 6 位");
      return;
    }
    const { error } = await sb.auth.updateUser({ password: authPass });
    if (error) {
      setAuthMsg(error.message);
      return;
    }
    setRecovery(false);
    setAuthMsg("密码已经更新。");
  }

  async function signOut() {
    await supabaseBrowser()?.auth.signOut();
    localStorage.removeItem("gleam_anon_id");
    window.location.reload();
  }

  async function exportData() {
    const response = await authFetch("/api/export");
    if (!response.ok) {
      setAuthMsg((await response.json()).error ?? "导出失败");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gleam-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!window.confirm("确定彻底删除账号和全部数据吗？此操作无法恢复。")) return;
    setDeleting(true);
    const response = await authFetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      setAuthMsg((await response.json()).error ?? "删除失败");
      setDeleting(false);
      return;
    }
    localStorage.clear();
    router.push("/capture");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-6 pb-32 pt-14">
      <header className="flex items-center gap-5">
        <button
          onClick={() => fileRef.current?.click()}
          className="glass flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden !rounded-full"
          aria-label="更换头像"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-muted" strokeWidth={1.5} />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => onAvatarPick(event.target.files?.[0])}
        />
        <div className="min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value.slice(0, 12))}
                className="w-36 border-b border-gold bg-transparent font-serif text-2xl text-ink outline-none"
                autoFocus
              />
              <button onClick={saveName} aria-label="保存昵称">
                <Check className="h-5 w-5 text-gold" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setNameInput(nickname);
                setEditingName(true);
              }}
              className="flex items-center gap-2"
            >
              <span className="font-serif text-3xl text-ink">{nickname}</span>
              <Pencil className="h-4 w-4 text-muted" />
            </button>
          )}
          <p className="mt-1 truncate text-sm text-muted">
            {accountLabel ?? "匿名账号"}
          </p>
        </div>
      </header>

      <section>
        {accountLabel ? (
          <button onClick={signOut} className="glass flex w-full items-center gap-3 p-5 text-sm text-muted">
            <LogOut className="h-5 w-5" />退出登录
          </button>
        ) : !authOpen ? (
          <button onClick={() => setAuthOpen(true)} className="glass flex w-full items-center gap-3 p-5 text-sm text-ink">
            <LogIn className="h-5 w-5 text-gold" />注册或登录，换设备也能找回梦境
          </button>
        ) : (
          <div className="glass space-y-3 p-5">
            <div className="flex gap-4 text-sm">
              <button onClick={() => setAuthMode("user")} className={authMode === "user" ? "text-gold" : "text-muted"}>账号密码</button>
              <button onClick={() => setAuthMode("email")} className={authMode === "email" ? "text-gold" : "text-muted"}>邮箱</button>
            </div>
            {authMode === "user" ? (
              <input value={authUser} onChange={(event) => setAuthUser(event.target.value)} placeholder="用户名" className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none" />
            ) : (
              <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="邮箱" className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none" />
            )}
            <input type="password" value={authPass} onChange={(event) => setAuthPass(event.target.value)} placeholder={recovery ? "输入新密码" : "密码（至少 6 位）"} className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none" />
            {authMsg && <p className="text-xs text-gold-deep">{authMsg}</p>}
            {recovery ? (
              <button onClick={updatePassword} className="glass w-full py-2.5 text-sm text-gold">保存新密码</button>
            ) : (
              <>
                <div className="flex gap-3">
                  <button onClick={() => authMode === "user" ? usernameAuth("in") : emailAuth("in")} disabled={authBusy} className="glass flex-1 py-2.5 text-sm text-gold">登录</button>
                  <button onClick={() => authMode === "user" ? usernameAuth("up") : emailAuth("up")} disabled={authBusy} className="glass flex-1 py-2.5 text-sm text-ink">注册</button>
                </div>
                {authMode === "email" && (
                  <button onClick={sendResetEmail} className="text-xs text-muted">忘记密码？发送重设邮件</button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <Link href="/dreams" className="glass flex items-center gap-3 p-5 text-sm text-ink">
        <BookOpen className="h-5 w-5 text-gold" />查看和管理我的梦境
      </Link>

      <section className="grid grid-cols-2 gap-4">
        <div className="glass p-6">
          <p className="font-serif text-4xl text-gold">{stats.dreamCount}</p>
          <p className="mt-2 text-sm text-muted">累计记录的梦</p>
        </div>
        <div className="glass p-6">
          <p className="flex items-center gap-2 font-serif text-4xl text-gold">
            {stats.iamtooCount}<HeartHandshake className="h-5 w-5" />
          </p>
          <p className="mt-2 text-sm text-muted">收到的共鸣</p>
        </div>
      </section>

      <section className="glass space-y-5 p-6">
        <h2 className="font-serif text-xl text-ink">近 35 天</h2>
        <div className="grid grid-cols-7 gap-2">
          {days.map((level, index) => (
            <span key={index} className={`aspect-square rounded-md ${heatClasses[Math.min(level, 3)]}`} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <PushToggle />
        <button onClick={exportData} className="glass flex w-full items-center gap-3 p-5 text-sm text-ink">
          <Download className="h-5 w-5 text-gold" />导出全部数据
        </button>
        <button onClick={deleteAccount} disabled={deleting} className="glass flex w-full items-center gap-3 p-5 text-sm text-muted disabled:opacity-40">
          <Trash2 className="h-5 w-5" />{deleting ? "正在删除…" : "彻底删除账号及所有数据"}
        </button>
      </section>

      <BottomNav />
    </main>
  );
}
