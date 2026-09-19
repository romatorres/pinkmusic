import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        subcategories: {
          orderBy: {
            name: "asc",
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        products: {
          select: {
            brandId: true,
          },
        },
      },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { name, parentId, slug } = await request.json();
    
    // Gerar slug caso não seja fornecido
    const categorySlug =
      slug ||
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const category = await prisma.category.create({
      data: {
        name,
        slug: categorySlug,
        parentId: parentId && parentId.trim() !== "" ? parentId : null,
      },
      include: {
        parent: true,
        subcategories: true,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}