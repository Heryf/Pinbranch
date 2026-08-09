/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'favicon.im',
      },
    ],
    // 启用图片优化缓存（24小时），仅影响 next/image 组件（sidebar logo 等少量图片）
    // BookmarkCard 已改用原生 <img>，不受此限制
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
