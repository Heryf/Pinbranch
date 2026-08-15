import { useState, useEffect, useCallback } from 'react';
import { getSettingImages } from '@/actions/get-setting-image';

type Image = {
  id: string;
  url: string;
}

// sessionStorage 缓存（30 秒有效 - 缩短 TTL 确保后台修改快速生效）
const IMG_CACHE_TTL = 30 * 1000;
const IMG_CACHE_PREFIX = 'pintree_img_';
// 与 useSettings 共用的更新事件
const SETTINGS_UPDATED_EVENT = 'pintree-settings-updated';

function getImgCache(key: string): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${IMG_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > IMG_CACHE_TTL) {
      sessionStorage.removeItem(`${IMG_CACHE_PREFIX}${key}`);
      return null;
    }
    return entry.ids;
  } catch {
    return null;
  }
}

function setImgCache(key: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${IMG_CACHE_PREFIX}${key}`,
      JSON.stringify({ ids, ts: Date.now() })
    );
  } catch {
    // ignore
  }
}

function clearImgCache() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(IMG_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export const useSettingImages = (settingKey: string) => {
  const [imagesData, setImagesData] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async (force = false) => {
    // SWR 模式：先返回缓存再后台异步刷新
    if (!force) {
      const cachedIds = getImgCache(settingKey);
      if (cachedIds) {
        setImagesData(cachedIds.map(id => ({ id, url: `/api/images/${id}` })));
        setIsLoading(false);
        // 后台异步刷新
        try {
          const result = await getSettingImages(settingKey);
          if (result.success) {
            const ids = result.imageIds || [];
            setImagesData(ids.map((id: string) => ({ id, url: `/api/images/${id}` })));
            setImgCache(settingKey, ids);
            setError(null);
          }
        } catch {/* ignore */}
        return;
      }
    }

    try {
      const result = await getSettingImages(settingKey);
      if (result.success) {
        const ids = result.imageIds || [];
        const images = ids.map((id: string) => ({ id, url: `/api/images/${id}` }));
        setImagesData(images);
        setImgCache(settingKey, ids);
        setError(null);
      } else {
        setImagesData([]);
        setError(result.error || 'Get setting images failed');
      }
    } catch (err) {
      setImagesData([]);
      setError(err instanceof Error ? err.message : 'Get setting images failed');
    } finally {
      setIsLoading(false);
    }
  }, [settingKey]);

  useEffect(() => {
    fetchImages();

    // 监听 settings 更新事件（强制刷新）
    const handleSettingsUpdated = () => {
      clearImgCache();
      fetchImages(true);
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [fetchImages]);

  return {
    images: imagesData,
    isLoading,
    error
  };
};