// 用户名账号体系：Supabase Auth 只认邮箱/手机号，
// 所以用户名在内部映射成一个合成邮箱（用户不可见，不用于收信）。
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/;

export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@users.gleam.internal`;
}
