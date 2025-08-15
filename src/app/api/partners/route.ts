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
    const data = await request.formData();
    const name = data.get("name") as string;
    const image = data.get("image") as File;

    if (!name || !image) {
      return new NextResponse("Missing name or image", { status: 400 });
    }

    // Converter a imagem para base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    
    // Criar uma URL de dados para a imagem
    const mimeType = image.type || 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    const partner = await prisma.partner.create({
      data: {
        name,
        imageUrl, // Armazenar a imagem como URL de dados
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    console.error("Error creating partner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
