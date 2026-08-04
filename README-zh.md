# Pinbranch

<div align="center">

**版本 1.0.0**

[English](./README.md) | [简体中文](./README-zh.md)

<h3>Pinbranch - 将您的浏览器书签转换为导航网站</h3>
<p>基于 Pintree 二次开发，提供文件资源管理器式逐层浏览体验。</p>

</div>

---

## 来源与许可证

> **本项目（Pinbranch）是基于 [Pintree](https://github.com/Pintree-io/pintree) 项目的二次开发。**

| 项目 | 详情 |
|------|------|
| **原始项目** | [Pintree](https://github.com/Pintree-io/pintree) |
| **原作者** | Pintree.io |
| **原始许可证** | MIT License |
| **原始版权** | Copyright (c) 2024 Pintree.io |
| **本项目许可证** | MIT License（继承自原项目） |
| **署名声明** | 见 [NOTICE.md](./NOTICE.md) |

原始 Pintree 项目采用 MIT 许可证，允许修改和再分发。Pinbranch 遵守 MIT 许可证的所有条款，
包括在 [LICENSE](./LICENSE) 文件中保留原始版权声明。

---

## 主要修改说明

Pinbranch 在原版 Pintree 基础上进行了以下改进：

### 文件资源管理器式浏览
- 左侧侧边栏：合集列表 + 可展开/折叠的文件夹树
- 右侧主区域：子文件夹卡片置顶 + 书签列表在下
- 面包屑导航支持快速返回上级

### 精致视觉设计
- 重新设计文件夹卡片，渐变色 + hover 纸张展开动画
- 增强书签卡片 hover 交互（上浮、阴影、图标缩放）
- 深灰蓝暗黑模式（#1a2332），更柔和护眼

### 统一主题系统
- 全站硬编码颜色替换为 CSS 变量
- 前台和后台管理页面暗黑/浅色模式自动适配

### 性能与体验
- API 优化为仅返回当前层级数据
- React.memo 防止不必要的重渲染
- 延迟 loading 状态消除切换闪烁
- 修复 SVG 渐变 id 冲突导致的 hover 联动 Bug

### 部署就绪
- 新增 Prisma 迁移文件，确保 Vercel 可靠部署
- 智能构建脚本，自动恢复迁移失败状态

> 完整修改文件清单见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 功能

### 基础版（免费）
- 无限导入/导出书签
- 书签管理（拖拽排序）
- 文件资源管理器式逐层浏览
- 基本主题定制（浅色/暗黑模式）
- 书签搜索
- 多合集切换

### 后台管理
- 合集管理
- 书签管理（数据表格）
- SEO 设置
- 基本设置（网站名称、Logo、页脚、社交媒体）
- 图片管理

---

## 技术栈

- **前后端**: Next.js 14
- **数据库**: PostgreSQL（推荐 [Neon](https://neon.tech)）
- **ORM**: Prisma
- **部署**: Vercel
- **样式**: Tailwind CSS + shadcn/ui

---

## 快速开始

### 前置条件

- Node.js 18+
- PostgreSQL 数据库
- Vercel 账号（用于部署）

### 本地开发

```bash
# 1. 安装依赖
npm install --legacy-peer-deps

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入数据库连接和密钥

# 3. 生成 Prisma Client
npx prisma generate

# 4. 推送数据库结构
npx prisma db push

# 5. 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 部署到 Vercel

1. 将本项目推送到 GitHub 仓库
2. 在 Vercel 中导入该仓库
3. 配置环境变量（见 `.env.example`）
4. 部署

> 详细部署说明见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

---

## 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 是 |
| `NEXTAUTH_SECRET` | NextAuth.js 认证密钥 | 是 |
| `NEXTAUTH_URL` | 应用 URL | 是 |
| `NEXT_PUBLIC_APP_URL` | 公开应用 URL | 是 |
| `ADMIN_EMAIL` | 管理员邮箱 | 是 |
| `ADMIN_PASSWORD` | 管理员密码 | 是 |

---

## 致谢

- **[Pintree](https://github.com/Pintree-io/pintree)** - Pinbranch 所基于的原始项目
- 所有使本项目成为可能的开源依赖

---

## 许可证

本项目采用 **MIT 许可证** - 详见 [LICENSE](./LICENSE) 文件。

```
MIT License

Copyright (c) 2024 Pintree.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 免责声明

Pinbranch 是基于 Pintree 的独立二次开发作品。原始 Pintree 项目及其作者不对本衍生项目中的
任何修改负责。本软件按"原样"提供，不附带任何形式的保证。
