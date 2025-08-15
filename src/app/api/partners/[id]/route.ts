import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const partner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      return new NextResponse("Partner not found", { status: 404 });
    }

    // Não precisamos mais deletar o arquivo do sistema de arquivos
    // pois agora armazenamos a imagem como URL de dados

    await prisma.partner.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting partner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}