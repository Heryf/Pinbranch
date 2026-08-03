# Pintree 部署指南

## 一、项目概述

Pintree 是一个基于 Next.js 14 的书签管理系统，支持多合集管理、文件夹层级、书签导入/导出、暗黑模式等功能。本文档包含完整的部署指南和修改记录。

---

## 二、部署前配置事项

### 2.1 环境变量

在 Vercel 项目设置中配置以下环境变量（参考 `.env.example`）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 | `postgresql://user:pass@host:5432/dbname` |
| `NEXTAUTH_SECRET` | NextAuth 认证密钥 | `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | 应用 URL | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | 公开应用 URL | `https://your-app.vercel.app` |
| `ADMIN_EMAIL` | 管理员邮箱 | `admin@example.com` |
| `ADMIN_PASSWORD` | 管理员密码 | `your-secure-password` |

### 2.2 数据库准备

本项目使用 PostgreSQL 数据库。推荐以下方案：

1. **Neon**（推荐，免费）：https://neon.tech
2. **Supabase**：https://supabase.com
3. **Vercel Postgres**：https://vercel.com/docs/storage

创建数据库后，将连接字符串填入 `DATABASE_URL` 环境变量。

### 2.3 依赖安装

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 推送数据库结构
npx prisma db push
```

---

## 三、Vercel 部署步骤

### 3.1 GitHub 上传

1. 在 GitHub 创建新仓库（如 `pintree`）
2. 将 `pintree-deploy` 目录下所有文件上传至仓库：
   ```bash
   cd pintree-deploy
   git init
   git add .
   git commit -m "Initial commit: Pintree with UI optimizations"
   git branch -M main
   git remote add origin https://github.com/your-username/pintree.git
   git push -u origin main
   ```

### 3.2 Vercel 部署

1. 访问 https://vercel.com 并登录
2. 点击 "New Project" → 选择你的 GitHub 仓库
3. 配置环境变量（见 2.1 节）
4. 点击 "Deploy"

Vercel 会自动执行 `vercel.json` 中的构建命令：
```
prisma generate && prisma db push && next build
```

### 3.3 构建配置说明

`vercel.json` 已配置：
- **构建命令**：`prisma generate && prisma db push && next build`
- **安装命令**：`npm install`
- **框架**：Next.js
- **API 超时**：30 秒（适用于书签导入等耗时操作）

### 3.4 部署后验证

1. 访问部署 URL，确认首页正常加载
2. 使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录后台 `/admin`
3. 在后台创建合集和文件夹，添加书签
4. 测试暗黑/浅色模式切换
5. 测试文件夹逐层浏览功能

---

## 四、技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.15 | 全栈框架 |
| React | 18.2.0 | UI 库 |
| Prisma | 5.21.1 | ORM |
| PostgreSQL | 12+ | 数据库 |
| Tailwind CSS | 3.4.1 | 样式框架 |
| shadcn/ui | - | UI 组件库 |
| NextAuth.js | 4.24.10 | 认证 |
| TypeScript | 5.6.3 | 类型系统 |

---

## 五、本地开发

```bash
# 1. 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际值

# 2. 安装依赖
npm install

# 3. 生成 Prisma Client
npx prisma generate

# 4. 推送数据库结构
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

---

## 六、注意事项

1. **数据库迁移**：首次部署时 `prisma migrate deploy` 会自动应用迁移文件创建所有表结构
2. **管理员账号**：首次运行时自动创建，邮箱和密码来自环境变量
3. **图片存储**：图片以二进制形式存储在数据库中（Image 模型），无需额外配置文件存储
4. **构建超时**：如遇到 Vercel 构建超时，可尝试在 `vercel.json` 中调整 `maxDuration`
5. **域名配置**：部署后更新 `NEXTAUTH_URL` 和 `NEXT_PUBLIC_APP_URL` 为实际域名

---

## 七、常见部署问题与解决方案

### 7.1 P3017 错误：Prisma 迁移失败

**错误现象**：
```
Error: P3017
The migration failed to apply
```

**原因**：
- `prisma db push` 试图修改已有数据的表结构，PostgreSQL 因外键约束拒绝
- 之前的部署残留了部分表结构

**解决方案**：
本项目已使用 **`prisma migrate deploy`** 替代 `prisma db push`，迁移文件 `prisma/migrations/20260101000000_init/migration.sql` 显式声明了表创建顺序（Image 表先于 SettingImage 表创建），可避免外键约束冲突。

如仍遇到 P3017，可登录数据库执行 `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` 清空数据库后重新部署（**注意：会清空所有数据**）。

### 7.2 构建缓存冲突（本地 Windows 路径）

**错误现象**：
```
"外部数据" "D:\workbuddy_cache_temp"
```

**原因**：通过本地 Vercel CLI 部署时，本地 Windows 缓存目录被上传到 Vercel Linux 环境，导致路径冲突。

**解决方案**：
1. **推荐：通过 GitHub 部署**，Vercel 缓存由服务器统一管理
2. 如使用 CLI 部署，先清理本地缓存：
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force .vercel
   # 然后强制部署
   vercel --force
   ```

### 7.3 PostgreSQL 数据库连接失败

**检查清单**：
1. Vercel 环境变量 `DATABASE_URL` 是否正确配置（不要使用 `localhost`，需使用远程 PostgreSQL）
2. 数据库服务是否允许来自 Vercel 的连接（多数 PaaS 数据库需开启 "允许所有 IP 连接"）
3. 连接字符串格式：`postgresql://user:password@host:5432/dbname?sslmode=require`（SSL 必需）
4. 推荐使用 **Neon**（https://neon.tech），免费且与 Vercel 集成良好

### 7.4 Image.data 字段类型问题

**说明**：`Image.data` 字段已使用 `@db.ByteA` 显式指定 PostgreSQL bytea 类型，确保与 PostgreSQL 兼容。如遇到二进制数据相关错误，请检查：
1. PostgreSQL 版本 ≥ 12
2. 不要上传超过 50MB 的单张图片（Vercel API 请求体限制 4.5MB，建议使用外部图床）

### 7.6 P3009 错误：迁移状态脏数据（最常见！）

**错误现象**：
```
Error: P3009
migrate found failed migrations in the target database
Database "db", PostgreSQL at "neondb", schema "public"
1 migration found in prisma/migrations
```

**原因**：
- 之前失败的 `prisma db push` 已在远程数据库 `_prisma_migrations` 表中留下了失败记录
- Prisma 检测到迁移状态不一致，拒绝继续部署

**解决方案**（已内置在 `scripts/vercel-build.sh` 中）：

本项目已使用智能构建脚本，会自动处理以下 fallback 流程：
1. 先尝试 `prisma migrate deploy`
2. 如果失败，尝试 `prisma migrate resolve --applied 20260101000000_init` 标记迁移为已应用
3. 如果仍失败，使用 `prisma db push --accept-data-loss --skip-generate` 强制同步 schema

**手动修复（如需重置数据库）**：

⚠️ **警告：以下操作会清空所有数据，仅在首次部署时使用！**

1. 登录你的 PostgreSQL 数据库（如 Neon 控制台）
2. 执行 SQL 命令：
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO PUBLIC;
   ```
3. 在 Vercel 控制台 → Settings → General → 点击 **Clear Build Cache**
4. 重新部署

**预防措施**：
- 首次部署前确保数据库为空（无表、无 schema）
- 不要混用 `db push` 和 `migrate deploy` — 一旦使用 `db push` 创建了表，后续再用 `migrate deploy` 就会冲突
- 本项目从第一次部署起就使用 `migrate deploy`，避免混用
