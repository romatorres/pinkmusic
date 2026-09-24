import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCategoryIds = searchParams.get("categoryIds") || searchParams.get("categoryId");
    const categoryIds = rawCategoryIds
      ? rawCategoryIds.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    const rawBrandIds = searchParams.get("brandIds") || searchParams.get("brandId");
    const brandIds = rawBrandIds
      ? rawBrandIds.split(",").map((b) => b.trim()).filter(Boolean)
      : [];

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const sortBy = searchParams.get("sortBy") || "relevance";

    const skip = (page - 1) * limit;
    const searchQuery = searchParams.get("search");

    const whereClause: Prisma.ProductWhereInput = {};

    if (categoryIds && categoryIds.length > 0) {
      // 1. Identificar se alguma das categorias passadas é filha de outra que também foi passada
      const passedCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, parentId: true },
      });

      const selectedParentIdsOfChildren = new Set(
        passedCategories.map((c) => c.parentId).filter(Boolean)
      );

      // Se o usuário selecionou uma filha específica (ex: Encordoamentos),
      // descarta o pai amplo (ex: Cordas) para refinar exclusivamente pela subcategoria escolhida
      const effectiveCategoryIds = categoryIds.filter(
        (id) => !selectedParentIdsOfChildren.has(id)
      );

      // 2. Para categorias pai que sobraram, busca as filhas para englobar a busca ampla
      const subcategories = await prisma.category.findMany({
        where: {
          parentId: { in: effectiveCategoryIds },
        },
        select: { id: true },
      });
      const subcategoryIds = subcategories.map((c) => c.id);
      const allCategoryIds = Array.from(
        new Set([...effectiveCategoryIds, ...subcategoryIds])
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
      whereClause.OR = [
        {
          title: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
        {
          code: {
            contains: searchQuery,
            mode: "insensitive",
          },
        },
      ];
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
