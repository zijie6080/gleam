"use client";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

let sessionPromise: ReturnType<typeof createSession> | null = null;

async function createSession() {
  const sb = supabaseBrowser();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;

  const { data: anonymous, error } = await sb.auth.signInAnonymously();
  if (error) return null;
  return anonymous.session;
}

export async function ensureSession() {
  if (!sessionPromise) {
    sessionPromise = createSession().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const session = await ensureSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
