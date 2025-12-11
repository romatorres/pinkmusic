import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    });
    return NextResponse.json(brand);
  } catch (error) {
    console.error("Error editing brand:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.brand.delete({
      where: { id: (await params).id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
