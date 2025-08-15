import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany();
    return NextResponse.json(partners);
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    console.log("Iniciando criação de parceiro");
    
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
    const base64Image = buffer.toString('base64');
    
    // Criar uma URL de dados para a imagem
    const mimeType = image.type || 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    console.log("Imagem convertida, criando parceiro no banco");

    const partner = await prisma.partner.create({
      data: {
        name,
        imageUrl, // Armazenar a imagem como URL de dados
      },
    });

    console.log("Parceiro criado com sucesso:", partner.id);
    return NextResponse.json(partner);
  } catch (error: unknown) {
    console.error("Error creating partner - Tipo do erro:", typeof error);
    if (error instanceof Error) {
      console.error("Error creating partner - Nome do erro:", error.name);
      console.error("Error creating partner - Mensagem:", error.message);
      console.error("Error creating partner - Stack:", error.stack);
    } else {
      console.error("Error creating partner - Erro desconhecido:", error);
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
