import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: {
        name: "asc",
      },
    });
    return NextResponse.json({ success: true, data: brands });
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
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