import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Prisma } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, ...restData } = await request.json();
    const slug = name ? name.toLowerCase().replace(/\s+/g, '-') : undefined;

    // Check if name or slug already exists (case-insensitive)
    if (name) {
      const existingCollection = await prisma.collection.findFirst({
        where: {
          OR: [
            { 
              name: {
                mode: 'insensitive',
                equals: name
              }
            },
            { 
              slug: {
                mode: 'insensitive',
                equals: slug
              }
            }
          ],
          NOT: {
            id: params.id
          }
        }
      });

      if (existingCollection) {
        return NextResponse.json(
          { error: "The name or slug is already in use" },
          { status: 400 }
        );
      }
    }

    // Update collection with new slug
    const collection = await prisma.collection.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        slug,
        ...restData
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Update collection error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "The name or slug is already in use" },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.collection.delete({
      where: {
        id: params.id
      },
    });

    return NextResponse.json({ message: "Delete successful" });
  } catch (error) {
    console.error("Delete collection error:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}

// 批量更新合集排序
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { collections } = body;

    if (!Array.isArray(collections)) {
      return NextResponse.json(
        { error: "Invalid request: collections must be an array" },
        { status: 400 }
      );
    }

    // 使用事务批量更新排序
    const updates = collections.map((item: { id: string; sortOrder: number }) =>
      prisma.collection.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ message: "Sort order updated successfully" });
  } catch (error) {
    console.error("Update sort order error:", error);
    return NextResponse.json(
      { error: "Failed to update sort order" },
      { status: 500 }
    );
  }
}
