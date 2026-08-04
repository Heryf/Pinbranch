"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Star, Folder, ArrowUpDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditBookmarkDialog } from "./EditBookmarkDialog";
import { EditFolderDialog } from "@/components/folder/EditFolderDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  isFeatured: boolean;
  sortOrder: number;
  viewCount: number;
  collectionId: string;
  folderId?: string;
  folder?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  parentId: string | null;
}

interface BookmarkDataTableProps {
  collectionId: string;
  folders: Folder[];
  bookmarks: {
    currentBookmarks: Bookmark[];
    subfolders: any[];
  };
  currentFolderId?: string;
  onFolderClick: (folderId: string) => void;
  onBookmarksChange: () => void;
  loading?: boolean;
  isNavigating?: boolean;
  sortField: "createdAt" | "updatedAt";
  sortOrder: "asc" | "desc";
  onSortChange: (field: "createdAt" | "updatedAt", order: "asc" | "desc") => void;
}

type TableItem = {
  id: string;
  type: "folder" | "bookmark";
  title: string;
  url?: string;
  icon?: string;
  description?: string;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  folder?: {
    name: string;
  };
  collectionId: string;
};

export function BookmarkDataTable({
  collectionId,
  folders = [],
  bookmarks = { currentBookmarks: [], subfolders: [] },
  currentFolderId,
  onFolderClick,
  onBookmarksChange,
  loading,
  isNavigating = false,
  sortField,
  sortOrder,
  onSortChange,
}: BookmarkDataTableProps) {
  const currentBookmarks = bookmarks?.currentBookmarks || [];
  const safeBookmarks = Array.isArray(currentBookmarks) ? currentBookmarks : [];
  const safeFolders = Array.isArray(folders) ? folders : [];

  const tableData = [
    ...safeFolders.map(folder => ({
      id: folder.id,
      type: "folder" as const,
      title: folder.name,
      name: folder.name,
      sortOrder: folder.sortOrder,
      parentId: folder.parentId,
      icon: folder.icon,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      collectionId
    })),
    ...safeBookmarks.map(bookmark => ({
      id: bookmark.id,
      type: "bookmark" as const,
      title: bookmark.title,
      url: bookmark.url,
      icon: bookmark.icon,
      description: bookmark.description,
      isFeatured: bookmark.isFeatured,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
      viewCount: bookmark.viewCount,
      collectionId: bookmark.collectionId
    }))
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Skeleton className="h-12 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isNavigating) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-center">类型</TableHead>
                <TableHead className="w-[200px]">标题</TableHead>
                <TableHead className="w-[80px] text-center">图标</TableHead>
                <TableHead className="w-[300px] max-w-[300px]">描述</TableHead>
                <TableHead className="w-[80px] text-center">精选</TableHead>
                <TableHead className="w-[100px] text-center">访问量</TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-left font-medium"
                    onClick={() => {
                      const newOrder = sortField === "createdAt" && sortOrder === "asc" ? "desc" : "asc";
                      onSortChange("createdAt", newOrder);
                    }}
                  >
                    创建时间
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-left font-medium"
                    onClick={() => {
                      const newOrder = sortField === "updatedAt" && sortOrder === "asc" ? "desc" : "asc";
                      onSortChange("updatedAt", newOrder);
                    }}
                  >
                    更新时间
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[80px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  {/* 类型 */}
                  <TableCell className="text-center">
                    {item.type === "folder" ? (
                      <Folder className="w-4 h-4 mx-auto text-primary" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mx-auto text-muted-foreground" />
                    )}
                  </TableCell>

                  {/* 标题 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.type === "folder" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto hover:bg-transparent font-medium text-foreground"
                          onClick={() => onFolderClick(item.id)}
                        >
                          {item.title}
                        </Button>
                      ) : (
                        <span className="font-medium text-foreground truncate max-w-[180px] block">
                          {item.title}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* 图标 */}
                  <TableCell className="text-center">
                    {item.type === "bookmark" && item.icon ? (
                      <img
                        src={item.icon}
                        alt="icon"
                        className="w-6 h-6 rounded object-cover border border-border mx-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>

                  {/* 描述 - 限制宽度 */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[280px] block" title={item.type === "bookmark" ? item.description || '' : ''}>
                      {item.type === "bookmark" ? (item.description || '-') : '-'}
                    </span>
                  </TableCell>

                  {/* 精选 */}
                  <TableCell className="text-center">
                    {item.type === "bookmark" && item.isFeatured ? (
                      <Star className="w-4 h-4 text-yellow-400 mx-auto fill-yellow-400" />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>

                  {/* 访问量 */}
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {item.type === "bookmark" ? item.viewCount || 0 : '-'}
                    </span>
                  </TableCell>

                  {/* 创建时间 */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </TableCell>

                  {/* 更新时间 */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell className="text-center">
                    <TableActions item={item} onUpdate={onBookmarksChange} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function TableActions({ item, onUpdate }: { item: TableItem; onUpdate: () => void }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const endpoint = item.type === "folder" ? "folders" : "bookmarks";
      const response = await fetch(`/api/${endpoint}/${item.id}`, {
        method: "DELETE",
      });

      let errorMessage = `删除${item.type === "folder" ? "文件夹" : "书签"}失败`;

      if (!response.ok) {
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      onUpdate();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("删除失败:", error);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
            编辑
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-600"
          >
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 编辑对话框 */}
      {item.type === "folder" ? (
        <EditFolderDialog
          folder={item as any}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={onUpdate}
          collectionId={item.collectionId}
        />
      ) : (
        <EditBookmarkDialog
          bookmark={item as any}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={onUpdate}
        />
      )}

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除{item.type === "folder" ? "文件夹" : "书签"}</DialogTitle>
            <DialogDescription>
              确定要删除 "{item.title}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
