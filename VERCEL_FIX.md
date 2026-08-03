# Vercel 部署失败修复说明

## 问题诊断

您的 Vercel 部署失败显示两个关键错误：

### 1. P3017 错误（Prisma 迁移失败）
```
Error: P3017 - The migration failed to apply
外键约束 image.data / image.size toString / image.mimeType
```

**根本原因**：
- 原配置使用 `prisma db push` 推送数据库结构
- 当数据库已有数据时，`db push` 会因外键约束冲突而失败
- `Image.data` 字段未明确指定 PostgreSQL 类型（`Bytes` → `bytea`）

### 2. 构建缓存冲突
```
"外部数据" "D:\workbuddy_cache_temp"
```

**根本原因**：
- 通过 Vercel CLI 从本地 Windows 部署时，本地缓存目录 `D:\workbuddy_cache_temp` 被上传
- 该路径在 Vercel Linux 环境中不存在，导致构建失败

---

## 已应用的修复

| 文件 | 修改 |
|------|------|
| `vercel.json` | `prisma db push` → `prisma migrate deploy`；`npm install` → `npm install --legacy-peer-deps` |
| `package.json` | 同步 build 脚本为 `prisma migrate deploy` |
| `prisma/schema.prisma` | `Image.data` 添加 `@db.ByteA`；`mimeType`/`type`/`size` 添加默认值 |
| `prisma/migrations/20260101000000_init/migration.sql` | **新增**，显式定义表创建顺序（Image 先于 SettingImage） |
| `prisma/migrations/migration_lock.toml` | **新增**，锁定 PostgreSQL 提供商 |
| `.gitignore` | 移除 `/prisma/migrations/` 忽略，迁移文件纳入版本控制 |
| `DEPLOYMENT.md` | 新增「七、常见部署问题与解决方案」故障排查章节 |
| `CHANGELOG.md` | 新增「零、部署修复」章节 |

---

## 重新部署步骤

### 方案 A：通过 GitHub 重新部署（推荐）

```bash
# 1. 重新初始化仓库并提交
cd pintree-deploy
git add -A
git commit -m "fix: Vercel deployment P3017 + build cache"
git push origin main --force
```

然后在 Vercel 控制台：
1. 进入项目 → Deployments → 点击最新部署旁的 "..." → "Redeploy"
2. **重要**：勾选 "Clear Build Cache" 选项
3. 等待部署完成

### 方案 B：从本地通过 Vercel CLI 部署

```powershell
# 1. 先清理本地 Vercel 缓存
Remove-Item -Recurse -Force .vercel
Remove-Item -Recurse -Force node_modules\.cache

# 2. 强制重新部署
vercel --force
```

---

## 验证修复成功

部署成功后，Vercel 构建日志应显示：
```
> prisma generate
> prisma migrate deploy
   1 migration found in prisma/migrations
   Applying migration `20260101000000_init`
   All migrations have been successfully applied.

> next build
   ✓ Compiled successfully
```

---

## 数据库重置（紧急情况）

如 P3017 错误仍然出现（数据库已有冲突数据），可在远程数据库执行：

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
```

然后重新部署。**注意：会清空所有数据，仅用于首次部署故障排除**。
