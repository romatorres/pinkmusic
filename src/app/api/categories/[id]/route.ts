import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { name, parentId, slug } = await request.json();
    const updateData: { name?: string; parentId?: string | null; slug?: string } = {};

    if (name !== undefined) updateData.name = name;
    if (parentId !== undefined) {
      updateData.parentId = parentId && parentId.trim() !== "" ? parentId : null;
    }
    if (slug !== undefined) {
      updateData.slug = slug;
    } else if (name) {
      updateData.slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const category = await prisma.category.update({
      where: { id: (await params).id },
      data: updateData,
      include: {
        parent: true,
        subcategories: true,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error editing categorie:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    await prisma.category.delete({
      where: { id: (await params).id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting categorie:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}