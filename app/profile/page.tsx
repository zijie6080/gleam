"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
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
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const heatClasses = [
  "bg-glass",
  "bg-gold-deep/40",
  "bg-gold-deep",
  "bg-gold",
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ dreamCount: 0, iamtooCount: 0 });
  const [days, setDays] = useState<number[]>(Array(35).fill(0));
  const [deleting, setDeleting] = useState(false);

  // 资料
  const [nickname, setNickname] = useState("梦游者");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 账号
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"user" | "email">("user");
  const [authEmail, setAuthEmail] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    const uid = anonUserId();
    fetch(`/api/stats?userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        setStats({
          dreamCount: d.dreamCount ?? 0,
          iamtooCount: d.iamtooCount ?? 0,
        });
        if (Array.isArray(d.days)) setDays(d.days);
      })
      .catch(() => {});
    fetch(`/api/profile?userId=${uid}`)
      .then((r) => r.json())
      .then((d) => {
        setNickname(d.nickname ?? "梦游者");
        setAvatarUrl(d.avatarUrl ?? null);
      })
      .catch(() => {});
    supabaseBrowser()
      ?.auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        if (!u) return;
        const username = u.user_metadata?.username as string | undefined;
        const email = u.email?.endsWith("@users.gleam.internal")
          ? null
          : u.email;
        setAccountLabel(username ?? email ?? null);
      });
  }, []);

  async function saveProfile(form: FormData) {
    form.append("userId", anonUserId());
    const res = await fetch("/api/profile", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setProfileMsg(data.error);
      return;
    }
    setProfileMsg(null);
    setNickname(data.nickname);
    if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
  }

  async function saveName() {
    const form = new FormData();
    form.append("nickname", nameInput);
    await saveProfile(form);
    setEditingName(false);
  }

  async function onAvatarPick(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    await saveProfile(form);
  }

  // 登录成功后的统一收尾：迁移旧匿名数据 → 刷新
  async function afterAuth(session: {
    user: { id: string };
    access_token: string;
  }) {
    const old = localStorage.getItem("gleam_anon_id");
    if (old && old !== session.user.id) {
      await fetch("/api/account/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: old, token: session.access_token }),
      }).catch(() => {});
    }
    localStorage.setItem("gleam_anon_id", session.user.id);
    window.location.reload();
  }

  // 用户名账号：注册走服务端（设备限一账号），登录直接用合成邮箱
  async function userAuth(kind: "in" | "up") {
    const sb = supabaseBrowser();
    if (!sb) return setAuthMsg("登录服务未配置");
    if (authBusy) return;
    setAuthBusy(true);
    setAuthMsg(null);
    try {
      if (kind === "up") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: authUser.trim(),
            password: authPass,
            deviceId: anonUserId(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthMsg(data.error);
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
        setAuthMsg(kind === "in" ? "用户名或密码不对" : error?.message ?? "登录失败");
        return;
      }
      await afterAuth(data.session);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signIn(kind: "in" | "up") {
    const sb = supabaseBrowser();
    if (!sb) {
      setAuthMsg("登录服务未配置");
      return;
    }
    setAuthMsg(null);
    const fn =
      kind === "in"
        ? sb.auth.signInWithPassword({ email: authEmail, password: authPass })
        : sb.auth.signUp({ email: authEmail, password: authPass });
    const { data, error } = await fn;
    if (error) {
      setAuthMsg(error.message);
      return;
    }
    if (!data.session) {
      setAuthMsg("注册成功，请去邮箱点确认链接后再登录。");
      return;
    }
    await afterAuth(data.session);
  }

  async function signOut() {
    await supabaseBrowser()?.auth.signOut();
    localStorage.removeItem("gleam_anon_id");
    window.location.reload();
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "确定要彻底删除吗？所有的梦、意象、回响都会消失，无法恢复。",
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/account?userId=${anonUserId()}`, {
      method: "DELETE",
    }).catch(() => null);
    if (res?.ok) {
      await supabaseBrowser()?.auth.signOut();
      localStorage.removeItem("gleam_anon_id");
      localStorage.removeItem("gleam_draft");
      router.push("/capture");
    } else {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-6 pb-32 pt-14">
      {/* 头像 + 昵称 */}
      <motion.header {...fadeIn} className="flex items-center gap-5">
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="更换头像"
          className="glass flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden !rounded-full transition-opacity duration-fade hover:opacity-70"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: "saturate(0.85)" }}
            />
          ) : (
            <User strokeWidth={1.5} className="h-8 w-8 text-muted" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onAvatarPick(e.target.files?.[0])}
        />
        <div className="min-w-0">
          {editingName ? (
            <span className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value.slice(0, 12))}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                autoFocus
                className="w-36 border-b border-gold-deep bg-transparent font-serif text-2xl text-ink outline-none"
              />
              <button onClick={saveName} aria-label="保存昵称">
                <Check strokeWidth={1.5} className="h-5 w-5 text-gold" />
              </button>
            </span>
          ) : (
            <button
              onClick={() => {
                setNameInput(nickname);
                setEditingName(true);
              }}
              className="flex items-center gap-2 transition-opacity duration-fade hover:opacity-70"
            >
              <span className="font-serif text-3xl text-ink">{nickname}</span>
              <Pencil strokeWidth={1.5} className="h-4 w-4 text-muted" />
            </button>
          )}
          <p className="mt-1 truncate text-sm text-muted">
            {accountLabel ?? "匿名 · 数据只在这台设备"}
          </p>
          {profileMsg && (
            <p className="mt-1 text-xs text-gold-deep">{profileMsg}</p>
          )}
        </div>
      </motion.header>

      {/* 账号 */}
      <motion.section {...fadeIn}>
        {accountLabel ? (
          <button
            onClick={signOut}
            className="glass flex w-full items-center gap-3 p-5 text-sm text-muted transition-opacity duration-fade hover:opacity-70"
          >
            <LogOut strokeWidth={1.5} className="h-5 w-5" />
            退出登录
          </button>
        ) : !authOpen ? (
          <button
            onClick={() => setAuthOpen(true)}
            className="glass flex w-full items-center gap-3 p-5 text-sm text-ink transition-opacity duration-fade hover:opacity-70"
          >
            <LogIn strokeWidth={1.5} className="h-5 w-5 text-gold" />
            注册账号，换设备也能找回你的梦
          </button>
        ) : (
          <div className="glass space-y-3 p-5">
            {/* 账号 / 邮箱 切换 */}
            <div className="flex gap-4 text-sm">
              {(
                [
                  ["user", "账号密码"],
                  ["email", "邮箱"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode);
                    setAuthMsg(null);
                  }}
                  className={
                    authMode === mode
                      ? "border-b border-gold pb-1 text-gold"
                      : "pb-1 text-muted transition-opacity duration-fade hover:opacity-70"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {authMode === "user" ? (
              <>
                <input
                  value={authUser}
                  onChange={(e) => setAuthUser(e.target.value.slice(0, 16))}
                  placeholder="用户名（3–16 位字母数字下划线）"
                  autoCapitalize="none"
                  className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
                />
                <input
                  type="password"
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && userAuth("in")}
                  placeholder="密码（至少 6 位）"
                  className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
                />
                {authMsg && <p className="text-xs text-gold-deep">{authMsg}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => userAuth("in")}
                    disabled={authBusy}
                    className="glass flex-1 !rounded-2xl py-2.5 text-sm text-gold transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
                  >
                    登录
                  </button>
                  <button
                    onClick={() => userAuth("up")}
                    disabled={authBusy}
                    className="glass flex-1 !rounded-2xl py-2.5 text-sm text-ink transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
                  >
                    注册
                  </button>
                </div>
                <p className="text-xs text-muted">一台设备只能注册一个账号</p>
              </>
            ) : (
              <>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="邮箱"
                  className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
                />
                <input
                  type="password"
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  placeholder="密码（至少 6 位）"
                  className="w-full border-b border-glass-border bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted"
                />
                {authMsg && <p className="text-xs text-gold-deep">{authMsg}</p>}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => signIn("in")}
                    className="glass flex-1 !rounded-2xl py-2.5 text-sm text-gold transition-opacity duration-fade hover:opacity-70"
                  >
                    登录
                  </button>
                  <button
                    onClick={() => signIn("up")}
                    className="glass flex-1 !rounded-2xl py-2.5 text-sm text-ink transition-opacity duration-fade hover:opacity-70"
                  >
                    注册
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.section>

      <motion.section {...fadeIn} className="grid grid-cols-2 gap-4">
        <div className="glass p-6">
          <p className="font-serif text-4xl text-gold">{stats.dreamCount}</p>
          <p className="mt-2 text-sm text-muted">累计记录的梦</p>
        </div>
        <div className="glass p-6">
          <p className="flex items-baseline gap-2 font-serif text-4xl text-gold">
            {stats.iamtooCount}
            <HeartHandshake strokeWidth={1.5} className="h-5 w-5 self-center" />
          </p>
          <p className="mt-2 text-sm text-muted">被「我也是」的次数</p>
          <p className="mt-1 text-xs text-gold-deep">仅自己可见</p>
        </div>
      </motion.section>

      <motion.section {...fadeIn} className="glass space-y-5 p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-ink">梦境日历</h2>
          <span className="text-xs text-muted">近 35 天</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((level, i) => (
            <span
              key={i}
              className={`aspect-square rounded-md ${heatClasses[Math.min(level, 3)]}`}
            />
          ))}
        </div>
        <p className="text-xs text-muted">颜色深浅 · 梦境情绪强度</p>
      </motion.section>

      <motion.section {...fadeIn} className="space-y-3">
        <PushToggle />
        <button
          onClick={() =>
            (window.location.href = `/api/export?userId=${anonUserId()}`)
          }
          className="glass flex w-full items-center gap-3 p-5 text-sm text-ink transition-opacity duration-fade hover:opacity-70"
        >
          <Download strokeWidth={1.5} className="h-5 w-5 text-gold" />
          导出全部数据
        </button>
        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="glass flex w-full items-center gap-3 p-5 text-sm text-muted transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
        >
          <Trash2 strokeWidth={1.5} className="h-5 w-5" />
          {deleting ? "正在删除…" : "彻底删除账号及所有数据"}
        </button>
      </motion.section>

      <BottomNav />
    </main>
  );
}
