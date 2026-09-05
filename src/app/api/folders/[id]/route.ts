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

    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await prisma.folder.delete({
      where: { id: params.id },
    });

    // 缓存失效
    revalidateTag(`folders-${folder.collectionId}`);
    revalidateTag('collections');
    revalidateTag('all-folders-tree');

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("Delete folder failed:", error);
    return NextResponse.json({ error: "Delete folder failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const password = data.password === "" || data.password === null ? null : data.password;

    const updatedFolder = await prisma.folder.update({
      where: { id: params.id },
      data: {
        name: data.name,
        icon: data.icon,
        isPublic: data.isPublic,
        password: password,
        sortOrder: data.sortOrder,
        parentId: data.parentId,
      },
    });

    // 缓存失效
    revalidateTag(`folders-${folder.collectionId}`);
    revalidateTag('collections');
    revalidateTag('all-folders-tree');

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Update folder failed:", error);
    return NextResponse.json({ error: "Update folder failed" }, { status: 500 });
  }
}
