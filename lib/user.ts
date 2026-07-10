"use client";

// 匿名设备 ID：全站唯一的"身份"。只存本地，用于防重复操作，
// 服务端存储但任何 API 永不返回它（v2 §7.3）。
export function anonUserId(): string {
  const KEY = "gleam_anon_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
