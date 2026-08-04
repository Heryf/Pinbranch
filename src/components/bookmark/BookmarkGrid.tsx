"use client";

import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { BookmarkCard } from "./BookmarkCard";
import { FolderCard } from "./FolderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, FolderOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PasswordDialog } from "@/components/folder/PasswordDialog";

interface BookmarkGridProps {
  collectionId: string;
  currentFolderId: string | null;
  collectionName?: string;
  collectionSlug?: string;
  refreshTrigger?: number;
  pageSize?: number;
  searchQuery?: string;
  searchScope?: 'all' | 'current';
  onSearchChange?: (query: string, scope: 'all' | 'current') => void;
}

interface Subfolder {
  id: string;
  name: string;
  icon?: string;
  bookmarkCount: number;
  childFolderCount: number;
  isPrivate?: boolean;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  isFeatured: boolean;
  collection?: { name: string; slug: string; };
  folder?: { name: string; slug: string; };
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

// 从 sessionStorage 获取已验证的密码
const getVerifiedPassword = (folderId: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const key = `folder_pwd_${folderId}`;
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setVerifiedPassword = (folderId: string, password: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `folder_pwd_${folderId}`;
    sessionStorage.setItem(key, password);
  } catch {
    // ignore
  }
};

export function BookmarkGrid({
  collectionId,
  currentFolderId,
  collectionName = "Root",
  collectionSlug,
  refreshTrigger = 0,
  pageSize = 100,
  searchQuery = "",
  searchScope = 'all',
  onSearchChange,
}: BookmarkGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentBookmarks, setCurrentBookmarks] = useState<Bookmark[]>([]);
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchResults, setSearchResults] = useState<Bookmark[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  // 密码验证相关状态
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordFolderName, setPasswordFolderName] = useState("");
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const routeToFolderInCollection = (collectionSlug: string, folderId?: string) => {
    const currentSearchParams = new URLSearchParams(searchParams.toString());
    collectionSlug ? currentSearchParams.set("collection", collectionSlug) : currentSearchParams.delete("collection");
    folderId ? currentSearchParams.set("folderId", folderId) : currentSearchParams.delete("folderId");
    router.push(`${pathname}?${currentSearchParams.toString()}`, { scroll: false });
  }

  // 获取当前层级的书签和子文件夹
  const fetchBookmarkData = useCallback(async (folderId: string | null) => {
    // 延迟设置 loading，避免快速切换时的闪烁
    loadingTimerRef.current = setTimeout(() => {
      setLoading(true);
    }, 150);

    try {
      // 获取已验证的密码
      const password = folderId ? getVerifiedPassword(folderId) : null;
      const passwordParam = password ? `&password=${encodeURIComponent(password)}` : '';

      const response = await fetch(
        `/api/collections/${collectionId}/bookmarks?` +
        (folderId ? `folderId=${folderId}` : '') +
        passwordParam
      );

      if (response.status === 403) {
        // 需要密码验证
        const data = await response.json();
        setPasswordFolderName(data.folderName || "私密文件夹");
        setPasswordDialogOpen(true);
        setPendingFolderId(folderId);
        setAccessDenied(true);
        setCurrentBookmarks([]);
        setSubfolders([]);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      setAccessDenied(false);
      const data = await response.json();
      setCurrentBookmarks(data.currentBookmarks || []);
      setSubfolders(data.subfolders || []);

      // 获取面包屑导航
      if (folderId) {
        const pathResponse = await fetch(`/api/collections/${collectionId}/folders/${folderId}/path`);
        if (pathResponse.ok) {
          const pathData = await pathResponse.json();
          setBreadcrumbs(pathData);
        }
      } else {
        setBreadcrumbs([]);
      }
    } catch (error) {
      console.error("Get data failed:", error);
      setCurrentBookmarks([]);
      setSubfolders([]);
    } finally {
      // 清除延迟 loading 定时器
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (collectionId) {
      fetchBookmarkData(currentFolderId);
    }
  }, [collectionId, currentFolderId, refreshTrigger, fetchBookmarkData]);

  // 处理搜索
  useEffect(() => {
    if (searchQuery) {
      performBookmarkSearch(searchQuery, searchScope);
    } else {
      setSearchResults([]);
      setInputValue("");
      setTotalResults(0);
    }
  }, [searchQuery, searchScope]);

  // 处理文件夹导航
  const handleFolderNavigation = useCallback(async (folderId: string | null) => {
    if (!collectionSlug) return;
    if (folderId === null) {
      setBreadcrumbs([]);
      startTransition(() => {
        routeToFolderInCollection(collectionSlug);
      });
    } else {
      startTransition(() => {
        routeToFolderInCollection(collectionSlug, folderId);
      });
    }
  }, [collectionSlug]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  // 搜索处理函数
  const performBookmarkSearch = async (query: string, scope: 'all' | 'current', page: number = 1) => {
    setInputValue(query);
    if (!query.trim()) {
      setSearchResults([]);
      setInputValue("");
      setCurrentPage(1);
      setTotalPages(1);
      setTotalResults(0);
      return;
    }
    try {
      setIsSearching(true);
      const response = await fetch(
        `/api/search/bookmarks?` +
        `q=${encodeURIComponent(query)}` +
        `&scope=${scope}` +
        `&collectionId=${collectionId}` +
        `&page=${page}` +
        `&pageSize=${pageSize}`
      );
      const data = await response.json();
      setSearchResults(data.bookmarks || []);
      setTotalPages(Math.ceil(data.total / pageSize));
      setTotalResults(data.total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (inputValue) {
      performBookmarkSearch(inputValue, searchScope, newPage);
    }
  };

  // 密码验证回调
  const handlePasswordVerify = async (password: string): Promise<boolean> => {
    if (!pendingFolderId) return false;
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/bookmarks?` +
        `folderId=${pendingFolderId}&password=${encodeURIComponent(password)}`
      );
      if (response.ok) {
        setVerifiedPassword(pendingFolderId, password);
        // 重新加载数据
        fetchBookmarkData(pendingFolderId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handlePasswordCancel = () => {
    // 密码验证取消，返回上级目录或根目录
    if (pendingFolderId) {
      handleFolderNavigation(null);
    }
    setPendingFolderId(null);
    setAccessDenied(false);
  };

  if (!collectionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-8 space-y-8">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[130px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-[90px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // 访问被拒绝状态（密码验证失败或取消）
  if (accessDenied) {
    return (
      <div className="px-8 pb-8 space-y-8">
        {/* 面包屑导航 */}
        {currentFolderId && (
          <nav className="flex items-center space-x-1 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFolderNavigation(null)}
              className="hover:bg-accent px-2 h-8 rounded-lg text-sm font-medium"
            >
              {collectionName}
            </Button>
          </nav>
        )}
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Lock className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-medium">该文件夹已上锁</p>
          <p className="text-sm mt-1 opacity-50">请输入密码验证后继续访问</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setPasswordDialogOpen(true);
            }}
          >
            输入密码
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pb-8 space-y-8">
      {/* 面包屑导航 */}
      {currentFolderId && !searchResults.length && !inputValue && (
        <nav className="flex items-center space-x-1 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFolderNavigation(null)}
            className={cn(
              "hover:bg-accent px-2 h-8 rounded-lg text-sm font-medium",
              !currentFolderId && "bg-accent"
            )}
          >
            {collectionName}
          </Button>
          {breadcrumbs.length > 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              {breadcrumbs.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFolderNavigation(item.id)}
                    className={cn(
                      "hover:text-muted-foreground hover:bg-accent px-2 h-8 rounded-lg text-sm",
                      currentFolderId === item.id && "text-muted-foreground bg-accent font-medium"
                    )}
                  >
                    {item.name}
                  </Button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </>
          )}
        </nav>
      )}

      {/* 内容区域 */}
      {isSearching ? (
        <div className="space-y-6">
          {/* 搜索加载状态 */}
        </div>
      ) : (
        <div className="space-y-10">
          {/* 搜索结果显示 */}
          {searchResults.length > 0 ? (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                搜索结果
                <span className="text-sm font-normal text-muted-foreground">({totalResults})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                {searchResults.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    title={bookmark.title}
                    url={bookmark.url}
                    description={bookmark.description}
                    icon={bookmark.icon}
                    isFeatured={bookmark.isFeatured}
                  />
                ))}
              </div>
            </div>
          ) : inputValue ? (
            <div className="text-center text-muted-foreground py-16">
              <p className="text-base">未找到相关结果</p>
              <p className="text-sm mt-1 opacity-60">请尝试其他关键词</p>
            </div>
          ) : (
            // 非搜索状态：分层显示
            <>
              {/* 子文件夹区域 */}
              {subfolders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-muted-foreground/60" />
                    <h3 className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wide">
                      文件夹
                    </h3>
                    <span className="text-xs text-muted-foreground/40 font-medium">
                      {subfolders.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                    {subfolders.map((subfolder) => (
                      <FolderCard
                        key={subfolder.id}
                        name={subfolder.name}
                        icon={subfolder.icon}
                        bookmarkCount={subfolder.bookmarkCount}
                        childFolderCount={subfolder.childFolderCount}
                        isPrivate={subfolder.isPrivate}
                        onClick={() => handleFolderNavigation(subfolder.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 书签区域 */}
              {currentBookmarks.length > 0 && (
                <div className="space-y-4">
                  {subfolders.length > 0 && (
                    <div className="h-px bg-border/50 my-6" />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
                    {currentBookmarks.map((bookmark) => (
                      <BookmarkCard
                        key={bookmark.id}
                        title={bookmark.title}
                        url={bookmark.url}
                        description={bookmark.description}
                        icon={bookmark.icon}
                        isFeatured={bookmark.isFeatured}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {subfolders.length === 0 && currentBookmarks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-base font-medium">此文件夹为空</p>
                  <p className="text-sm mt-1 opacity-50">还没有添加任何书签</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 分页 */}
      {searchResults.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg"
          >
            上一页
          </Button>
          <span className="mx-4 text-sm text-muted-foreground">
            第 {currentPage} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg"
          >
            下一页
          </Button>
        </div>
      )}

      {/* 密码验证弹窗 */}
      <PasswordDialog
        folderName={passwordFolderName}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onVerify={handlePasswordVerify}
        onCancel={handlePasswordCancel}
      />
    </div>
  );
}
