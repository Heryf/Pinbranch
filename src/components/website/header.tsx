"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Plus, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CreateBookmarkDialogGlobal from "@/components/bookmark/CreateBookmarkDialogGlobal";

interface HeaderProps {
  selectedCollectionId?: string;
  currentFolderId?: string | null;
  onBookmarkAdded?: () => void;
  onNavigateToFolder?: (folderId: string | null) => void;
}

export function Header({
  selectedCollectionId,
  currentFolderId,
  onBookmarkAdded,
  onNavigateToFolder
}: HeaderProps) {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSuccess = async (newBookmarkFolderId?: string) => {
    setDialogOpen(false);

    if (
      (newBookmarkFolderId && newBookmarkFolderId === currentFolderId) ||
      (!newBookmarkFolderId && !currentFolderId)
    ) {
      if (onBookmarkAdded) {
        await onBookmarkAdded();
      }
    }

    const targetFolderId = newBookmarkFolderId || currentFolderId;

    // 切到目标文件夹：SPA 纯客户端切换，不修改 URL
    if (targetFolderId && targetFolderId !== currentFolderId) {
      if (onNavigateToFolder) {
        onNavigateToFolder(targetFolderId);
      }
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
      {/* 左侧：SidebarTrigger */}
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-4" />
      </div>
      
      {/* 中间：标题区域 - 留空，由 sidebar 显示网站名称 */}
      <div className="flex items-center justify-center flex-1">
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {session && (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              新建书签
            </Button>
          </>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/collections" aria-label="Admin">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <CreateBookmarkDialogGlobal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCollectionId={selectedCollectionId || ""}
        defaultFolderId={currentFolderId || undefined}
        onSuccess={handleSuccess}
      />
    </header>
  );
}
