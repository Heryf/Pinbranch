import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";


export const runtime = 'nodejs';
// 增加超时时间到最大值
export const maxDuration = 60; // Vercel Hobby 允许的最大时间是 60 秒
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');
    
    // 获取所有设置
    const settings = group 
      ? await prisma.siteSetting.findMany({ where: { group } })
      : await prisma.siteSetting.findMany();

    
    // 将设置转换为键值对格式
    const formattedSettings = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value || '';
      return acc;
    }, {});


    // 合并默认值和数据库值
    const result = {
      ...formattedSettings,
      enableSearch: true
    };

    // 显式设置 no-store 缓存头，防止浏览器 / Vercel CDN 缓存旧数据
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
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
        // 跳过非设置字段（如 group 等辅助字段）
        if (key === 'group') continue;

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
        } else {
          // 设置项不存在时自动创建，避免静默丢失
          const created = await prisma.siteSetting.create({
            data: {
              key,
              value: String(value),
              type: 'string',
              group: (data as any).group || 'basic',
            }
          });
          updatedSettings.push(created);
        }
      }


      return NextResponse.json({ 
        message: 'Settings saved',
        results: updatedSettings
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
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
