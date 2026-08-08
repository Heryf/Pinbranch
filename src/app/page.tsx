"use client";

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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

// 懒加载 GetStarted，减小首屏 JS 体积
const LazyGetStarted = lazy(() =>
  import("@/components/website/get-started").then(m => ({ default: m.GetStarted }))
);

function SearchParamsComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const collectionSlug = searchParams.get("collection");

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string>("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 全局搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
  const [currentEngine, setCurrentEngine] = useState("书签");
  const [enableSearch, setEnableSearch] = useState(true);

  const routeToFolderInCollection = (collection: Collection, folderId?: string | null) => {
    const currentSearchParams = new URLSearchParams(searchParams.toString());
    collection?.slug ? currentSearchParams.set("collection", collection.slug) : currentSearchParams.delete("collection");
    folderId ? currentSearchParams.set("folderId", folderId) : currentSearchParams.delete("folderId");
    router.push(`${pathname}?${currentSearchParams.toString()}`);
  }

  // 返回首页书签集（清空 query 参数）
  const goHome = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  useEffect(() => {
    const folderId = searchParams.get("folderId");
    setCurrentFolderId(folderId);

    const fetchCollectionsAndSetDefault = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/collections?publicOnly=true");
        const data = await response.json();
        setCollections(data);

        // set selected collection by slug
        if (collectionSlug) {
          const currentCollection = data.find(
            (c: Collection) => c.slug === collectionSlug
          );
          if (currentCollection) {
            setSelectedCollectionId(currentCollection.id);
            setCollectionName(currentCollection.name);
          }
        } else {
          // 没有选择合集时，清空状态，进入首页书签集视图
          setSelectedCollectionId("");
          setCollectionName("");
        }
      } catch (error) {
        console.error("获取 collections 失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollectionsAndSetDefault();
  }, [searchParams]);

  // 加载搜索设置
  useEffect(() => {
    const loadSearchSetting = async () => {
      try {
        const response = await fetch('/api/settings?group=feature');
        const data = await response.json();
        setEnableSearch(data.enableSearch === 'true' || data.enableSearch === true);
      } catch (error) {
        console.error('Load search settings failed:', error);
      }
    };
    loadSearchSetting();
  }, []);

  const handleCollectionChange = (id: string, slug?: string) => {
    const collection = collections.find((c) => c.id === id);
    if (!collection) return;

    setSelectedCollectionId(id);
    setCollectionName(collection.name || "");
    setCurrentFolderId(null);

    routeToFolderInCollection(collection);
  };

  const handleCollectionSelectBySlug = useCallback((slug: string) => {
    const collection = collections.find(c => c.slug === slug);
    if (!collection) return;
    setSelectedCollectionId(collection.id);
    setCollectionName(collection.name || "");
    setCurrentFolderId(null);
    routeToFolderInCollection(collection);
  }, [collections]);

  const handleFolderSelect = (id: string | null) => {
    const collection = collections.find((c) => c.id === selectedCollectionId);
    if (!collection) return;

    routeToFolderInCollection(collection, id);
    setCurrentFolderId(id);
  };

  const refreshData = useCallback(async () => {
    if (selectedCollectionId) {
      try {
        setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
        console.error("刷新数据失败:", error);
      }
    }
  }, [selectedCollectionId, currentFolderId]);

  const handleSearch = (query: string, scope: 'all' | 'current') => {
    setSearchQuery(query);
    setSearchScope(scope);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <SidebarProvider>
          {
          isLoading && !collections.length ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) :
          // 三种视图：首页书签集 / 合集浏览 / 没有合集时引导页
          !collectionSlug ? (
            // 首页书签集视图
            <>
              <WebsiteSidebar
                selectedCollectionId=""
                currentFolderId={null}
                onCollectionChange={handleCollectionChange}
                onFolderSelect={handleFolderSelect}
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
                          <h1 className="text-xl font-bold text-foreground">首页书签集</h1>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            共 {collections.length} 个公开合集
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 合集网格 */}
                    <CollectionGrid onSelect={handleCollectionSelectBySlug} />
                  </div>
                </main>
                <Footer />
              </div>
              <BackToTop />
            </>
          ) : selectedCollectionId ? (
            // 合集浏览视图
            <>
              <WebsiteSidebar
                selectedCollectionId={selectedCollectionId}
                currentFolderId={currentFolderId}
                onCollectionChange={handleCollectionChange}
                onFolderSelect={handleFolderSelect}
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
                    <span>返回首页书签集</span>
                  </Button>
                </div>
                <Header
                  selectedCollectionId={selectedCollectionId}
                  currentFolderId={currentFolderId}
                  onBookmarkAdded={refreshData}
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
                    collectionSlug={
                      collections.find((c) => c.id === selectedCollectionId)
                        ?.slug || ""
                    }
                    refreshTrigger={refreshTrigger}
                    searchQuery={searchQuery}
                    searchScope={searchScope}
                    onSearchChange={handleSearch}
                  />
                </div>
                <Footer />
              </div>
              <BackToTop />
            </>
          ) : (
            // 没有任何合集时
            <div className="flex flex-1">
              <Suspense fallback={<div className="flex items-center justify-center flex-1">加载中...</div>}>
                <LazyGetStarted />
              </Suspense>
            </div>
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
