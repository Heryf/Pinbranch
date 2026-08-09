import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { revalidateTag, unstable_cache } from 'next/cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 缓存设置查询，避免每次请求都查 DB
const getCachedSettings = unstable_cache(
  async (group?: string) => {
    const settings = group
      ? await prisma.siteSetting.findMany({ where: { group } })
      : await prisma.siteSetting.findMany();

    const formattedSettings = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value || '';
      return acc;
    }, {});

    return {
      ...formattedSettings,
      enableSearch: true
    };
  },
  ['settings-cache-v1'],
  { revalidate: 120, tags: ['site-metadata'] }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group') || undefined;

    const result = await getCachedSettings(group);

    // 添加 HTTP 缓存头
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    return response;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ 
      error: 'Failed to get settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Please login" }, { status: 401 });
    }

    const data = await request.json();
    // console.log('接收到的数据:', data);

    try {
      const updatedSettings = [];

      for (const [key, value] of Object.entries(data)) {
        const existingSetting = await prisma.siteSetting.findUnique({
          where: { key }
        });
      
        if (existingSetting) {
          const updated = await prisma.siteSetting.update({
            where: { key },
            data: {
              value: String(value)
            }
          });
          updatedSettings.push(updated);
        }
      }



      // 缓存失效：设置更新后清除 metadata 和 collections 缓存
      revalidateTag('site-metadata');

      return NextResponse.json({ 
        message: 'Settings saved',
        results: updatedSettings
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return NextResponse.json({ 
        error: 'Database operation failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Failed to save settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
