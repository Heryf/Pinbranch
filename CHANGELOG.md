# Pintree 修改记录

> 本文档记录了从原始项目到当前版本的所有修改内容。

---

## 一、修改文件清单及摘要

### 1.1 API 层修改

#### `src/app/api/collections/[id]/bookmarks/route.ts`
- **修改内容**：完整重写 API 逻辑
- **修改原因**：实现"文件资源管理器"式逐层浏览
- **具体变更**：
  - 移除递归平铺逻辑（原来返回所有层级的书签）
  - 新增 `currentBookmarks`：仅返回当前文件夹直接包含的书签
  - 新增 `subfolders`：仅返回当前文件夹的直接子文件夹（不含子文件夹内容）
  - 优化查询性能，减少不必要的数据加载

### 1.2 前端核心组件修改

#### `src/components/website/sidebar.tsx`
- **修改内容**：完全重写侧边栏组件
- **修改原因**：实现合集列表+文件夹树形导航
- **具体变更**：
  - 添加合集列表区域，支持展开/折叠
  - 合集和文件夹使用 `handleFolderSelect` 同时传递 `folderId` 和 `collectionId`，修复跨合集导航 Bug
  - 添加"书签合集"分组标题
  - 优化合集和文件夹的 hover/选中状态样式
  - 添加展开/折叠的 max-height 过渡动画
  - 移除硬编码颜色，改用 CSS 变量（`bg-sidebar-accent`）
  - 调整缩进和间距，Logo 改为 32x32 图标+网站名称文字

#### `src/components/bookmark/BookmarkGrid.tsx`
- **修改内容**：重写内容区域布局
- **修改原因**：实现分层显示（子文件夹卡片置顶+书签在下）
- **具体变更**：
  - 根目录只显示文件夹卡片
  - 文件夹内页面：子文件夹卡片置顶 + 书签列表在下
  - 添加文件夹区域标题栏（"文件夹" + 数量）和分隔线
  - 面包屑使用 `bg-muted` 替代硬编码颜色
  - 调整网格间距（gap-5）和 padding（px-8）
  - 优化空状态显示，添加图标和副标题

#### `src/components/bookmark/FolderCard.tsx`
- **修改内容**：完全重写文件夹卡片视觉设计（两次迭代）
- **修改原因**：提升视觉精致度和交互体验
- **具体变更**：
  - 重新设计 SVG 文件夹图标，添加经典 folder tab（标签页）造型
  - 使用渐变色替代纯色（`#6ee7b7` → `#10b981`），增加立体感
  - hover 时三层纸张从文件夹中交错展开，带旋转变形动画
  - 添加 SVG 滤镜阴影（`feDropShadow`），纸张弹出时有真实层次感
  - 盖子部分添加白色高光线条
  - 文件夹名称 hover 时变为 primary 色
  - 优化文字间距和统计信息排版

#### `src/components/bookmark/BookmarkCard.tsx`
- **修改内容**：优化书签卡片视觉和交互
- **修改原因**：提升 hover 效果和信息层级
- **具体变更**：
  - hover 时卡片上浮 0.5px + 阴影扩散
  - 图标 hover 时缩放 1.08 倍，叠加半透明遮罩显示外部链接图标
  - 精选书签添加绿色"精选"标签徽章
  - 图标圆角从 `rounded-full` 改为 `rounded-lg`
  - 优化文字层级和透明度（`text-muted-foreground/80`、`/60`、`/50`）
  - 描述文字从 `line-clamp-2` 改为 `line-clamp-1`

### 1.3 主题与样式修改

#### `src/app/globals.css`
- **修改内容**：优化暗黑模式配色方案
- **具体变更**：
  - `.dark` 变量改为深灰蓝色调：
    - `--background: #1a2332`
    - `--card: #242e3c`
    - `--border: #2d3a4d`
  - 浅色模式保持 `#f8f9fa` / 白色

#### `src/components/ui/sidebar.tsx`
- **修改内容**：移除硬编码颜色
- **具体变更**：
  - 移除 `active:bg-white`、`data-[active=true]:bg-gray-200/50` 等硬编码
  - 改用 `bg-sidebar-accent` CSS 变量

#### `src/components/website/header.tsx`
- **修改内容**：添加显式背景色
- **具体变更**：添加 `bg-background` 类确保暗黑模式兼容

#### `src/components/search/SearchBar.tsx`
- **修改内容**：替换硬编码颜色为 CSS 变量
- **具体变更**：多处 `bg-black`、`bg-gray-100`、`text-gray-600` 替换为 CSS 变量

#### `src/components/bookmark/BookmarkCard.tsx`（样式部分）
- **修改内容**：替换硬编码颜色
- **具体变更**：`dark:bg-gray-900` → `bg-card`，`dark:text-gray-400` → `text-foreground`

### 1.4 页面布局修改

#### `src/app/page.tsx`
- **修改内容**：移除顶部横幅，优化 Logo 显示
- **具体变更**：
  - 移除 `TopBanner` 组件和导入
  - Logo 改为小图标 + 网站名称文字（从 `useSettings` 读取）

### 1.5 后台管理暗黑模式修复

以下文件均将硬编码颜色替换为 CSS 变量：

| 文件 | 修改内容 |
|------|----------|
| `src/components/collection/CollectionCard.tsx` | `bg-gray-100` → `bg-muted`，`from-white` → `from-card` |
| `src/components/admin/header.tsx` | `bg-white` → `bg-card` |
| `src/app/admin/collections/page.tsx` | `bg-card/50` → `bg-background` |
| `src/app/admin/settings/basic/page.tsx` | `bg-[#f9f9f9]` → `bg-background`，`bg-slate-100` → `bg-muted` |
| `src/app/admin/settings/basic/FooterSettingsCard.tsx` | 移除 `bg-white` |
| `src/app/admin/settings/basic/SocialMediaCard.tsx` | 移除 `bg-white` |
| `src/app/admin/settings/seo/page.tsx` | `bg-[#f9f9f9]` → `bg-background` |
| `src/app/admin/bookmarks/page.tsx` | `bg-gray-50/40` → `bg-muted/40`，`bg-white` → `bg-muted` |
| `src/components/admin/sidebar.tsx` | 移除 `hover:bg-gray-200/50` |
| `src/components/bookmark/BookmarkDataTable.tsx` | `bg-white` → `bg-card`，`text-gray-500` → `text-muted-foreground` |

---

## 二、本次新增的优化功能

### 2.1 文件资源管理器式逐层浏览
- **功能描述**：参考现代文件管理器设计，实现逐层浏览体验
- **实现方式**：
  - 左侧侧边栏：合集列表 + 可展开/折叠的文件夹树
  - 右侧主区域：子文件夹卡片置顶 + 书签列表在下
  - 点击文件夹卡片或侧边栏节点可逐层进入
  - 面包屑导航支持快速返回上级

### 2.2 精致文件夹卡片设计
- **功能描述**：重新设计文件夹卡片的视觉和交互
- **特性**：
  - 经典 folder tab 造型，渐变色质感
  - hover 时三层纸张交错展开动画（带旋转和阴影）
  - 阴影层次感（SVG feDropShadow 滤镜）
  - 文件夹名称 hover 变色

### 2.3 书签卡片交互增强
- **功能描述**：优化书签卡片的 hover 体验
- **特性**：
  - 卡片上浮 + 阴影扩散
  - 图标缩放 + 外部链接指示器
  - 精选标签徽章
  - 优化信息层级和透明度

### 2.4 深灰蓝暗黑模式
- **功能描述**：将暗黑模式从纯黑改为深灰蓝色调
- **配色方案**：
  - 背景：`#1a2332`
  - 卡片：`#242e3c`
  - 边框：`#2d3a4d`

### 2.5 全站 CSS 变量统一
- **功能描述**：将所有硬编码颜色替换为 CSS 变量
- **覆盖范围**：前台组件、后台管理页面、侧边栏、搜索栏等
- **效果**：暗黑/浅色模式自动适配，无颜色不兼容问题

### 2.6 侧边栏体验优化
- **功能描述**：优化侧边栏的视觉和交互
- **特性**：
  - 分组标题（"书签合集"）
  - 展开/折叠过渡动画
  - 选中状态高亮
  - 文件夹图标展开/折叠状态切换

---

## 三、部署配置要求

### 3.1 必需配置文件

| 文件 | 说明 |
|------|------|
| `vercel.json` | Vercel 部署配置（构建命令、框架、API 超时） |
| `.env.example` | 环境变量模板（需复制为 `.env.local` 或在 Vercel 中配置） |
| `prisma/schema.prisma` | 数据库模型定义 |
| `next.config.js` | Next.js 配置（图片域名白名单等） |
| `package.json` | 依赖和脚本配置 |

### 3.2 环境变量清单

```
DATABASE_URL          # PostgreSQL 连接字符串（必需）
NEXTAUTH_SECRET       # 认证密钥（必需）
NEXTAUTH_URL          # 应用 URL（必需）
NEXT_PUBLIC_APP_URL   # 公开应用 URL（必需）
ADMIN_EMAIL           # 管理员邮箱（必需）
ADMIN_PASSWORD        # 管理员密码（必需）
```

### 3.3 Vercel 构建流程

```
1. npm install              # 安装依赖
2. prisma generate          # 生成 Prisma Client
3. prisma db push           # 推送数据库结构
4. next build               # 构建 Next.js 项目
```

### 3.4 注意事项

1. **PostgreSQL 版本**：建议 12 及以上
2. **Node.js 版本**：建议 18.x（Vercel 默认支持）
3. **图片优化**：`next.config.js` 已配置 `unoptimized: true`，兼容 Vercel
4. **API 超时**：`vercel.json` 中 API 路由超时设为 30 秒
5. **数据库初始化**：首次部署时 `prisma db push` 自动创建表结构
6. **管理员账号**：首次运行时自动创建，使用环境变量中的邮箱和密码
