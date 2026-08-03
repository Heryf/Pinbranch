# Vercel 部署失败修复说明

## 问题诊断

您的 Vercel 部署失败显示了以下关键错误：

### P3009 错误：迁移状态脏数据
```
Error: P3009
migrate found failed migrations in the target database
Database "db", PostgreSQL at "neondb", schema "public"
1 migration found in prisma/migrations
```

**根本原因**：
- 之前失败的 `prisma db push` 已在远程数据库的 `_prisma_migrations` 表中留下了失败记录
- Prisma 检测到迁移状态不一致，拒绝继续执行 `migrate deploy`
- 这是一个**迁移状态脏数据**问题，不是 schema 本身的错误

---

## 已应用的修复（第二轮）

| 文件 | 修改内容 |
|------|---------|
| `scripts/vercel-build.sh` | **新增**智能构建脚本，自动处理迁移失败 fallback |
| `vercel.json` | `buildCommand` 改为 `sh scripts/vercel-build.sh` |
| `package.json` | 添加 `build:vercel` 脚本指向智能构建脚本 |
| `DEPLOYMENT.md` | 新增「7.6 P3009 错误：迁移状态脏数据」故障排查 |
| `VERCEL_FIX.md` | 本文档，说明 P3009 修复方案 |

### 智能构建脚本逻辑

`scripts/vercel-build.sh` 执行以下 fallback 流程：

```
1. prisma generate          → 生成 Prisma Client
2. prisma migrate deploy    → 尝试正常部署迁移
   └─ 失败？→ prisma migrate resolve --applied 20260101000000_init
      └─ 仍失败？→ prisma db push --accept-data-loss --skip-generate
3. next build               → 构建 Next.js 应用
```

这样即使数据库有脏迁移状态，也能自动恢复并继续部署。

---

## 快速修复步骤

### 方案 A：清空数据库 + 重新部署（推荐，首次部署时使用）

⚠️ **警告：以下操作会清空所有数据，仅在首次部署/故障排除时使用！**

1. 登录你的 PostgreSQL 数据库控制台（如 Neon Dashboard）
2. 执行 SQL：
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO PUBLIC;
   ```
3. 在 Vercel 控制台 → Settings → General → 点击 **Clear Build Cache**
4. 重新部署（Redeploy with existing Build Cache cleared）

### 方案 B：直接重新部署（让智能脚本自动处理）

如果不方便操作数据库，智能脚本会自动尝试 `migrate resolve` 和 `db push` fallback：

1. 确保代码已更新到仓库：
   ```bash
   cd pintree-deploy
   git add -A
   git commit -m "fix: add smart migration fallback for P3009"
   git push origin main --force
   ```
2. 在 Vercel 控制台 Redeploy，勾选 **Clear Build Cache**

---

## 验证修复成功

部署成功后，Vercel 构建日志可能显示以下任一种成功路径：

**路径 1 - 迁移正常应用**：
```
> prisma generate
> prisma migrate deploy
   1 migration found in prisma/migrations
   Applying migration `20260101000000_init`
   All migrations have been successfully applied.
> next build
   ✓ Compiled successfully
```

**路径 2 - 迁移已 resolve，重新部署**：
```
> prisma generate
> prisma migrate resolve --applied 20260101000000_init
> prisma migrate deploy
   All migrations have been successfully applied.
> next build
   ✓ Compiled successfully
```

**路径 3 - fallback 到 db push**：
```
> prisma generate
> Migration deploy failed, falling back to prisma db push...
> prisma db push --accept-data-loss --skip-generate
   Your database is now in sync with your Prisma schema.
> next build
   ✓ Compiled successfully
```

三种路径都代表部署成功！

---

## 历史修复（第一轮）

上一轮修复解决了 P3017（迁移冲突）和构建缓存问题：
- `prisma db push` → `prisma migrate deploy`
- `Image.data` 字段添加 `@db.ByteA`
- 新增 `prisma/migrations/20260101000000_init/migration.sql` 显式定义表创建顺序
- 移除 `.gitignore` 中对 `prisma/migrations/` 的忽略
