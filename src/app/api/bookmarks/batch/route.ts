import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// 批量删除书签
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of bookmark IDs" },
        { status: 400 }
      );
    }

    const result = await prisma.bookmark.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.count} bookmarks`,
      count: result.count,
    });
  } catch (error) {
    console.error("Batch delete bookmarks failed:", error);
    return NextResponse.json(
      { error: "Batch delete bookmarks failed" },
      { status: 500 }
    );
  }
}

// 批量移动书签（更新 folderId）
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids, folderId, collectionId } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of bookmark IDs" },
        { status: 400 }
      );
    }

    // 验证合集一致性
    const bookmarks = await prisma.bookmark.findMany({
      where: { id: { in: ids } },
      select: { id: true, collectionId: true },
    });

    const differentCollections = bookmarks.filter(
      (b) => b.collectionId !== collectionId
    );
    if (differentCollections.length > 0) {
      return NextResponse.json(
        { error: "Bookmarks must belong to the same collection" },
        { status: 400 }
      );
    }

    // 如果 folderId 不为 null，验证文件夹是否属于该合集
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId, collectionId },
      });
      if (!folder) {
        return NextResponse.json(
          { error: "Target folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.bookmark.updateMany({
      where: { id: { in: ids } },
      data: {
        folderId: folderId || null,
        collectionId,
      },
    });

    return NextResponse.json({
      message: `Successfully moved ${result.count} bookmarks`,
      count: result.count,
    });
  } catch (error) {
    console.error("Batch move bookmarks failed:", error);
    return NextResponse.json(
      { error: "Batch move bookmarks failed" },
      { status: 500 }
    );
  }
}
