"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  icon?: string;
  isPublic: boolean;
  password?: string;
  sortOrder: number;
  parentId?: string | null;
}

interface EditFolderDialogProps {
  folder: Folder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  collectionId: string;
}

export function EditFolderDialog({
  folder,
  open,
  onOpenChange,
  onSuccess,
  collectionId
}: EditFolderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const initialFormData = {
    name: "",
    icon: "",
    isPrivate: false,
    password: "",
    sortOrder: 0,
    parentId: "root"
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (collectionId) {
      fetchFolders();
    }
  }, [collectionId]);

  useEffect(() => {
    if (folder && open) {
      // 数据库中 isPublic=true 表示公开；isPublic=false 表示私密
      // 前端 UI：isPrivate=true 表示启用密码保护（对应 isPublic=false）
      setFormData({
        name: folder.name || "",
        icon: folder.icon || "",
        isPrivate: !folder.isPublic,
        password: folder.password || "",
        sortOrder: typeof folder.sortOrder === 'number' ? folder.sortOrder : 0,
        parentId: folder.parentId || "root",
      });
    }
  }, [folder, open]);

  const fetchFolders = async () => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/folders`);
      const data = await response.json();
      setFolders(data.filter((f: Folder) => f.id !== folder.id));
    } catch (error) {
      console.error("Failed to get folders:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 当启用私密访问时，isPublic=false；否则 isPublic=true
      const isPublic = !formData.isPrivate;
      // 当关闭私密访问时，清除密码
      const password = formData.isPrivate ? formData.password : null;

      const response = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon,
          isPublic,
          password,
          sortOrder: formData.sortOrder,
          parentId: formData.parentId === "root" ? null : formData.parentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `更新文件夹失败: ${response.status}`);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update folder failed:", error);
      alert(error instanceof Error ? error.message : "更新文件夹失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑文件夹</DialogTitle>
          <DialogDescription>
            修改文件夹属性和设置
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>图标地址</Label>
            <Input
              value={formData.icon}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, icon: e.target.value }))
              }
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="space-y-2">
            <Label>排序序号</Label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) }))
              }
            />
            <p className="text-xs text-muted-foreground">数字越小，排序越靠前</p>
          </div>

          {/* 私密访问开关 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label>私密访问</Label>
              </div>
              <Switch
                checked={formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPrivate: checked }))
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.isPrivate 
                ? "启用后，访问该文件夹需要输入密码验证" 
                : "关闭后，文件夹可正常公开访问"}
            </p>
          </div>

          {/* 密码输入框 - 仅当启用私密访问时显示 */}
          {formData.isPrivate && (
            <div className="space-y-2">
              <Label>访问密码</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={folder.password ? "已设置密码，留空保持不变" : "设置访问密码"}
              />
              <p className="text-xs text-muted-foreground">
                {folder.password ? "留空则保持原有密码不变" : "设置密码后，访问该文件夹需输入密码验证"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>父文件夹</Label>
            <Select
              value={formData.parentId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, parentId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择父文件夹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">根目录</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
