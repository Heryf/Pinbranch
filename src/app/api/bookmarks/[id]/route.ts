import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { revalidateTag } from "next/cache";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.bookmark.delete({
      where: {
        id: params.id
      },
    });

    // 缓存失效
    revalidateTag('collections');
    revalidateTag('bookmarks');

    return NextResponse.json({ message: "Delete success" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delete bookmark failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // 如果提供了有效的 folderId，验证文件夹是否属于该合集
    let folderId: string | null | undefined;
    if (data.folderId === null) {
      folderId = null; // 明确移出文件夹（移动到根目录）
    } else if (data.folderId && data.folderId !== "none") {
      const folder = await prisma.folder.findUnique({
        where: {
          id: data.folderId,
          collectionId: data.collectionId,
        },
      });
      if (!folder) {
        return NextResponse.json(
          { error: "Selected folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }
      folderId = data.folderId;
    }

    const bookmark = await prisma.bookmark.update({
      where: {
        id: params.id,
      },
      data: {
        title: data.title,
        url: data.url,
        description: data.description,
        collectionId: data.collectionId,
        isFeatured: data.isFeatured,
        icon: data.icon,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : undefined,
        ...(folderId !== undefined ? { folderId } : {}),
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
    });

    // 缓存失效
    revalidateTag('collections');
    revalidateTag('bookmarks');

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Update bookmark failed" }, { status: 500 });
  }
}

