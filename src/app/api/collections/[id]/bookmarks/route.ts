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
          // 不返回密码字段
          password: undefined,
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
