# 拾梦 Gleam

拾梦是一个 AI 梦境记录与共鸣社区。用户可以记录梦境、提取意象、寻找相似梦境、投放到匿名广场，并在双方同意后开启 48 小时匿名对话。

## 已有功能

- 文字和语音记录梦境
- DeepSeek 意象提取与文化视角解读
- BGE-M3 向量匹配与强弱共鸣分层
- 梦境广场、点赞、评论、“我也是”
- 48 小时匿名对话、关闭与举报
- 梦境星图与图片分享
- 匿名账号、用户名账号和邮箱账号
- 我的梦境列表、编辑与单条删除
- 完整数据导出与账号删除
- Web Push 共鸣通知

## 本地运行

要求 Node.js 20 或更高版本。

```bash
npm ci
copy env.example .env.local
npm run dev
```

然后打开 <http://localhost:3000>。

## 必需配置

复制 `env.example` 为 `.env.local`，填入 Supabase、DeepSeek 和 SiliconFlow 配置。Supabase 必须开启匿名登录，否则未注册用户无法安全保存私人数据。

数据库需要包含项目代码使用的表、存储桶和 SQL 函数，包括：

- `dreams`、`motifs`、`dream_motifs`
- `profiles`、`stories`、`echoes`、`echo_words`
- `dream_likes`、`resonances_iamtoo`
- `notifications`、`push_subscriptions`
- `conversations`、`conversation_messages`、`reports`
- `device_registrations`
- `match_candidates`、`match_dreams`
- `consume_llm_budget`、`increment_motif_count`
- 公共存储桶 `avatars`

注意：当前仓库还没有包含现有线上数据库的完整迁移文件。部署新环境前，需要先从 Supabase 导出结构并纳入迁移。

## 检查命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

也可以一次运行：

```bash
npm run check
```

## 安全约定

- 私人 API 必须通过 Supabase access token 获取当前用户，不能相信浏览器传来的 `userId`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能出现在服务端环境变量中。
- `CRON_SECRET` 缺失时，夜间定时任务会拒绝运行。
- 头像只接受 JPG、PNG 和 WebP，最大 2MB。
