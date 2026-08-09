
import { prisma } from "@/lib/prisma";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { Analytics } from "@/components/analytics/Analytics";
import { Toaster as SonnerToaster } from "sonner";
import { defaultSettings } from "@/lib/defaultSettings";
import { unstable_cache } from 'next/cache';
import type { Metadata, ResolvingMetadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'

async function checkSiteSettingTableExists() {
  const result: any = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE  table_schema = 'public'
      AND    table_name   = 'SiteSetting'
    );
  `;
  return result[0].exists;
}

// 缓存 metadata 相关 DB 查询，避免每次请求 5 次 DB 往返
const getCachedSiteMetadata = unstable_cache(
  async () => {
    const tableExists = await checkSiteSettingTableExists();
    const keys = ["websiteName", "description", "keywords", "siteUrl", "faviconUrl", "ogImage"];
    let settings: any;
    if (tableExists) {
      settings = await prisma.siteSetting.findMany({
        where: { key: { in: [...keys] } },
      });
    }

    settings = settings && settings.length > 0 ? settings : defaultSettings.filter((setting) =>
      keys.includes(setting.key)
    );

    const settingsMap = settings.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    const imageBaseUrl = '/api/images/';
    const faviconSetting = settings.find((setting: any) => setting.key === 'faviconUrl');
    const faviconId = faviconSetting ?
      (await prisma.settingImage.findFirst({
        where: { settingId: faviconSetting.id },
        select: { imageId: true }
      }))?.imageId || '' : '';
    const faviconUrl = faviconId ? `${imageBaseUrl}${faviconId}` : '/favicon/favicon.ico';

    return { settingsMap, faviconUrl };
  },
  ['site-metadata-v1'],
  { revalidate: 300, tags: ['site-metadata'] }
);

// 缓存 analytics ID 查询
const getCachedAnalyticsIds = unstable_cache(
  async () => {
    if (process.env.NODE_ENV !== "production") {
      return { googleAnalyticsId: "", clarityId: "" };
    }
    const tableExists = await checkSiteSettingTableExists();
    if (!tableExists) {
      return { googleAnalyticsId: "", clarityId: "" };
    }
    const analytics = await prisma.siteSetting.findMany({
      where: { key: { in: ["googleAnalyticsId", "clarityId"] } },
    });
    if (analytics.length === 0) {
      return { googleAnalyticsId: "", clarityId: "" };
    }
    return analytics.reduce((acc, setting) => {
      acc[setting.key] = setting.value || "";
      return acc;
    }, {} as Record<string, string>);
  },
  ['analytics-ids-v1'],
  { revalidate: 600, tags: ['site-metadata'] }
);

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const generateMetadata = async (
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> => {
  try {
    const { settingsMap, faviconUrl } = await getCachedSiteMetadata();

    const siteUrl =
      settingsMap.siteUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    return {
      title: settingsMap.websiteName,
      description: settingsMap.description,
      keywords: settingsMap.keywords,
      metadataBase: new URL(siteUrl),
      alternates: {
        canonical: siteUrl,
      },
      icons: {
        icon: [
          {
            url: faviconUrl,
            sizes: "32x32",
            type: "image/x-icon",
          },
        ],
      },
    };
  } catch (error) {
    console.error("获取设置失败:", error);
    return {
      title: "Pintree - Smart Bookmark Management & Organization Platform",
      description:
        "Organize, manage and share your bookmarks efficiently with Pintree. Features AI-powered organization, custom collections, and seamless bookmark sharing for enhanced productivity.",
      keywords:
        "bookmark manager, bookmark organizer, bookmark collections, bookmark sharing, productivity tools, website organization, link management, bookmark tags, AI bookmarking, digital organization",
      icons: {
        icon: "/favicon/favicon.ico",
      },
    };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const analyticsMap = await getCachedAnalyticsIds();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('pintree-theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
      <Analytics clarityId={analyticsMap.clarityId} />
      {!!analyticsMap.googleAnalyticsId && <GoogleAnalytics gaId={analyticsMap.googleAnalyticsId} />}
    </html>
  );
}
