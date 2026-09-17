import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { name, logo } = await request.json();

    // Gera o slug automaticamente
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const brand = await prisma.brand.update({
      where: { id: (await params).id },
      data: {
        name,
        slug,
        logo: logo || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: brand });
  } catch (error) {
    console.error("Error editing brand:", error);
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

    await prisma.brand.delete({
      where: { id: (await params).id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
