import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 批量获取所有公开合集下的所有文件夹
 * 性能优化：单次查询替代 sidebar 中的循环 N+1 查询
 */
export async function GET() {
  try {
    // 1. 获取所有公开合集
    const collections = await prisma.collection.findMany({
      where: { isPublic: true },
      select: { id: true }
    });

    if (collections.length === 0) return NextResponse.json({});

    const collectionIds = collections.map(c => c.id);

    // 2. 单次查询获取所有合集的所有文件夹
    const folders = await prisma.folder.findMany({
      where: {
        collectionId: { in: collectionIds }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // 3. 按 collectionId 分组
    const grouped: Record<string, any[]> = {};
    for (const folder of folders) {
      // 安全脱敏
      const safeFolder = {
        ...folder,
        password: undefined,
        isPrivate: !folder.isPublic && !!folder.password,
      };
      if (!grouped[folder.collectionId]) {
        grouped[folder.collectionId] = [];
      }
      grouped[folder.collectionId].push(safeFolder);
    }

    const response = NextResponse.json(grouped);
    // 禁用浏览器缓存，确保 CRUD 后数据实时一致
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error("Failed to get all folders:", error);
    return NextResponse.json(
      { error: "Failed to get all folders" },
      { status: 500 }
    );
  }
}
