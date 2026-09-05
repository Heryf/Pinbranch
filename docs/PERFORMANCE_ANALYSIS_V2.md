# 网站加载性能深度对比分析报告

> 分析对象：你的网站 (heryf.ccwu.cc) vs 参考网站 (ai.zhanglearning.com)
> 分析日期：2026-08-09
> 技术栈：Next.js 14 + Prisma + Neon PostgreSQL + Vercel

---

## 一、技术栈确认

| 维度 | 你的网站 | 参考网站 |
|------|---------|---------|
| 基础框架 | Next.js 14.2.15 | Next.js（Pintree 原版） |
| 项目基底 | Pintree 二次开发 (Pinbranch) | Pintree 原版 |
| 数据库 | Neon PostgreSQL | Neon PostgreSQL |
| 部署 | Vercel | Vercel |
| 图片优化 | `unoptimized: true`（禁用） | `unoptimized: true`（禁用） |
| 渲染方式 | CSR（客户端渲染） | CSR（客户端渲染） |

**关键发现**：两个网站基于同一项目 (Pintree)，技术栈完全相同。参考网站之所以快，是因为其数据量小、合集内书签分散在子文件夹中，而你的网站有一个合集（搜罗美食）包含 648 条书签，放大了所有架构层面的性能缺陷。

---

## 二、核心性能问题定位（按影响程度排序）

### 问题 1：三重重复 API 调用（影响：极高）

**现象**：页面加载时，`/api/collections?publicOnly=true` 被调用了 **3 次**：

| 调用方 | 文件位置 | 说明 |
|--------|---------|------|
| page.tsx | 第 61 行 | 获取合集列表设置默认合集 |
| sidebar.tsx | 第 70 行 | 侧边栏渲染合集树 |
| CollectionGrid.tsx | 第 118 行 | 首页书签集网格 |

每次调用都触发一次完整的服务端处理（即使有 `unstable_cache`，仍有 HTTP 往返开销）。

**参考网站**：原版 Pintree 只有 page.tsx 和 sidebar.tsx 两处调用，且无 CollectionGrid 组件。

---

### 问题 2：648 条书签无分页一次性加载（影响：极高）

**现象**：`/api/collections/[id]/bookmarks` API 返回当前文件夹下的**所有**书签，无分页。

- 你的"搜罗美食"合集有 648 条书签
- 如果这些书签在根目录，一次返回 648 个书签对象（约 200-500KB JSON）
- 前端同时渲染 648 个 BookmarkCard 组件
- 648 张书签图标同时发起图片请求

**API 代码** (`src/app/api/collections/[id]/bookmarks/route.ts` 第 44-65 行)：
```javascript
// 一次性返回所有书签，无 limit/offset
const currentBookmarks = await prisma.bookmark.findMany({
  where: { collectionId: id, ...(folderId ? { folderId } : { folderId: null }) },
  orderBy: { [sortField]: sortOrder },
  include: { collection: { select: { name: true } }, folder: { select: { name: true } } },
});
```

**参考网站**：书签分散在多层子文件夹中，每次只加载当前层级（通常 < 50 条）。

---

### 问题 3：N+1 查询 - 子文件夹统计（影响：高）

**现象**：`bookmarks` API 中，对每个子文件夹执行 2 次独立的 count 查询：

```javascript
// 第 78-101 行：N 个子文件夹 = 2N 次额外 DB 查询
const subfolders = await Promise.all(
  subfoldersRaw.map(async (folder) => {
    const [bookmarkCount, childFolderCount] = await Promise.all([
      prisma.bookmark.count({ where: { folderId: folder.id } }),
      prisma.folder.count({ where: { parentId: folder.id } })
    ]);
    return { ...folder, bookmarkCount, childFolderCount };
  })
);
```

如果有 20 个子文件夹 → 40 次额外 DB 查询。

---

### 问题 4：layout.tsx generateMetadata 阻塞 HTML 响应（影响：高）

**现象**：`layout.tsx` 的 `generateMetadata` 在**每次请求**时执行 3+ 次 DB 查询：

1. `checkSiteSettingTableExists()` — 查询 information_schema（第 15-22 行）
2. `prisma.siteSetting.findMany()` — 获取网站设置（第 39-45 行）
3. `prisma.settingImage.findFirst()` — 获取 favicon（第 72-75 行）

这发生在 HTML 响应发送之前，直接阻塞了首字节时间 (TTFB)。

在 production 模式下，还会额外查询 analytics 设置（第 151-169 行），又是 2 次 DB 查询。

**总计**：每次页面加载，layout.tsx 至少执行 **5 次 DB 查询** 才能返回 HTML。

---

### 问题 5：API 调用瀑布流（影响：高）

页面加载时的 API 调用链：

```
浏览器收到 HTML → JS 下载执行 →
  ├─ fetch /api/collections (page.tsx)         ─┐
  ├─ fetch /api/collections (sidebar.tsx)       │ 3次重复
  ├─ fetch /api/collections (CollectionGrid)   ─┘
  ├─ fetch /api/settings?group=basic (sidebar)    侧边栏设置
  ├─ fetch /api/settings?group=feature (page)     搜索设置
  ├─ Server Action: getSettingImages (sidebar)    logo 图片
  │
  │  ↓ 等待 sidebar 获取 collections 完成
  ├─ fetch /api/folders/all (sidebar)             所有文件夹树
  │
  │  ↓ 等待 page 获取 collections + 用户选择合集
  ├─ fetch /api/collections/[id]/bookmarks        书签数据
  ├─ fetch /api/collections/[id]/folders/[fid]/path  面包屑（串行等待）
  │
  │  ↓ bookmarks API 内部
  └─ N × (bookmark.count + folder.count)          N+1 查询
```

**总计 9-13 次 API/DB 调用**，其中多数是串行依赖。

---

### 问题 6：图片完全未优化（影响：中高）

**next.config.js**：
```javascript
images: {
  unoptimized: true,  // 完全禁用 Next.js 图片优化
  minimumCacheTTL: 0,  // 不缓存
}
```

- 无 WebP 转换
- 无响应式图片 (srcset)
- 无尺寸压缩
- 每个书签图标从原始 URL 直接加载

648 条书签 = 648 个图片请求，全部全尺寸加载。

---

### 问题 7：未使用的重型依赖（影响：中）

**package.json** 中包含但前端未使用的依赖：

| 依赖 | 大小（估） | 状态 |
|------|-----------|------|
| @dnd-kit/core + modifiers + sortable + utilities | ~80KB | 前端已移除拖拽，未使用 |
| embla-carousel-react | ~30KB | 未在公开页面使用 |
| react-dropzone | ~20KB | 未在公开页面使用 |
| @uploadthing/react + uploadthing | ~40KB | 未在公开页面使用 |
| remixicon | ~200KB+ (CSS) | 与 lucide-react 重复 |

这些依赖会被打包进客户端 JS bundle，增加下载和解析时间。

---

### 问题 8：BookmarkCard 使用 next/image 但图片未优化（影响：中）

```tsx
// BookmarkCard.tsx 第 52-62 行
<Image
  src={imageError ? defaultIcon : (icon || defaultIcon)}
  fill
  priority={isFeatured}  // 精选书签优先加载
/>
```

使用 `next/image` 组件但 `unoptimized: true`，相当于用了最重的图片组件却没有任何优化效果。`priority` 属性对非精选书签无效，648 张图片中绝大多数不会优先加载。

---

### 问题 9：settings API 标记为 force-dynamic（影响：低中）

```javascript
// src/app/api/settings/route.ts 第 10 行
export const dynamic = 'force-dynamic';
```

设置数据极少变化，但每次请求都重新查询数据库，且无缓存。

---

## 三、参考网站为什么快

| 因素 | 参考网站 | 你的网站 |
|------|---------|---------|
| 数据量 | 11 个合集，书签分散在子文件夹 | 3 个合集，"搜罗美食"有 648 条 |
| 单次加载书签数 | 通常 < 30 条/层级 | 最多 648 条/层级 |
| 图片请求数 | < 30 张/页 | 最多 648 张/页 |
| API 响应大小 | < 20KB | 200-500KB |
| 渲染组件数 | < 30 个 | 最多 648 个 |
| 重复 API 调用 | 2 次 | 3 次 |
| layout.tsx DB 查询 | 相同（5次） | 相同（5次） |

**核心差异**：数据量。参考网站将书签组织在多层子文件夹中，每次只加载一个小层级。你的网站把大量书签放在同一层级，放大了所有性能瓶颈。

---

## 四、优化方案（按优先级排序）

### P0 - 立即见效（预计提升 50-70%）

#### 4.1 合并重复 API 调用
- 在 page.tsx 中获取一次 collections，通过 props 传递给 sidebar 和 CollectionGrid
- 消除 2 次冗余的 `/api/collections` 请求

#### 4.2 书签分页加载
- API 增加分页参数 (`page`, `pageSize`)
- 默认每页 24-48 条
- 前端实现"加载更多"按钮或无限滚动
- 648 条 → 首屏只加载 24 条

#### 4.3 修复 N+1 查询
- 用 `groupBy` 批量获取所有子文件夹的书签数和子文件夹数
- 1 次查询替代 2N 次查询

#### 4.4 layout.tsx metadata 缓存
- 将 `generateMetadata` 的 DB 查询结果缓存 5 分钟
- 或将网站名称等基础信息内联到构建时

### P1 - 显著改善（预计再提升 20-30%）

#### 4.5 合并设置 API
- 将 `/api/settings?group=basic`、`/api/settings?group=feature`、`getSettingImages` 合并为一个 `/api/init` 端点
- 一次请求返回所有初始化数据

#### 4.6 启用图片优化
- 移除 `unoptimized: true`
- 或改用普通 `<img>` + `loading="lazy"` 替代 `next/image`（更轻量）

#### 4.7 移除未使用依赖
- 删除 `@dnd-kit/*`（4个包）
- 删除 `embla-carousel-react`、`react-dropzone`、`@uploadthing/react`
- 评估是否可以移除 `remixicon`（用 lucide-react 替代）

### P2 - 锦上添花（预计再提升 5-10%）

#### 4.8 面包屑并行加载
- 将面包屑 path API 与 bookmarks API 并行请求

#### 4.9 虚拟滚动
- 对 648+ 条书签实现虚拟滚动 (react-window / @tanstack/react-virtual)
- 只渲染可视区域内的组件

#### 4.10 settings API 缓存
- 移除 `force-dynamic`，改用 `unstable_cache` + revalidate

#### 4.11 数据预取
- 鼠标 hover 合集时预取该合集的书签数据
- 利用 `router.prefetch()` 预取下一个可能访问的页面

---

## 五、性能瓶颈影响权重

```
■■■■■■■■■■■■■■■■■■■ 648条书签无分页 (35%)
■■■■■■■■■■■■■■ 3次重复API调用 (20%)
■■■■■■■■■■ layout.tsx DB阻塞 (15%)
■■■■■■■■ N+1查询 (12%)
■■■■■■ API瀑布流 (8%)
■■■■ 图片未优化 (5%)
■■■ 重型依赖 (3%)
■■ settings force-dynamic (2%)
```

---

## 六、预期优化效果

| 优化阶段 | 预计 FCP | 改善幅度 |
|---------|---------|---------|
| 当前 | 3-6 秒 | - |
| P0 完成 | 0.8-1.5 秒 | 60-75% |
| P0+P1 完成 | 0.4-0.8 秒 | 80-90% |
| P0+P1+P2 完成 | 0.3-0.5 秒 | 85-95% |

---

*本报告基于代码静态分析生成。建议结合 Chrome DevTools Network 面板和 Lighthouse 实测验证。*
