"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingImages } from "@/hooks/useSettingImages";
import { useSettings } from "@/hooks/use-settings";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface Collection {
  id: string;
  name: string;
  isPublic: boolean;
  slug: string;
}

interface FolderNode {
  id: string;
  name: string;
  icon?: string;
  level: number;
  children: FolderNode[];
}

interface WebsiteSidebarProps {
  onFolderSelect?: (folderId: string | null) => void;
  onCollectionChange?: (collectionId: string, slug: string) => void;
  selectedCollectionId: string;
  currentFolderId: string | null;
}

export function WebsiteSidebar({
  onFolderSelect,
  onCollectionChange,
  selectedCollectionId,
  currentFolderId,
}: WebsiteSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionFolders, setCollectionFolders] = useState<Map<string, any[]>>(new Map());
  const [collectionFolderTrees, setCollectionFolderTrees] = useState<Map<string, FolderNode[]>>(new Map());
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const { images, isLoading } = useSettingImages("logoUrl");
  const { settings } = useSettings("basic");
  const websiteName = settings?.websiteName || "PinTree";

  // 获取书签集合列表
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/collections?publicOnly=true");
        const data = await response.json();

        if (!Array.isArray(data)) {
          console.error("API returned data format is incorrect");
          setCollections([]);
          return;
        }

        setCollections(data);

        // 如果有公开的书签集合且没有选中的集合，选择第一个
        if (data.length > 0 && !selectedCollectionId) {
          const firstCollection = data[0];
          if (onCollectionChange) {
            onCollectionChange(firstCollection.id, firstCollection.slug);
          }
        }
      } catch (error) {
        console.error("Get bookmark collection failed:", error);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);

  // 获取所有合集的文件夹（用于左侧树形展示）
  useEffect(() => {
    const fetchAllFolders = async () => {
      const newCollectionFolders = new Map<string, any[]>();
      const newCollectionFolderTrees = new Map<string, FolderNode[]>();

      for (const collection of collections) {
        try {
          const response = await fetch(`/api/collections/${collection.id}/folders?all=true`);
          const data = await response.json();
          newCollectionFolders.set(collection.id, data);
          newCollectionFolderTrees.set(collection.id, buildFolderTree(data));
        } catch (error) {
          console.error(`Get folders for collection ${collection.id} failed:`, error);
        }
      }

      setCollectionFolders(newCollectionFolders);
      setCollectionFolderTrees(newCollectionFolderTrees);
    };

    if (collections.length > 0) {
      fetchAllFolders();
    }
  }, [collections]);

  // 当选中合集变化时，自动展开该合集
  useEffect(() => {
    if (selectedCollectionId) {
      setExpandedCollections((prev) => {
        const next = new Set(prev);
        next.add(selectedCollectionId);
        return next;
      });
    }
  }, [selectedCollectionId]);

  // 当当前文件夹变化时，展开其父文件夹
  useEffect(() => {
    if (currentFolderId && selectedCollectionId) {
      const folders = collectionFolders.get(selectedCollectionId) || [];
      const expandParentFolders = (folderId: string) => {
        const folder = folders.find((f) => f.id === folderId);
        if (folder && folder.parentId) {
          setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.add(folder.parentId);
            return next;
          });
          expandParentFolders(folder.parentId);
        }
      };
      expandParentFolders(currentFolderId);
    }
  }, [currentFolderId, selectedCollectionId, collectionFolders]);

  const buildFolderTree = (folders: any[]): FolderNode[] => {
    const folderMap = new Map();

    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        level: 0,
      });
    });

    const calculateLevel = (folderId: string, visited = new Set<string>()): number => {
      if (visited.has(folderId)) return 0;
      const folder = folderMap.get(folderId);
      if (!folder) return 0;
      if (folder.level !== 0) return folder.level;
      visited.add(folderId);
      if (!folder.parentId) {
        folder.level = 0;
      } else {
        folder.level = calculateLevel(folder.parentId, visited) + 1;
      }
      visited.delete(folderId);
      return folder.level;
    };

    folders.forEach((folder) => calculateLevel(folder.id));

    const rootFolders: FolderNode[] = [];
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id);
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(node);
        } else {
          rootFolders.push(node);
        }
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  };

  // 切换合集展开/折叠
  const toggleCollection = (collectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  // 切换文件夹展开/折叠
  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // 点击合集：右侧切换到该合集根目录
  const handleCollectionSelect = (collection: Collection) => {
    if (onCollectionChange) {
      onCollectionChange(collection.id, collection.slug);
    } else {
      const currentSearchParams = new URLSearchParams();
      currentSearchParams.set("collection", collection.slug);
      router.push(`${pathname}?${currentSearchParams.toString()}`, { scroll: false });
    }
  };

  // 点击文件夹：右侧切换到该文件夹
  const handleFolderSelect = (folderId: string, collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const currentSearchParams = new URLSearchParams();
    currentSearchParams.set("collection", collection.slug);
    currentSearchParams.set("folderId", folderId);
    router.push(`${pathname}?${currentSearchParams.toString()}`, { scroll: false });
  };

  // 渲染文件夹树
  const renderFolderTree = (folders: FolderNode[], collectionId: string) => {
    return folders.map((folder) => (
      <div key={folder.id}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => handleFolderSelect(folder.id, collectionId)}
            className={cn(
              "flex items-center w-full rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent/80",
              currentFolderId === folder.id && selectedCollectionId === collectionId
                ? "bg-sidebar-accent text-primary font-medium"
                : ""
            )}
            style={{
              paddingLeft: `${folder.level * 14 + 10}px`,
            }}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0 py-1">
              {folder.children.length > 0 ? (
                <div
                  onClick={(e) => toggleFolder(folder.id, e)}
                  className="shrink-0 p-0.5 rounded hover:bg-sidebar-accent cursor-pointer transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-200 ease-out",
                      expandedFolders.has(folder.id) && "rotate-90"
                    )}
                  />
                </div>
              ) : (
                <div className="w-4 shrink-0" />
              )}
              <div className="shrink-0">
                {expandedFolders.has(folder.id) ? (
                  <FolderOpen
                    className={cn(
                      "h-3.5 w-3.5 fill-current transition-colors duration-200",
                      currentFolderId === folder.id && selectedCollectionId === collectionId
                        ? "text-primary"
                        : "text-muted-foreground/70"
                    )}
                  />
                ) : (
                  <Folder
                    className={cn(
                      "h-3.5 w-3.5 fill-current transition-colors duration-200",
                      currentFolderId === folder.id && selectedCollectionId === collectionId
                        ? "text-primary"
                        : "text-muted-foreground/70"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "truncate text-[13px] leading-5",
                  currentFolderId === folder.id && selectedCollectionId === collectionId
                    ? "text-primary font-medium"
                    : "text-foreground/90"
                )}
              >
                {folder.name}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* 子文件夹展开动画 */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            expandedFolders.has(folder.id) && folder.children.length > 0
              ? "max-h-[1000px] opacity-100"
              : "max-h-0 opacity-0"
          )}
        >
          {renderFolderTree(folder.children, collectionId)}
        </div>
      </div>
    ));
  };

  const SidebarSkeleton = () => {
    return (
      <div className="space-y-3 p-3">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Sidebar className="flex flex-col h-screen bg-sidebar border-r border-border/40">
      <SidebarHeader className="flex-shrink-0 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            {loading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <SidebarMenuButton
                size="lg"
                asChild
                className="hover:bg-transparent rounded-lg pr-0"
              >
                <Link
                  href="/"
                  className="pl-2 flex items-center gap-2.5 justify-start rounded-lg pr-0 w-full h-[44px]"
                >
                  {isLoading ? (
                    <Skeleton className="w-8 h-8 rounded-lg" />
                  ) : (
                    <Image
                      src={images?.[0]?.url || "/logo.svg"}
                      alt="Logo"
                      width={32}
                      height={32}
                      className="rounded-lg object-contain"
                    />
                  )}
                  <span className="text-base font-bold text-foreground tracking-tight">
                    {websiteName}
                  </span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <div className="mx-3 h-px bg-border/40" />

      <SidebarContent className="flex-1 min-h-0 overflow-y-auto hide-scrollbar px-2 py-3">
        <SidebarGroup className="space-y-1">
          {/* 合集列表标题 */}
          <div className="px-2.5 pb-2">
            <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
              书签合集
            </span>
          </div>

          <SidebarMenu className="space-y-0.5">
            {loading ? (
              <SidebarSkeleton />
            ) : (
              collections.map((collection) => {
                const folderTree = collectionFolderTrees.get(collection.id) || [];
                const isExpanded = expandedCollections.has(collection.id);
                const isSelected = selectedCollectionId === collection.id && !currentFolderId;

                return (
                  <div key={collection.id} className="space-y-0.5">
                    {/* 合集项 */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => handleCollectionSelect(collection)}
                        className={cn(
                          "flex items-center w-full rounded-lg transition-all duration-200",
                          "hover:bg-sidebar-accent/80",
                          isSelected
                            ? "bg-sidebar-accent text-primary font-medium"
                            : ""
                        )}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 py-1">
                          <div
                            onClick={(e) => toggleCollection(collection.id, e)}
                            className="shrink-0 p-0.5 rounded hover:bg-sidebar-accent cursor-pointer transition-colors"
                          >
                            <ChevronRight
                              className={cn(
                                "h-3 w-3 transition-transform duration-200 ease-out",
                                isExpanded && "rotate-90"
                              )}
                            />
                          </div>
                          <Folder
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 fill-current transition-colors duration-200",
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            )}
                          />
                          <span
                            className={cn(
                              "truncate text-[13px] leading-5",
                              isSelected
                                ? "text-primary font-medium"
                                : "text-foreground/90"
                            )}
                          >
                            {collection.name}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* 合集的文件夹树 - 带动画 */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-out",
                        isExpanded && folderTree.length > 0
                          ? "max-h-[2000px] opacity-100"
                          : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="pt-0.5">
                        {renderFolderTree(folderTree, collection.id)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
