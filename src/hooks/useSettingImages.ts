import { useState, useEffect } from 'react';
import { getSettingImages } from '@/actions/get-setting-image';

type Image = {
  id: string;
  url: string;
}

// sessionStorage 缓存（10 分钟有效）
const IMG_CACHE_TTL = 10 * 60 * 1000;
const IMG_CACHE_PREFIX = 'pintree_img_';

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

export const useSettingImages = (settingKey: string) => {
  const [imagesData, setImagesData] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettingImages = async () => {
      // 先尝试缓存
      const cachedIds = getImgCache(settingKey);
      if (cachedIds) {
        setImagesData(cachedIds.map(id => ({ id, url: `/api/images/${id}` })));
        setIsLoading(false);
        return;
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
    };

    fetchSettingImages();
  }, [settingKey]);

  return { 
    images: imagesData, 
    isLoading,
    error
  };
};
