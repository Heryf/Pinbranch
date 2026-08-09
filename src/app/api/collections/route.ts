import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('publicOnly') === 'true';
    
    // Retrieve collections list, optionally filtering for public collections
    const collections = await prisma.collection.findMany({
      where: publicOnly ? {
        isPublic: true
      } : undefined,
      orderBy: {
        sortOrder: "asc"
      }
    });

    // 批量查询书签数（替代 N+1 循环查询）
    const collectionIds = collections.map(c => c.id);
    let bookmarkCountMap = new Map<string, number>();

    if (collectionIds.length > 0) {
      const bookmarkCounts = await prisma.bookmark.groupBy({
        by: ['collectionId'],
        where: {
          collectionId: { in: collectionIds }
        },
        _count: {
          _all: true
        }
      });
      bookmarkCountMap = new Map(
        bookmarkCounts.map(b => [b.collectionId, b._count._all])
      );
    }

    // 组装结果
    const collectionsWithBookmarkCount = collections.map(collection => ({
      ...collection,
      totalBookmarks: bookmarkCountMap.get(collection.id) || 0
    }));

    return NextResponse.json(collectionsWithBookmarkCount);
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
