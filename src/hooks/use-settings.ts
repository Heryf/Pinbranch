import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Setting {
  value: any;
  type: string;
  group: string;
  description?: string;
}

// sessionStorage 缓存有效期 10 分钟
const SETTINGS_CACHE_TTL = 10 * 60 * 1000;
const SETTINGS_CACHE_PREFIX = 'pintree_settings_';

function getSettingsCache(cacheKey: string): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${SETTINGS_CACHE_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > SETTINGS_CACHE_TTL) {
      sessionStorage.removeItem(`${SETTINGS_CACHE_PREFIX}${cacheKey}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setSettingsCache(cacheKey: string, data: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${SETTINGS_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // ignore (quota exceeded)
  }
}

export function useSettings(group?: string) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async (force = false) => {
    const cacheKey = group || 'all';

    // 使用缓存（非强制刷新时）
    if (!force) {
      const cached = getSettingsCache(cacheKey);
      if (cached) {
        setSettings(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/settings${group ? `?group=${group}` : ''}`);
      if (!response.ok) throw new Error('Load settings failed');
      const data = await response.json();
      setSettings(data);
      setSettingsCache(cacheKey, data);
    } catch (error) {
      toast.error('Load settings failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    loadSettings
  };
}
