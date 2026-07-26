"use client";

import { useEffect } from "react";
import { ensureSession } from "@/lib/apiClient";

// 建立匿名或正式 Supabase Auth 会话，并自动给本站 API 请求附上 access token。
export default function AuthBootstrap() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(rawUrl, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
        return originalFetch(input, init);
      }

      const session = await ensureSession();
      const headers = new Headers(init.headers);
      if (session?.access_token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
      return originalFetch(input, { ...init, headers });
    };

    ensureSession().then((session) => {
      if (session) localStorage.setItem("gleam_anon_id", session.user.id);
    });

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
