"use client";

import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Check, ChevronsUpDown, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Collection {
  id: string;
  name: string;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  displayName?: string;
}

interface UrlInfo {
  title: string;
  description: string;
  icon: string;
  icons: string[];
  error?: string;
}

interface CreateBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCollectionId: string;
  defaultFolderId?: string;
  onSuccess?: () => void;
}

export function CreateBookmarkDialog({
  open,
  onOpenChange,
  defaultCollectionId,
  defaultFolderId,
  onSuccess
}: CreateBookmarkDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    description: "",
    icon: "",
    collectionId: defaultCollectionId,
    folderId: defaultFolderId || "",
    folderName: "",
    isFeatured: false,
    sortOrder: 0
  });

  const [hasLoadedInfo, setHasLoadedInfo] = useState(false);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      collectionId: defaultCollectionId || "",
      folderId: defaultFolderId || ""
    }));
  }, [defaultCollectionId, defaultFolderId]);

  useEffect(() => {
    if (defaultFolderId) {
      const folder = folders.find(f => f.id === defaultFolderId);
      if (folder) {
        setFormData(prev => ({
          ...prev,
          folderName: folder.name
        }));
      }
    }
  }, [defaultFolderId, folders]);

  useEffect(() => {
    if (!open) {
      setHasLoadedInfo(false);
      setError("");
      setFormData({
        title: "",
        url: "",
        description: "",
        icon: "",
        collectionId: defaultCollectionId,
        folderId: defaultFolderId || "",
        folderName: "",
        isFeatured: false,
        sortOrder: 0
      });
    }
  }, [open, defaultCollectionId, defaultFolderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          folderId: formData.folderId === "none" ? null : formData.folderId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "创建书签失败");
        return;
      }

      onOpenChange(false);
      onSuccess?.();
      
      setFormData({
        title: "",
        url: "",
        description: "",
        icon: "",
        collectionId: defaultCollectionId || "",
        folderId: defaultFolderId || "",
        folderName: "",
        isFeatured: false,
        sortOrder: 0
      });
    } catch (error) {
      console.error("Create bookmark failed:", error);
      setError("创建书签失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async (collectionId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/folders?all=true`);
      const data = await response.json();
      
      const folderMap = new Map<string, Folder>(data.map((folder: Folder) => [folder.id, folder]));
      
      const processedFolders = data.map((folder: Folder) => {
        const path: string[] = [];
        let current: Folder | null = folder;
        
        while (current) {
          path.unshift(current.name);
          current = current.parentId ? folderMap.get(current.parentId) || null : null;
        }
        
        return {
          ...folder,
          displayName: path.join(" / ")
        };
      });
      
      setFolders(processedFolders);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  useEffect(() => {
    if (defaultCollectionId) {
      fetchFolders(defaultCollectionId);
    }
  }, [defaultCollectionId]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!defaultCollectionId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建书签</DialogTitle>
          </DialogHeader>
          
          <Alert>
            <AlertDescription>
              请先创建书签合集。
              <Link href="/admin/collections" className="ml-2 text-blue-600 hover:underline">
                去创建
              </Link>
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建书签</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 dark:bg-red-950/30 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>文件夹</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                >
                  {folders.find(f => f.id === formData.folderId)?.displayName || "选择文件夹"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="搜索文件夹..." />
                  <CommandList>
                    <CommandEmpty>未找到文件夹</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFormData(prev => ({ ...prev, folderId: "" }));
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !formData.folderId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>根目录</span>
                      </CommandItem>
                      {folders.map((folder) => (
                        <CommandItem
                          key={folder.id}
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, folderId: folder.id }));
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.folderId === folder.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <Folder className="mr-2 h-4 w-4" />
                          <span>{folder.displayName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>网址</Label>
            <Input
              type="url"
              value={formData.url}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, url: e.target.value }))
              }
              placeholder="https://example.com"
              required
            />
          </div>

          {hasLoadedInfo && (
            <>
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
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError("");
                onOpenChange(false);
              }}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              onClick={async (e) => {
                e.preventDefault();
                
                if (!formData.url) {
                  setError("请输入网址");
                  return;
                }

                if (!isValidUrl(formData.url)) {
                  setError("请输入有效的网址，例如 https://example.com");
                  return;
                }

                if (!hasLoadedInfo) {
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
                    setHasLoadedInfo(true);
                  } catch (error) {
                    console.error("Failed to get URL information:", error);
                    setError(error instanceof Error ? error.message : "获取网址信息失败");
                  } finally {
                    setLoading(false);
                  }
                } else {
                  handleSubmit(e);
                }
              }}
            >
              {loading ? "获取中..." : (hasLoadedInfo ? "创建" : "获取信息")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
