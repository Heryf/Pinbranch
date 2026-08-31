import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await Promise.resolve(params);

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const parentId = searchParams.get("parentId");

    const folders = await prisma.folder.findMany({
      where: {
        collectionId: id,
        ...(all ? {} : { parentId: parentId || null }),
      },
      orderBy: { sortOrder: 'asc' }
    });

    // 安全处理：不返回密码字段，用 isPrivate 代替
    const safeFolders = folders.map(folder => ({
      ...folder,
      password: undefined,
      isPrivate: !folder.isPublic && !!folder.password,
    }));

    const response = NextResponse.json(safeFolders);
    // 禁用浏览器缓存，确保 CRUD 后数据实时一致
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  } catch (error) {
    console.error("Failed to get folders:", error);
    return NextResponse.json(
      { error: "Failed to get folders" },
      { status: 500 }
    );
  }
}
