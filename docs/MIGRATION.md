# 数据库迁移指南

## 为什么 Vercel 构建不跑迁移

Vercel Hobby 构建机（iad1 美东）→ Neon pooler（us-east-2 俄亥俄）之间网络策略不通，
`prisma migrate deploy` / `db push` 会 P1001 失败（见 Vercel 构建日志）。

构建脚本 `scripts/vercel-build.sh` 已简化为只做 `prisma generate + next build`，
**不触碰数据库**。迁移改为本地手动执行。

## 一次性配置（首次部署）

```bash
# 1. 确认 .env.local 中 DATABASE_URL 指向 Neon
cat .env.local | grep DATABASE_URL

# 2. 把本地变量复制为 .env（Prisma CLI 默认读 .env，不读 .env.local）
cp .env.local .env

# 3. 应用初始迁移到 Neon
npx prisma migrate deploy
# 或（如不需要迁移历史，直接同步 schema）：
# npx prisma db push --accept-data-loss
```

成功后输出类似：
```
1 migration found in prisma/migrations
20260101000000_init/migration.sql
All migrations have been successfully applied.
```

## schema 变更后（每次新增迁移）

```bash
# 1. 本地修改 prisma/schema.prisma

# 2. 生成新迁移文件
npx prisma migrate dev --name <变更描述>

# 3. 应用到 Neon
npx prisma migrate deploy

# 4. git commit + push → Vercel 自动重新部署（仅 build，不再触发迁移）
git add prisma/
git commit -m "feat(db): <变更描述>"
git push origin main
```

## Vercel 端环境变量

`DATABASE_URL` 必须在 Vercel → Project → Settings → Environment Variables 中配置，
runtime 才会用得到（API 路由需要查库）。构建阶段不需要，构建时无 DB 调用。

## 故障排查

| 症状 | 原因 | 解决 |
|------|------|------|
| 本地 `migrate deploy` 也 P1001 | Neon 已暂停（free tier 5 分钟 idle） | Neon 控制台 Resume，或访问一次前端触发唤醒 |
| 构建日志 `prisma generate` 失败 | `prisma/schema.prisma` 语法错误 | 本地跑 `npx prisma validate` 修正 |
| 部署成功但 API 500 | Vercel runtime 拿不到 `DATABASE_URL` | 检查 Vercel 环境变量配置（不是 .env.local） |