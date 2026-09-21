import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryIds = searchParams.get("categoryIds")?.split(",");
    const brandIds = searchParams.get("brandIds")?.split(",");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const sortBy = searchParams.get("sortBy") || "relevance";

    const skip = (page - 1) * limit;
    const searchQuery = searchParams.get("search");

    const whereClause: Prisma.ProductWhereInput = {};

    if (categoryIds && categoryIds.length > 0) {
      // Buscar subcategorias se alguma categoria pai foi selecionada
      const subcategories = await prisma.category.findMany({
        where: {
          parentId: { in: categoryIds },
        },
        select: { id: true },
      });
      const subcategoryIds = subcategories.map((c) => c.id);
      const allCategoryIds = Array.from(
        new Set([...categoryIds, ...subcategoryIds])
      );

      whereClause.categoryId = { in: allCategoryIds };
    }

    if (brandIds && brandIds.length > 0) {
      whereClause.brandId = { in: brandIds };
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) {
        whereClause.price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        whereClause.price.lte = parseFloat(maxPrice);
      }
    }

    const origin = searchParams.get("origin");

    if (origin && (origin === "LOCAL" || origin === "MERCADO_LIVRE")) {
      whereClause.origin = origin;
    }

    if (searchQuery) {
      whereClause.title = {
        contains: searchQuery,
        mode: "insensitive",
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sortBy === "price-asc") {
      orderBy = { price: "asc" };
    } else if (sortBy === "price-desc") {
      orderBy = { price: "desc" };
    } else {
      orderBy = { sales: "desc" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy,
        include: {
          pictures: true,
          category: {
            include: {
              parent: true,
            },
          },
          brand: true,
        },
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({ success: true, data: { products, total } });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
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
