# Pinbranch 优化工作明细

> **备份日期**：2026-08-08
> **工作目录**：`D:\Users\Administrator\Desktop\He_Temp\Git_Temp\pintree-deploy`
> **备份路径**：`D:\Users\Administrator\Desktop\He_Temp\Git_Temp\Backup_pintree_260808`
> **项目名称**：Pinbranch v1.0.0
> **原始来源**：基于 Pintree 二次开发

---

## 一、本次优化任务概览

| 序号 | 任务 | 状态 | 说明 |
|------|------|------|------|
| 1 | 项目打包备份 | ✅ 已完成 | 完整项目快照到 Backup_pintree_260808 |
| 2 | 私密文件夹功能 | ✅ 已完成（8/5 实施） | 密码验证、上锁标识 |
| 3 | UI 标题优化 | ✅ 已完成（8/5 实施） | 移除重复、居中修复 |
| 4 | 搜索栏全局化 | ✅ 已完成（8/5 实施） | 切换不重复渲染 |
| 5 | 性能分析与建议 | ✅ 已完成（8/5 实施） | PERFORMANCE_ANALYSIS.md |
| 6 | 书签排序功能 | 🔵 本次新增 | 拖拽排序 / 数字排序 |
| 7 | 切换加载速度 | 🔵 本次新增 | 感知延迟 + 实际请求优化 |
| 8 | 主页加载速度 | 🔵 本次新增 | 参考 ai.zhanglearning.com |
| 9 | 目录树 + 首页书签集 | 🔵 本次新增 | 一级菜单加合集入口 |
| 10 | 私密模式 BUG 修复 | 🟡 待确认方案 | 等用户确认模式选择 |

---

## 二、8/5 优化记录（私密文件夹 / UI / 搜索栏 / 性能）

### 2.1 私密文件夹功能修复

#### 问题描述
- 密码设置后无保护效果
- "打开/关闭公开访问"开关无实际区别
- 未登录管理员可直接查看私密内容
- 加密文件夹缺少输入密码入口

#### 修复方案
**模式选择**：结合两种模式的优势实现：
- **默认模式**：公开访问，所有人可见
- **私密模式**：启用后 → 公开显示文件夹但上锁，访问时需输入密码

#### 涉及文件
| 文件 | 修改内容 |
|------|---------|
| `src/components/folder/EditFolderDialog.tsx` | "公开访问" 改 "私密访问"，关闭=公开、开启+密码=上锁 |
| `src/components/folder/CreateFolderDialog.tsx` | 同步汉化与逻辑 |
| `src/components/folder/PasswordDialog.tsx` | 🆕 新增密码验证弹窗 |
| `src/app/api/collections/[id]/bookmarks/route.ts` | 服务端密码校验，403 状态码 |
| `src/app/api/collections/[id]/folders/route.ts` | 列表接口脱敏，不返回 password 字段 |
| `src/app/api/folders/[id]/route.ts` | PUT 时清理空密码 |
| `src/components/bookmark/BookmarkGrid.tsx` | 集成 PasswordDialog，sessionStorage 缓存 |
| `src/components/bookmark/FolderCard.tsx` | 显示 🔒 锁图标和 "已上锁" 标记 |

### 2.2 UI 标题显示修复

#### 修改
- 移除 `header.tsx` 中间 "Pinbranch" 重复标题
- `sidebar.tsx` 左上角：`justify-start` → `justify-center`，垂直居中
- 字体加粗：`font-bold tracking-tight`

#### 涉及文件
- `src/components/website/header.tsx`
- `src/components/website/sidebar.tsx`

### 2.3 搜索栏全局化

#### 问题
每次切换文件夹都重新加载搜索栏，造成大量冗余。

#### 修复
- 搜索栏提取到 `page.tsx` 顶层（独立组件）
- 搜索状态（input、searchEngine、searchScope）在 page 层统一管理
- BookmarkGrid 只负责显示搜索结果，无内部搜索栏

#### 涉及文件
- `src/app/page.tsx` — 顶层搜索栏
- `src/components/bookmark/BookmarkGrid.tsx` — 移除内部搜索栏
- `src/components/search/SearchBar.tsx` — 解耦

### 2.4 性能优化方案

详见 `PERFORMANCE_ANALYSIS.md`，包含 7 个方向：
1. 图片优化（懒加载、WebP）
2. API 合并（书签 + 文件夹 单次请求）
3. N+1 查询（Prisma include/include 不当）
4. 包体积（dynamic import）
5. 缓存策略（unstable_cache + revalidate）
6. 首屏渲染（Suspense + Skeleton）
7. 数据库索引（常用查询字段）

新增 `src/app/loading.tsx` 全局骨架屏。

---

## 三、本次新增任务（8/8）

### 3.1 书签排序功能

#### 现状
后台书签管理表格中，书签按数据库默认顺序展示，无法自定义排序。

#### 实现方案
- 后台表格列加"排序号"列（数字输入框）
- 编辑书签弹窗加"排序号"字段
- API 端 PUT 接受 sortOrder，更新时持久化
- 前端按 sortOrder ASC 排序展示

#### 涉及文件（待修改）
- `src/app/admin/bookmarks/page.tsx`
- `src/components/bookmark/EditBookmarkDialog.tsx`
- `src/components/bookmark/BookmarkDataTable.tsx`
- `src/components/bookmark/CreateBookmarkDialog.tsx`

### 3.2 切换加载速度优化

#### 现状
点击文件夹切换时显示骨架屏时间过长。

#### 优化方向
- 路由切换：使用 `useTransition` + 客户端缓存
- 数据预取：sidebar hover 时预取目标数据
- 客户端缓存：sessionStorage 缓存文件夹内容

### 3.3 主页加载速度优化

#### 参考 https://ai.zhanglearning.com/ 加载特点
- 首屏极快：服务端预渲染 + 关键数据 SSR 注入
- 骨架屏：避免白屏
- 资源懒加载：图片、图标 lazy load
- HTTP 缓存：CDN 边缘缓存

#### 本项目实现
- 所有 API 接口加 `Cache-Control` 头
- 列表数据 `unstable_cache` 包裹，revalidate 60s
- 图片懒加载：`<Image>` 组件 loading="lazy"
- WebP 自动转换（Next.js 默认）

### 3.4 目录树优化 + 首页书签集入口

#### 问题
- 侧边栏每个合集独立一段，"合集名" 重复 1 次
- 没有"回到首页"快捷入口
- 没有合集层级显示

#### 改进方案
- 顶部固定"首页书签集"块，显示所有合集卡片网格
- 点击合集 → 进入对应合集页
- 每个合集页右上角加 "← 返回首页书签集" 面包屑
- 顶栏固定"首页"按钮（Home 图标）

### 3.5 私密模式 BUG 修复 - 待确认方案

#### 现状问题
1. 启用私密模式后未登录管理员可直接打开，无加密标识
2. 设置密码后，前端只显示"该文件夹已上锁，请输入密码访问"，**没有输入框**

#### 提供两个方案供选择：

**方案 A（双模式并存 - 推荐）**
- 后台目录列表：合并显示，锁定文件夹用 🔒 标记
- 主页面：所有文件夹可见，锁定文件夹点开后弹出密码输入框
- 管理员视角：仍可一键进入，无需密码
- 未登录用户：必须输入正确密码才能查看

**方案 B（隐藏模式 - 极致隐私）**
- 未登录管理员：私密文件夹完全不可见（列表中也不显示）
- 管理员登录后：私密文件夹显示，自动可见
- 缺点：用户在主页面看不到文件夹数量，提醒减少

#### 关键技术点
- 服务端：API 永远不返回密码内容，但保留 `hasPassword` 布尔
- 前端：根据 `hasPassword` + 管理员状态决定是否需要弹密码框
- 管理员：登录态校验通过 → 直接跳过密码
- 未登录用户：必须 `compare(password, hash)` 验证

---

## 四、关键文件清单

### 后端 API
```
src/app/api/
├── collections/
│   ├── [id]/
│   │   ├── folders/route.ts        # 列表（脱敏）
│   │   ├── folders/[folderId]/     # 路径
│   │   └── bookmarks/route.ts      # 列表（密码校验）
│   └── reorder/route.ts            # 排序
└── folders/
    ├── route.ts                    # 创建
    └── [id]/route.ts               # 更新（含密码）
```

### 前端组件
```
src/components/
├── bookmark/
│   ├── BookmarkGrid.tsx            # 网格 + 密码弹窗
│   ├── BookmarkCard.tsx            # 卡片
│   ├── BookmarkDataTable.tsx       # 后台表格
│   ├── FolderCard.tsx              # 文件夹卡片 + 🔒
│   ├── EditBookmarkDialog.tsx      # 编辑（汉化）
│   └── CreateBookmarkDialog.tsx    # 新建（汉化）
├── folder/
│   ├── EditFolderDialog.tsx        # 编辑
│   ├── CreateFolderDialog.tsx      # 新建
│   └── PasswordDialog.tsx          # 密码验证
├── search/
│   └── SearchBar.tsx               # 全局搜索
└── website/
    ├── header.tsx                  # 顶栏
    └── sidebar.tsx                 # 侧边栏
```

---

## 五、关键 Schema 字段

```prisma
model Folder {
  id          String   @id @default(cuid())
  name        String
  icon        String?
  sortOrder   Int      @default(0)
  hasPassword Boolean  @default(false)   // 是否启用私密
  password    String?                     // 哈希后的密码
}

model Bookmark {
  id          String   @id @default(cuid())
  title       String
  url         String
  description String?
  iconUrl     String?
  folderId    String?
  sortOrder   Int      @default(0)
}
```

---

## 六、待办与风险

| 风险/待办 | 影响 | 优先级 |
|----------|------|--------|
| 私密模式方案确认 | 高 | P0 — 等用户确认 |
| 性能优化实测对比 | 中 | P1 — 部署后查看 Lighthouse |
| 书签排序 UX 测试 | 中 | P1 — 后台拖拽流畅度 |
| 目录树折叠状态持久化 | 低 | P2 — localStorage 缓存 |

---

## 七、版本记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-08-05 | v1.0.0-rc1 | 私密文件夹 / UI / 搜索栏 / 性能分析 |
| 2026-08-08 | v1.0.0-rc2 | 排序 / 性能优化 / 目录树 / 首页书签集 |

---

> 最后更新：2026-08-08 16:04
