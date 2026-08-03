import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    // 并行执行：当前层级书签 + 当前层级子文件夹
    const [currentBookmarks, subfoldersRaw] = await Promise.all([
      prisma.bookmark.findMany({
        where: {
          collectionId: id,
          ...(folderId ? { folderId } : { folderId: null })
        },
        orderBy: {
          [sortField]: sortOrder as 'asc' | 'desc',
        },
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
      })
    ]);

    // 获取每个子文件夹的统计信息
    const subfolders = await Promise.all(
      subfoldersRaw.map(async (folder) => {
        const [bookmarkCount, childFolderCount] = await Promise.all([
          prisma.bookmark.count({
            where: {
              folderId: folder.id
            }
          }),
          prisma.folder.count({
            where: {
              parentId: folder.id
            }
          })
        ]);

        return {
          ...folder,
          bookmarkCount,
          childFolderCount
        };
      })
    );

    return NextResponse.json({
      currentBookmarks,
      subfolders,
    });

  } catch (error) {
    console.error("Failed to get content:", error);
    return NextResponse.json(
      { error: "Failed to get content", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
