"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Library, BookOpen, Lock, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isPublic: boolean;
  sortOrder: number;
  totalBookmarks: number;
  viewCount: number;
  viewStyle?: "list" | "card";
}

interface CollectionGridProps {
  onSelect?: (slug: string) => void;
  className?: string;
}

// 单个合集卡片 - memo 优化重渲染
const CollectionGridCard = memo(function CollectionGridCard({
  collection,
  onSelect
}: {
  collection: Collection;
  onSelect?: (slug: string) => void;
}) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(collection.slug);
    } else {
      router.push(`/?collection=${collection.slug}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col items-center text-left gap-3 p-5 rounded-2xl",
        "bg-card border border-border hover:border-primary/40",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10",
        "focus:outline-none focus:ring-2 focus:ring-primary/40"
      )}
    >
      {/* 图标 */}
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 group-hover:scale-105">
        {collection.icon && !imgError ? (
          <img
            src={collection.icon}
            alt={collection.name}
            className="w-10 h-10 object-contain"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <Library className="w-7 h-7 text-primary/60" />
        )}
      </div>

      {/* 名称 */}
      <div className="flex flex-col items-center w-full min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate max-w-full group-hover:text-primary transition-colors">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="text-xs text-muted-foreground/70 line-clamp-1 max-w-full mt-1">
            {collection.description}
          </p>
        )}
      </div>

      {/* 统计 + 状态 */}
      <div className="flex items-center gap-2 text-[11px]">
        {collection.isPublic ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <BookOpen className="w-3 h-3" />
            公开
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="w-3 h-3" />
            私密
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-muted-foreground/70">
          <Hash className="w-3 h-3" />
          {collection.totalBookmarks}
        </span>
      </div>
    </button>
  );
});

export function CollectionGrid({ onSelect, className }: CollectionGridProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/collections?publicOnly=true");
      if (!response.ok) throw new Error('Failed to load collections');
      const data = await response.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5", className)}>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-[180px] rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>{error}</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Library className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-base">暂无公开书签集</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5", className)}>
      {collections.map(collection => (
        <CollectionGridCard
          key={collection.id}
          collection={collection}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
