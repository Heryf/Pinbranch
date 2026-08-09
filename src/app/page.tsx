"use client";

import { useState, useEffect, useCallback, Suspense, lazy, useRef } from "react";
import { WebsiteSidebar } from "@/components/website/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BookmarkGrid } from "@/components/bookmark/BookmarkGrid";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { GetStarted } from "@/components/website/get-started";
import { BackToTop } from "@/components/website/back-to-top";
import { SearchBar } from "@/components/search/SearchBar";
import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { Library, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collection } from "@prisma/client";
import { useSettings } from "@/hooks/use-settings";

// 懒加载 GetStarted，减小首屏 JS 体积
const LazyGetStarted = lazy(() =>
  import("@/components/website/get-started").then(m => ({ default: m.GetStarted }))
);

// 视图模式：home = 书签集首页；collection = 合集浏览
type ViewMode = "home" | "collection";

function SearchParamsComponent() {
  // 视图模式与当前选中的合集/文件夹
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string>("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 全局搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [currentEngine, setCurrentEngine] = useState("书签");
  const [enableSearch, setEnableSearch] = useState(true);

  // collections 数据预加载（首次挂载执行一次，永久缓存到 state）
  const collectionsLoadedRef = useRef(false);

  // 使用 useSettings hook 复用 sessionStorage 缓存（减少 API 请求）
  const { settings: featureSettings } = useSettings("feature");

  // 加载 collections（仅首次挂载执行一次）
  useEffect(() => {
    if (collectionsLoadedRef.current) return;
    collectionsLoadedRef.current = true;

    const fetchCollectionsOnce = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/collections?publicOnly=true");
        const data: Collection[] = await response.json();
        setCollections(data);

        // 首屏默认显示第一个合集（不自动展开下级书签夹，由 sidebar 控制）
        if (data.length > 0) {
          setSelectedCollectionId(data[0].id);
          setCollectionName(data[0].name || "");
          setViewMode("collection");
        }
      } catch (error) {
        console.error("获取 collections 失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCollectionsOnce();
  }, []);

  // 从 settings 提取搜索开关（useSettings 自带缓存，不重复请求）
  useEffect(() => {
    if (featureSettings?.enableSearch !== undefined) {
      setEnableSearch(featureSettings.enableSearch === 'true' || featureSettings.enableSearch === true);
    }
  }, [featureSettings]);

  // 返回首页书签集：纯 setState，不修改 URL
  const goHome = useCallback(() => {
    setViewMode("home");
    setSelectedCollectionId("");
    setCollectionName("");
    setCurrentFolderId(null);
  }, []);

  // 切换合集：纯 setState，不修改 URL，不重新 fetch
  const handleCollectionChange = useCallback((id: string, _slug?: string | null) => {
    const collection = collections.find((c) => c.id === id);
    if (!collection) return;

    setViewMode("collection");
    setSelectedCollectionId(id);
    setCollectionName(collection.name || "");
    setCurrentFolderId(null);
  }, [collections]);

  // 通过 slug 切换合集（首页 CollectionGrid 调用）
  const handleCollectionSelectBySlug = useCallback((slug: string) => {
    const collection = collections.find(c => c.slug === slug);
    if (!collection) return;
    setViewMode("collection");
    setSelectedCollectionId(collection.id);
    setCollectionName(collection.name || "");
    setCurrentFolderId(null);
  }, [collections]);

  // 切换文件夹：纯 setState，秒级切换。若跨合集则先切换合集
  const handleFolderSelect = useCallback((id: string | null, collectionId?: string) => {
    if (collectionId && collectionId !== selectedCollectionId) {
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        setViewMode("collection");
        setSelectedCollectionId(collectionId);
        setCollectionName(collection.name || "");
      }
    }
    setCurrentFolderId(id);
  }, [collections, selectedCollectionId]);

  // Header 在添加书签后，切换到目标文件夹：纯 setState
  const handleNavigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  const refreshData = useCallback(() => {
    if (selectedCollectionId) {
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [selectedCollectionId]);

  const handleSearch = useCallback((query: string, scope: 'all' | 'current') => {
    setSearchQuery(query);
    setSearchScope(scope);
  }, []);

  // 计算当前合集 slug（用于 BookmarkGrid 内部跳转）
  const currentCollectionSlug = collections.find((c) => c.id === selectedCollectionId)?.slug || "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <SidebarProvider>
          {isLoading && !collections.length ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : viewMode === "home" ? (
            // 书签集首页视图
            <>
              <WebsiteSidebar
                selectedCollectionId=""
                currentFolderId={null}
                onCollectionChange={handleCollectionChange}
                onFolderSelect={handleFolderSelect}
                onGoHome={goHome}
                collections={collections}
                collectionsLoading={isLoading}
              />
              <div className="flex flex-1 flex-col">
                <Header
                  selectedCollectionId=""
                  currentFolderId={null}
                  onBookmarkAdded={refreshData}
                />
                <main className="flex-1 overflow-y-auto px-6 py-8">
                  <div className="max-w-7xl mx-auto space-y-6">
                    {/* 标题区 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
                          <Library className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-foreground">书签集</h1>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            共 {collections.length} 个公开合集
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 合集网格 */}
                    <CollectionGrid
                      onSelect={handleCollectionSelectBySlug}
                      collections={collections}
                      loading={isLoading}
                    />
                  </div>
                </main>
                <Footer />
              </div>
              <BackToTop />
            </>
          ) : (
            // 合集浏览视图
            <>
              <WebsiteSidebar
                selectedCollectionId={selectedCollectionId}
                currentFolderId={currentFolderId}
                onCollectionChange={handleCollectionChange}
                onFolderSelect={handleFolderSelect}
                onGoHome={goHome}
                collections={collections}
                collectionsLoading={isLoading}
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between px-4 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goHome}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>返回书签集</span>
                  </Button>
                </div>
                <Header
                  selectedCollectionId={selectedCollectionId}
                  currentFolderId={currentFolderId}
                  onBookmarkAdded={refreshData}
                  onNavigateToFolder={handleNavigateToFolder}
                />

                {/* 全局搜索栏 - 固定在 Header 下方，切换文件夹时不重复渲染 */}
                {enableSearch && (
                  <div className="flex justify-center px-4 pt-4 pb-2">
                    <SearchBar
                      placeholder="搜索书签..."
                      onSearch={handleSearch}
                      currentEngine={currentEngine}
                      onEngineChange={setCurrentEngine}
                      currentCollection={searchScope}
                      onCollectionChange={(scope) => setSearchScope(scope as 'all' | 'current')}
                    />
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  <BookmarkGrid
                    key={`${selectedCollectionId}-${currentFolderId}`}
                    collectionId={selectedCollectionId}
                    currentFolderId={currentFolderId}
                    collectionName={collectionName}
                    collectionSlug={currentCollectionSlug}
                    refreshTrigger={refreshTrigger}
                    searchQuery={searchQuery}
                    searchScope={searchScope}
                    onSearchChange={handleSearch}
                    onFolderNavigate={handleFolderSelect}
                  />
                </div>
                <Footer />
              </div>
              <BackToTop />
            </>
          )}
        </SidebarProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsComponent />
    </Suspense>
  );
}
