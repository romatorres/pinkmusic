import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const skip = (page - 1) * limit;

    const searchQuery = searchParams.get("search");

    const whereClause: Prisma.ProductWhereInput = categoryId
      ? { categoryId }
      : {};

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
