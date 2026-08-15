import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Setting {
  value: any;
  type: string;
  group: string;
  description?: string;
}

// sessionStorage 缓存有效期 30 秒（缩短 TTL，确保后台修改尽快生效）
const SETTINGS_CACHE_TTL = 30 * 1000;
const SETTINGS_CACHE_PREFIX = 'pintree_settings_';
// SWR 后台刷新触发的事件
const SETTINGS_UPDATED_EVENT = 'pintree-settings-updated';

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

function clearSettingsCache() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SETTINGS_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// 主动通知其他组件/标签页设置已更新
export function notifySettingsUpdated() {
  if (typeof window === 'undefined') return;
  try {
    clearSettingsCache();
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
    // 同时通过 storage 事件通知其他标签页
    sessionStorage.setItem(
      `${SETTINGS_CACHE_PREFIX}_broadcast`,
      JSON.stringify({ ts: Date.now() })
    );
    sessionStorage.removeItem(`${SETTINGS_CACHE_PREFIX}_broadcast`);
  } catch {
    // ignore
  }
}

export function useSettings(group?: string) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const cacheKey = group || 'all';

  const loadSettings = useCallback(async (force = false) => {
    // SWR 模式：立即返回缓存（30 秒内），同时后台异步刷新
    if (!force) {
      const cached = getSettingsCache(cacheKey);
      if (cached) {
        setSettings(cached);
        setLoading(false);
        // 后台异步刷新（不阻塞 UI，下次进入时拿到最新数据）
        fetch(`/api/settings${group ? `?group=${group}` : ''}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setSettings(data);
              setSettingsCache(cacheKey, data);
            }
          })
          .catch(() => {/* ignore background refresh errors */});
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
  }, [group, cacheKey]);

  useEffect(() => {
    loadSettings();

    // 监听 settings 更新事件（其他组件/标签页更新了设置时立即失效缓存）
    const handleSettingsUpdated = () => {
      loadSettings(true);
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    // 监听 storage 事件（其他标签页修改了设置）
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${SETTINGS_CACHE_PREFIX}_broadcast`) {
        loadSettings(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadSettings]);

  return {
    settings,
    loading,
    loadSettings
  };
}
