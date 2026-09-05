"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Star,
  ExternalLink,
  Folder,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  Move,
  X,
  Check,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  allFolders: Folder[];
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
  viewCount?: number;
  collectionId: string;
  folderId?: string | null;
};

type BatchStatus = { type: "success" | "error"; message: string } | null;

export function BookmarkDataTable({
  collectionId,
  folders = [],
  allFolders = [],
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<BatchStatus>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string>("root");
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  const tableData: TableItem[] = [
    ...safeFolders.map((folder) => ({
      id: folder.id,
      type: "folder" as const,
      title: folder.name,
      name: folder.name,
      sortOrder: folder.sortOrder,
      parentId: folder.parentId,
      icon: folder.icon,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      collectionId,
    })),
    ...safeBookmarks.map((bookmark) => ({
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
      collectionId: bookmark.collectionId,
      folderId: (bookmark as any).folderId ?? null,
    })),
  ];

  const bookmarkItems = tableData.filter((item) => item.type === "bookmark");
  const selectedBookmarkIds = Array.from(selectedIds).filter((id) =>
    bookmarkItems.some((item) => item.id === id)
  );
  const isAllSelected =
    bookmarkItems.length > 0 && selectedBookmarkIds.length === bookmarkItems.length;
  const isPartialSelected =
    selectedBookmarkIds.length > 0 && selectedBookmarkIds.length < bookmarkItems.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(bookmarkItems.map((item) => item.id));
      setSelectedIds(allIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedBookmarkIds.length === 0) return;
    setIsBatchLoading(true);
    try {
      const response = await fetch("/api/bookmarks/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBookmarkIds }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Batch delete failed");
      }
      setBatchStatus({ type: "success", message: `Successfully deleted ${data.count} bookmarks` });
      setSelectedIds(new Set());
      onBookmarksChange();
    } catch (error) {
      setBatchStatus({
        type: "error",
        message: `Batch delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsBatchLoading(false);
      setIsBatchDeleteOpen(false);
    }
  };

  const handleBatchMove = async () => {
    if (selectedBookmarkIds.length === 0) return;
    setIsBatchLoading(true);
    try {
      const response = await fetch("/api/bookmarks/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedBookmarkIds,
          folderId: targetFolderId === "root" ? null : targetFolderId,
          collectionId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Batch move failed");
      }
      setBatchStatus({ type: "success", message: `Successfully moved ${data.count} bookmarks` });
      setSelectedIds(new Set());
      onBookmarksChange();
    } catch (error) {
      setBatchStatus({
        type: "error",
        message: `Batch move failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsBatchLoading(false);
      setIsBatchMoveOpen(false);
    }
  };

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
      {/* 状态反馈 */}
      {batchStatus && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
            batchStatus.type === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-red-500/10 text-red-600 border border-red-500/20"
          )}
        >
          {batchStatus.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          <span>{batchStatus.message}</span>
          <button
            onClick={() => setBatchStatus(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 批量操作工具栏 */}
      {selectedBookmarkIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium text-primary">
            {selectedBookmarkIds.length} selected
          </span>
          <div className="h-4 w-px bg-primary/20" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={clearSelection}
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setIsBatchMoveOpen(true)}
          >
            <Move className="w-3.5 h-3.5" />
            Batch Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setIsBatchDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Batch Delete
          </Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  className={cn(isPartialSelected && "bg-primary/50")}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all bookmarks"
                />
              </TableHead>
              <TableHead className="w-[18%]">Title</TableHead>
              <TableHead className="w-14">Icon</TableHead>
              <TableHead className="w-[16%]">Icon URL</TableHead>
              <TableHead className="w-[22%]">Description</TableHead>
              <TableHead className="w-20">View Count</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="w-full text-left font-medium"
                  onClick={() => {
                    const newOrder = sortField === "createdAt" && sortOrder === "asc" ? "desc" : "asc";
                    onSortChange("createdAt", newOrder);
                  }}
                >
                  Created At
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="w-full text-left font-medium"
                  onClick={() => {
                    const newOrder = sortField === "updatedAt" && sortOrder === "asc" ? "desc" : "asc";
                    onSortChange("updatedAt", newOrder);
                  }}
                >
                  Updated At
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isBookmark = item.type === "bookmark";
              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    isSelected && "bg-primary/5"
                  )}
                >
                  <TableCell className="w-10">
                    {isBookmark && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    )}
                  </TableCell>
                  <TableCell className="w-[18%]">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === "folder" ? (
                        <Button
                          variant="ghost"
                          className="p-0 hover:bg-transparent max-w-full"
                          onClick={() => onFolderClick(item.id)}
                          title={item.title}
                        >
                          <Folder className="w-4 h-4 mr-2 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </Button>
                      ) : (
                        <>
                          {item.isFeatured && <Star className="w-4 h-4 shrink-0 text-yellow-400" />}
                          <span className="truncate" title={item.title}>{item.title}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-14">
                    {item.type === "bookmark" && item.icon && (
                      <div className="flex items-center justify-center">
                        <img
                          src={item.icon}
                          alt="icon"
                          className="w-8 h-8 rounded-full object-cover border border-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[16%]">
                    <span
                      className="block truncate text-sm text-muted-foreground"
                      title={item.type === "bookmark" ? item.icon || "" : ""}
                    >
                      {item.type === "bookmark" ? item.icon || "-" : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="w-[22%]">
                    <span
                      className="block truncate"
                      title={item.type === "bookmark" ? item.description || "" : ""}
                    >
                      {item.type === "bookmark" ? item.description || "-" : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="w-20">
                    {item.type === "bookmark" ? item.viewCount || 0 : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="w-16">
                    <TableActions item={item} onUpdate={onBookmarksChange} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 批量删除确认对话框 */}
      <Dialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedBookmarkIds.length} bookmarks? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteOpen(false)} disabled={isBatchLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={isBatchLoading}>
              {isBatchLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量移动对话框 */}
      <Dialog open={isBatchMoveOpen} onOpenChange={setIsBatchMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Move Bookmarks</DialogTitle>
            <DialogDescription>
              Select target folder for {selectedBookmarkIds.length} bookmarks
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={targetFolderId} onValueChange={setTargetFolderId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">Root Directory</SelectItem>
                {allFolders
                  .filter((f) => f.id !== currentFolderId)
                  .map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchMoveOpen(false)} disabled={isBatchLoading}>
              Cancel
            </Button>
            <Button onClick={handleBatchMove} disabled={isBatchLoading}>
              {isBatchLoading ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

      let errorMessage = `Delete ${item.type === "folder" ? "folder" : "bookmark"} failed`;

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
      console.error("Delete failed:", error);
      alert(`Delete failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
            Delete
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
            <DialogTitle>
              Delete {item.type === "folder" ? "folder" : "bookmark"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{item.title}&quot; this {item.type === "folder" ? "folder" : "bookmark"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
