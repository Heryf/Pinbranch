"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const STORAGE_KEY = "pintree-theme";

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore (e.g., private mode, quota exceeded)
  }
};

const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 内联脚本已在 layout.tsx 中同步设置了 class，这里只需同步 state
    const stored = safeGetItem(STORAGE_KEY) as Theme;
    // 如果 localStorage 读取失败（隐私模式），保持默认 dark，不降级为系统偏好
    const initialTheme: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    safeSetItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    // 以 DOM class 为唯一事实来源，点击瞬间同步算出目标主题，立即响应
    const next: Theme = root.classList.contains("dark") ? "light" : "dark";
    const apply = () => {
      if (next === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      setTheme(next);
    };
    // 优先使用 View Transitions API：旧画面快照与新画面在合成器层交叉淡入淡出，
    // 全页元素颜色同步平滑过渡，重绘不阻塞交互（Chrome/Edge/夸克均支持）
    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof doc.startViewTransition === "function" && !reduceMotion) {
      doc.startViewTransition(apply);
    } else {
      // 降级：直接同步切换 class，浏览器单次重绘完成，瞬时无延迟
      apply();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
