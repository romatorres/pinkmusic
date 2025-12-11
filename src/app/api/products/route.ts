import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const brandId = searchParams.get("brandId"); // NOVO
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const skip = (page - 1) * limit;

    const searchQuery = searchParams.get("search");

    const whereClause: Prisma.ProductWhereInput = {};

    // Filtro por categoria
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // NOVO: Filtro por marca
    if (brandId) {
      whereClause.brandId = brandId;
    }

    // Filtro por busca
    if (searchQuery) {
      whereClause.title = {
        contains: searchQuery,
        mode: "insensitive",
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: {
          title: "asc",
        },
        include: {
          pictures: true,
          category: true,
          brand: true, // NOVO: Incluir dados da marca
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
