import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany();
    return NextResponse.json(partners);
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const data = await request.formData();
    const name = data.get("name") as string;
    const image = data.get("image") as File;

    if (!name || !image) {
      return new NextResponse("Missing name or image", { status: 400 });
    }

    console.log("Convertendo imagem para base64");
    // Converter a imagem para base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Criar uma URL de dados para a imagem
    const mimeType = image.type || "image/jpeg";
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    const partner = await prisma.partner.create({
      data: {
        name,
        imageUrl, // Armazenar a imagem como URL de dados
      },
    });

    return NextResponse.json(partner);
  } catch (error: unknown) {
    console.error(
      "Error creating partner:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { message: "Erro interno do servidor ao criar parceiro." },
      { status: 500 }
    );
  }
}
