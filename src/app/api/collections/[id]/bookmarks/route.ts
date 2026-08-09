import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await Promise.resolve(params);
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const sortField = searchParams.get("sortField") || "sortOrder";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const password = searchParams.get("password") || "";

    // 分页参数：默认每页 48 条，减少单次加载量
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "48")));
    const skip = (page - 1) * pageSize;

    // 检查当前文件夹是否需要密码验证
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { isPublic: true, password: true, name: true }
      });

      if (folder && !folder.isPublic && folder.password) {
        // 非公开且设置了密码，需要验证
        // 检查用户是否已登录（管理员无需密码）
        const session = await getServerSession(authOptions);
        
        if (!session) {
          // 未登录用户需要验证密码
          if (password !== folder.password) {
            return NextResponse.json(
              { error: "Password required", folderName: folder.name, requirePassword: true },
              { status: 403 }
            );
          }
        }
        // 已登录用户（管理员）直接放行
      }
    }

    // 并行执行：当前层级书签（分页）+ 当前层级子文件夹 + 书签总数
    const [currentBookmarks, subfoldersRaw, totalCount] = await Promise.all([
      prisma.bookmark.findMany({
        where: {
          collectionId: id,
          ...(folderId ? { folderId } : { folderId: null })
        },
        orderBy: {
          [sortField]: sortOrder as 'asc' | 'desc',
        },
        skip,
        take: pageSize,
        include: {
          collection: {
            select: {
              name: true,
            },
          },
          folder: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.folder.findMany({
        where: {
          collectionId: id,
          parentId: folderId || null
        },
        orderBy: {
          [sortField]: sortOrder as 'asc' | 'desc',
        },
      }),
      prisma.bookmark.count({
        where: {
          collectionId: id,
          ...(folderId ? { folderId } : { folderId: null })
        },
      })
    ]);

    // 获取每个子文件夹的统计信息 - 用 groupBy 替代 N+1 循环
    let subfolders: any[] = [];
    if (subfoldersRaw.length > 0) {
      const subfolderIds = subfoldersRaw.map(f => f.id);

      const [bookmarkCountGroups, childFolderCountGroups] = await Promise.all([
        prisma.bookmark.groupBy({
          by: ['folderId'],
          where: { folderId: { in: subfolderIds } },
          _count: { _all: true }
        }),
        prisma.folder.groupBy({
          by: ['parentId'],
          where: { parentId: { in: subfolderIds } },
          _count: { _all: true }
        })
      ]);

      const bookmarkCountMap = new Map(
        bookmarkCountGroups.map(g => [g.folderId, g._count._all])
      );
      const childFolderCountMap = new Map(
        childFolderCountGroups.map(g => [g.parentId, g._count._all])
      );

      subfolders = subfoldersRaw.map(folder => ({
        ...folder,
        password: undefined,
        bookmarkCount: bookmarkCountMap.get(folder.id) || 0,
        childFolderCount: childFolderCountMap.get(folder.id) || 0
      }));
    }

    const response = NextResponse.json({
      currentBookmarks,
      subfolders,
      total: totalCount,
      page,
      pageSize,
      hasMore: skip + currentBookmarks.length < totalCount,
    });
    // 浏览器缓存 15 秒，CDN 缓存 30 秒，SWR 60 秒
    response.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=60');
    return response;

  } catch (error) {
    console.error("Failed to get content:", error);
    return NextResponse.json(
      { error: "Failed to get content", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
