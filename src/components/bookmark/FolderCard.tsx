"use client";

import { useState, useId, memo } from "react";
import { Folder, Lock } from "lucide-react";

interface FolderCardProps {
  name: string;
  icon?: string;
  bookmarkCount?: number;
  childFolderCount?: number;
  isPrivate?: boolean;
  onClick: () => void;
}

function FolderCardInner({
  name,
  icon,
  bookmarkCount = 0,
  childFolderCount = 0,
  isPrivate = false,
  onClick,
}: FolderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  // 生成唯一的 SVG id，避免多个 FolderCard 之间的渐变定义冲突
  const uniqueId = useId().replace(/:/g, "_");

  // 格式化计数显示
  const getCountText = () => {
    const parts = [];
    if (isPrivate) parts.push("已上锁");
    if (childFolderCount > 0) parts.push(`${childFolderCount} 个文件夹`);
    if (bookmarkCount > 0) parts.push(`${bookmarkCount} 个书签`);
    if (parts.length === 0) return "空文件夹";
    return parts.join(" · ");
  };

  const folderBodyId = `folderBody_${uniqueId}`;
  const folderTabId = `folderTab_${uniqueId}`;
  const paperShadowId = `paperShadow_${uniqueId}`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col items-center gap-3 w-full text-left transition-all duration-300 ease-out"
    >
      {/* 文件夹图标 - 精致SVG设计 */}
      <div className="relative w-full aspect-[4/3] max-w-[140px]">
        <svg
          viewBox="0 0 140 100"
          className="w-full h-full drop-shadow-md transition-all duration-300"
          style={{
            filter: isHovered
              ? "drop-shadow(0 8px 16px rgba(0,0,0,0.15)) drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.08))",
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 文件夹主体渐变 */}
            <linearGradient id={folderBodyId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isHovered ? "#34d399" : "#6ee7b7"} />
              <stop offset="100%" stopColor={isHovered ? "#059669" : "#10b981"} />
            </linearGradient>
            {/* 文件夹盖子渐变 */}
            <linearGradient id={folderTabId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isHovered ? "#4b5563" : "#6b7280"} />
              <stop offset="100%" stopColor={isHovered ? "#374151" : "#4b5563"} />
            </linearGradient>
            {/* 纸张阴影 */}
            <filter id={paperShadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* 文件夹后层（主体） */}
          <rect
            x="12"
            y="28"
            width="116"
            height="64"
            rx="10"
            fill={`url(#${folderBodyId})`}
            className="transition-all duration-300"
          />

          {/* 文件夹底部圆角遮罩 - 确保只有底部圆角 */}
          <rect
            x="12"
            y="28"
            width="116"
            height="14"
            fill={`url(#${folderBodyId})`}
            className="transition-all duration-300"
          />

          {/* 文件夹 tab（标签页） */}
          <path
            d="M12 32 C12 25.37 17.37 20 24 20 L52 20 L62 12 L108 12 C114.63 12 120 17.37 120 24 L120 32 Z"
            fill={`url(#${folderTabId})`}
            className="transition-all duration-300"
          />

          {/* tab 高光 */}
          <path
            d="M14 30 C14 25.58 18.58 22 24 22 L52 22 L61 14 L108 14 C113.42 14 118 18.58 118 24 L118 30"
            stroke="white"
            strokeWidth="1"
            opacity="0.15"
            fill="none"
            className="transition-all duration-300"
          />

          {/* 文件夹前盖（盖子主体） */}
          <rect
            x="12"
            y="24"
            width="116"
            height="68"
            rx="10"
            fill={`url(#${folderBodyId})`}
            opacity={isHovered ? "0.3" : "1"}
            className="transition-all duration-500 ease-out"
          />

          {/* 前盖底部圆角遮罩 */}
          <rect
            x="12"
            y="24"
            width="116"
            height="14"
            fill={`url(#${folderBodyId})`}
            opacity={isHovered ? "0.3" : "1"}
            className="transition-all duration-500 ease-out"
          />

          {/* 盖子顶部高光线条 */}
          <rect
            x="22"
            y="30"
            width="50"
            height="2"
            rx="1"
            fill="white"
            opacity={isHovered ? "0.1" : "0.35"}
            className="transition-all duration-300"
          />

          {/* 纸张组 - hover时展开 */}
          <g
            className="transition-all duration-500 ease-out"
            style={{
              transform: isHovered ? "translateY(-8px)" : "translateY(0)",
              transformOrigin: "70px 60px",
            }}
          >
            {/* 底层纸张 */}
            <rect
              x="22"
              y={isHovered ? "14" : "32"}
              width="96"
              height="60"
              rx="6"
              fill="#f9fafb"
              opacity={isHovered ? "0.7" : "0"}
              className="transition-all duration-500 ease-out"
              style={{
                transform: isHovered ? "rotate(-2deg)" : "rotate(0deg)",
                transformOrigin: "70px 60px",
              }}
            />

            {/* 中层纸张 */}
            <rect
              x="24"
              y={isHovered ? "10" : "32"}
              width="92"
              height="58"
              rx="5"
              fill="#f3f4f6"
              opacity={isHovered ? "0.85" : "0"}
              className="transition-all duration-500 ease-out"
              style={{
                transform: isHovered ? "rotate(1deg)" : "rotate(0deg)",
                transformOrigin: "70px 60px",
              }}
            />

            {/* 顶层纸张 */}
            <rect
              x="26"
              y={isHovered ? "6" : "32"}
              width="88"
              height="56"
              rx="5"
              fill="white"
              opacity={isHovered ? "0.95" : "0"}
              filter={`url(#${paperShadowId})`}
              className="transition-all duration-500 ease-out"
            />

            {/* 顶层纸张上的内容横线 */}
            <rect
              x="34"
              y={isHovered ? "18" : "40"}
              width="28"
              height="2.5"
              rx="1.25"
              fill="#10b981"
              opacity={isHovered ? "0.6" : "0"}
              className="transition-all duration-500 ease-out"
            />
            <rect
              x="34"
              y={isHovered ? "26" : "48"}
              width="44"
              height="2"
              rx="1"
              fill="#d1d5db"
              opacity={isHovered ? "0.5" : "0"}
              className="transition-all duration-500 ease-out"
            />
            <rect
              x="34"
              y={isHovered ? "34" : "56"}
              width="36"
              height="2"
              rx="1"
              fill="#d1d5db"
              opacity={isHovered ? "0.5" : "0"}
              className="transition-all duration-500 ease-out"
            />
            <rect
              x="34"
              y={isHovered ? "42" : "64"}
              width="24"
              height="2"
              rx="1"
              fill="#d1d5db"
              opacity={isHovered ? "0.35" : "0"}
              className="transition-all duration-500 ease-out"
            />
          </g>
        </svg>
      </div>

      {/* 文件夹名称和统计 */}
      <div className="flex flex-col items-center text-center gap-1">
        <span
          className="text-sm font-semibold text-foreground truncate max-w-[130px] transition-colors duration-300 group-hover:text-primary flex items-center gap-1"
          title={name}
        >
          {isPrivate && (
            <Lock className="h-3 w-3 text-amber-500 shrink-0" />
          )}
          {name}
        </span>
        <span className="text-xs text-muted-foreground/80 leading-relaxed">
          {getCountText()}
        </span>
      </div>
    </button>
  );
}

// 使用 memo 避免不必要的重渲染，提升性能
export const FolderCard = memo(FolderCardInner);
FolderCard.displayName = "FolderCard";
