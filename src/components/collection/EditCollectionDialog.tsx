"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EditCollectionDialogProps {
  collection: {
    id: string;
    name: string;
    description: string;
    sortOrder: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
  onUpdate
}: EditCollectionDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description,
    sortOrder: collection.sortOrder,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "更新失败",
          description: data.error || "更新合集失败"
        });
        return;
      }

      onOpenChange(false);
      onUpdate?.();

      toast({
        title: "更新成功",
        description: "书签合集已更新"
      });

      if (window.location.pathname.includes('/admin/bookmarks')) {
        router.push(`/admin/bookmarks?collection=${collection.id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Update failed:", error);
      toast({
        variant: "destructive",
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新合集时发生错误"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑书签合集</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入合集名称"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">排序序号</Label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              placeholder="数字越小排序越靠前"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">数字越小，排序越靠前</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                  ...prev,
                description: e.target.value.slice(0, 140) 
              }))}
              placeholder="输入合集描述"
              rows={3}
              className="resize-none"
              maxLength={140}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
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
