import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, icon, isPublic, password, collectionId, parentId } = await request.json();

    // 验证必填字段
    if (!name || !collectionId) {
      return NextResponse.json(
        { error: "Name and collection are required" },
        { status: 400 }
      );
    }

    // 如果指定了parentId,验证父文件夹是否存在且属于同一个集合
    if (parentId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { 
          id: parentId,
          collectionId: collectionId
        }
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder does not exist or does not belong to this collection" },
          { status: 400 }
        );
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        icon,
        isPublic,
        password,
        collectionId,
        parentId: parentId || null
      },
    });

    // 使相关缓存失效，确保创建后前端立即看到新数据
    revalidateTag(`folders-${collectionId}`);
    revalidateTag('collections');
    revalidateTag('all-folders-tree');

    return NextResponse.json(folder);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}

