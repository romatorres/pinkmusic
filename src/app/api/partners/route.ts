import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

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

    // Converter a imagem para base64 para envio ao Cloudinary
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const mimeType = image.type || "image/png";
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Upload para a pasta 'pinkmusic/partners' no Cloudinary
    const uploadResult = await uploadImageToCloudinary(dataUri, "pinkmusic/partners");

    const partner = await prisma.partner.create({
      data: {
        name,
        imageUrl: uploadResult.url, // Salvar a URL do Cloudinary
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
