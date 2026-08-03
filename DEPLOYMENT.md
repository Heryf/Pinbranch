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

1. **数据库迁移**：首次部署时 `prisma db push` 会自动创建所有表结构
2. **管理员账号**：首次运行时自动创建，邮箱和密码来自环境变量
3. **图片存储**：图片以二进制形式存储在数据库中（Image 模型），无需额外配置文件存储
4. **构建超时**：如遇到 Vercel 构建超时，可尝试在 `vercel.json` 中调整 `maxDuration`
5. **域名配置**：部署后更新 `NEXTAUTH_URL` 和 `NEXT_PUBLIC_APP_URL` 为实际域名
