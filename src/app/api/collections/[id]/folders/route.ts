import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await Promise.resolve(params);

  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";
    const parentId = searchParams.get("parentId");

    // 使用 unstable_cache 缓存文件夹列表，30s 内重复请求直接返回
    const getFolders = unstable_cache(
      async () => {
        const folders = await prisma.folder.findMany({
          where: {
            collectionId: id,
            ...(all ? {} : { parentId: parentId || null }),
          },
          orderBy: { sortOrder: 'asc' }
        });

        // 安全处理：不返回密码字段，用 isPrivate 代替
        return folders.map(folder => ({
          ...folder,
          password: undefined,
          isPrivate: !folder.isPublic && !!folder.password,
        }));
      },
      ['folders-list', id, all ? 'all' : (parentId || 'root')],
      { revalidate: 30, tags: [`folders-${id}`] }
    );

    const safeFolders = await getFolders();

    const response = NextResponse.json(safeFolders);
    response.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error("Failed to get folders:", error);
    return NextResponse.json(
      { error: "Failed to get folders" },
      { status: 500 }
    );
  }
}
