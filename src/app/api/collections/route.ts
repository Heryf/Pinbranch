import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { unstable_cache } from "next/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('publicOnly') === 'true';

    // 使用 unstable_cache 缓存合集列表（含书签数），避免每次重复计算
    const getCollectionsWithCount = unstable_cache(
      async () => {
        // 性能优化：用单次 groupBy 替代 N+1 查询
        const collections = await prisma.collection.findMany({
          where: publicOnly ? { isPublic: true } : undefined,
          orderBy: { sortOrder: "asc" }
        });

        if (collections.length === 0) return [];

        const collectionIds = collections.map(c => c.id);

        // 单次查询获取所有合集的书签总数
        const bookmarkGroups = await prisma.bookmark.groupBy({
          by: ['collectionId'],
          where: {
            collectionId: { in: collectionIds }
          },
          _count: {
            _all: true
          }
        });

        const countMap = new Map(
          bookmarkGroups.map(g => [g.collectionId, g._count._all])
        );

        return collections.map(collection => ({
          ...collection,
          totalBookmarks: countMap.get(collection.id) || 0
        }));
      },
      ['collections-list', publicOnly ? 'public' : 'all'],
      { revalidate: 60, tags: ['collections'] }
    );

    const collectionsWithBookmarkCount = await getCollectionsWithCount();

    const response = NextResponse.json(collectionsWithBookmarkCount);
    // 启用 HTTP 缓存，缩短客户端响应时间
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to get bookmark collections" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, icon, isPublic, viewStyle, sortStyle, sortOrder } = body;
    const slug = name ? name.toLowerCase().replace(/\s+/g, '-') : "";

    // 检查名称是否已存在
    if (name) {
      const existingCollection = await prisma.collection.findFirst({
        where: {
          OR: [
            { name },
            { slug }
          ]
        }
      });

      if (existingCollection) {
        return NextResponse.json(
          { error: "The name or slug is already in use" },
          { status: 400 }
        );
      }
    }

    // 创建新集合
    const collection = await prisma.collection.create({
      data: {
        name: name || "",
        description: description || "",
        icon: icon || "",
        isPublic: isPublic ?? true,
        viewStyle: viewStyle || "list",
        sortStyle: sortStyle || "alpha",
        sortOrder: sortOrder ?? 0,
        slug,
      },
    });

    return NextResponse.json(collection);
  } catch (error: unknown) {
    console.error("Detailed error creating collection:", error);
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: "Name or slug already in use" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create collection: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
