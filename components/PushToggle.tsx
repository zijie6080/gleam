"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { anonUserId } from "@/lib/user";

function b64ToUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// 睡前提醒开关：订阅 Web Push。推送只发强匹配、每天最多一条、只在晚间发。
export default function PushToggle() {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "denied">(
    "unsupported",
  );

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    )
      return;
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : Notification.permission === "denied" ? "denied" : "off");
    });
  }, []);

  async function toggle() {
    const reg = await navigator.serviceWorker.ready;
    if (state === "on") {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToUint8(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      ),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId(), subscription: sub.toJSON() }),
    }).catch(() => {});
    setState("on");
  }

  if (state === "unsupported") return null;

  return (
    <button
      onClick={toggle}
      disabled={state === "denied"}
      className="glass flex w-full items-center gap-3 p-5 text-sm transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
    >
      <BellRing
        strokeWidth={1.5}
        className={`h-5 w-5 ${state === "on" ? "text-gold" : "text-muted"}`}
      />
      <span className={state === "on" ? "text-ink" : "text-muted"}>
        {state === "on"
          ? "睡前提醒已开启 · 每天最多一条"
          : state === "denied"
            ? "通知权限被拒绝，请在浏览器设置里开启"
            : "开启睡前提醒：有人和你梦见同一件事时告诉你"}
      </span>
    </button>
  );
}
