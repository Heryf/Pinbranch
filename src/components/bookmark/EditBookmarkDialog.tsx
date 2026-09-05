"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Collection {
  id: string;
  name: string;
}

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
}

interface FolderOption {
  id: string;
  label: string;
}

interface EditBookmarkDialogProps {
  bookmark: {
    id: string;
    title: string;
    url: string;
    description?: string;
    isFeatured: boolean;
    sortOrder?: number;
    collectionId: string;
    folderId?: string | null;
    icon?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface UrlInfo {
  title: string;
  description: string;
  icon: string;
  icons: string[];
  error?: string;
}

export function EditBookmarkDialog({
  bookmark,
  open,
  onOpenChange,
  onSuccess
}: EditBookmarkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [formData, setFormData] = useState({
    title: bookmark.title,
    url: bookmark.url,
    description: bookmark.description || "",
    collectionId: bookmark.collectionId,
    folderId: bookmark.folderId || "none",
    isFeatured: bookmark.isFeatured,
    icon: bookmark.icon || "",
    sortOrder: bookmark.sortOrder ?? 0,
  });
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [folders, setFolders] = useState<FolderNode[]>([]);

  useEffect(() => {
    if (open) {
      fetchCollections();
    }
  }, [open]);

  // 合集变化时加载该合集的全部文件夹（含所有层级）
  useEffect(() => {
    if (open && formData.collectionId) {
      fetchFolders(formData.collectionId);
    }
  }, [open, formData.collectionId]);

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/collections", { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCollections(data);
    } catch (error) {
      console.error("Get collections failed:", error);
      setCollections([]);
    }
  };

  const fetchFolders = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/folders?all=true`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error("Get folders failed:", error);
      setFolders([]);
    }
  };

  // 将文件夹树按层级展平，用缩进 + 前缀表示层级
  const folderOptions = useMemo<FolderOption[]>(() => {
    const byParent = new Map<string | null, FolderNode[]>();
    folders.forEach((f) => {
      const key = f.parentId || null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(f);
    });

    const result: FolderOption[] = [];
    const walk = (parent: string | null, depth: number) => {
      (byParent.get(parent) || []).forEach((f) => {
        const indent = "\u00A0\u00A0\u00A0\u00A0".repeat(depth);
        const prefix = depth > 0 ? "└ " : "";
        result.push({ id: f.id, label: `${indent}${prefix}${f.name}` });
        walk(f.id, depth + 1);
      });
    };
    walk(null, 0);
    return result;
  }, [folders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/bookmarks/${bookmark.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          folderId: formData.folderId === "none" ? null : formData.folderId,
          icon: formData.icon || null,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error;
        } catch {
          errorMessage = errorText || `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update bookmark failed:", error);
      setError(error instanceof Error ? error.message : "更新书签失败");
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleGetInfo = async () => {
    if (!formData.url) {
      setError("请输入网址");
      return;
    }

    if (!isValidUrl(formData.url)) {
      setError("请输入有效的网址，例如 https://example.com");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/url-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formData.url }),
      });
      
      const data: UrlInfo = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "获取网址信息失败");
      }
      
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        icon: data.icon || prev.icon,
      }));
      setAvailableIcons(data.icons || []);
    } catch (error) {
      console.error("Failed to get URL information:", error);
      setError(error instanceof Error ? error.message : "获取网址信息失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑书签</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-950/30 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>所属合集</Label>
            <Select
              value={formData.collectionId}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, collectionId: value, folderId: "none" }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择合集" />
              </SelectTrigger>
              <SelectContent>
                {collections?.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>所属文件夹</Label>
            <Select
              value={formData.folderId}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, folderId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">根目录（不放入文件夹）</SelectItem>
                {folderOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">可选任意层级的子文件夹，切换合集后需重新选择</p>
          </div>

          <div className="space-y-2">
            <Label>网址</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGetInfo}
                disabled={loading}
              >
                {loading ? "获取中..." : "获取信息"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>标题</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>图标地址</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="url"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, icon: e.target.value }))
                  }
                />
              </div>
              {formData.icon && (
                <div className="flex items-center">
                  <img
                    src={formData.icon}
                    alt="图标预览"
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            {availableIcons.length > 0 && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground">选择图标</Label>
                <div className="grid grid-cols-6 gap-2 mt-1">
                  {availableIcons.map((iconUrl, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`p-2 border rounded hover:bg-muted ${
                        formData.icon === iconUrl ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, icon: iconUrl }))}
                    >
                      <img
                        src={iconUrl}
                        alt={`图标 ${index + 1}`}
                        className="w-6 h-6 object-contain mx-auto"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isFeatured}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isFeatured: checked }))
              }
            />
            <Label>精选书签</Label>
          </div>

          <div className="space-y-2">
            <Label>排序号</Label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))
              }
              placeholder="数字越小越靠前"
            />
            <p className="text-xs text-muted-foreground">数字越小排序越靠前，默认 0</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
