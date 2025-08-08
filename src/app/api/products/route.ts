import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const products = await prisma.product.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: {
        title: 'asc',
      },
      include: {
        pictures: true,
        category: true,
      },
    });
    return NextResponse.json({ success: true, data: products });
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
