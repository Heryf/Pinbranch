import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

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

    return NextResponse.json({ message: "排序已更新" });
  } catch (error) {
    console.error("Update sort order error:", error);
    return NextResponse.json(
      { error: "Failed to update sort order" },
      { status: 500 }
    );
  }
}
