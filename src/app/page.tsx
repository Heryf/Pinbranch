"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { WebsiteSidebar } from "@/components/website/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BookmarkGrid } from "@/components/bookmark/BookmarkGrid";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { GetStarted } from "@/components/website/get-started";
import { BackToTop } from "@/components/website/back-to-top";
import { SearchBar } from "@/components/search/SearchBar";
import { Collection } from "@prisma/client";

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
          const defaultCollection = data[0];
          setSelectedCollectionId(defaultCollection?.id ?? "");
          setCollectionName(defaultCollection?.name ?? "");
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
          selectedCollectionId || collectionSlug ? (
            <>
              <WebsiteSidebar
                selectedCollectionId={selectedCollectionId}
                currentFolderId={currentFolderId}
                onCollectionChange={handleCollectionChange}
                onFolderSelect={handleFolderSelect}
              />
              <div className="flex flex-1 flex-col">
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
            <div className="flex flex-1">
              <GetStarted />
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
