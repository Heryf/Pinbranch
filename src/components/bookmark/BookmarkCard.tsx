"use client";

import Image from 'next/image'
import { useState } from 'react'
import { Folder, ExternalLink } from 'lucide-react'

interface BookmarkCardProps {
  title: string
  url: string
  icon?: string
  description?: string
  isFeatured?: boolean
  collection?: {
    name: string
    slug: string
  }
  folder?: {
    name: string
  }
}

export function BookmarkCard({
  title,
  url,
  icon,
  description,
  isFeatured = false,
  collection,
  folder
}: BookmarkCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const defaultIcon = '/assets/default-icon.svg'

  // 清理 URL 显示，移除 http(s) 和尾部斜杠
  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div
      onClick={() => window.open(url, '_blank')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        cursor-pointer flex items-center transition-all duration-300 ease-out p-4
        bg-card/60 border border-border/60
        rounded-xl hover:bg-card hover:border-border
        hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5
        ${isFeatured ? 'border-2 border-primary/60 ring-1 ring-primary/20' : ''}
      `}
    >
      <div className="relative w-9 h-9 mr-3.5 flex-shrink-0">
        <Image
          src={imageError ? defaultIcon : (icon || defaultIcon)}
          alt={title}
          fill
          className="rounded-lg object-cover transition-transform duration-300"
          style={{
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          }}
          onError={() => setImageError(true)}
          priority={isFeatured}
        />
        {/* 图标悬停时显示外部链接指示 */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <ExternalLink className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="flex flex-col overflow-hidden flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold mb-0.5 truncate text-foreground transition-colors duration-300">
            {title}
          </h2>
          {isFeatured && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary shrink-0">
              精选
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground/80 mb-1 line-clamp-1 leading-relaxed">
            {description}
          </p>
        )}

        <p className="text-xs text-muted-foreground/60 truncate leading-relaxed">
          {cleanUrl}
        </p>

        {(collection || folder) && (
          <div className="mt-1.5 text-[11px] text-muted-foreground/50 flex items-center">
            {collection && (
              <span className="inline-flex items-center">
                {collection.name}
              </span>
            )}
            {folder && (
              <>
                <span className="mx-1 opacity-50">/</span>
                <span className="inline-flex items-center">
                  <Folder className="w-3 h-3 mr-0.5 opacity-60" />
                  {folder.name}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
