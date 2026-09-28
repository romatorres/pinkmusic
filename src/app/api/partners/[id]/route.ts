import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { deleteImageFromCloudinary, uploadImageToCloudinary } from "@/lib/cloudinary";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    const partner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      return new NextResponse("Partner not found", { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const image = formData.get("image") as File | null;

    if (!name || name.trim() === "") {
      return new NextResponse("O nome do parceiro é obrigatório", { status: 400 });
    }

    let newImageUrl = partner.imageUrl;

    // Se uma nova imagem foi enviada
    if (image && typeof image === "object" && image.size > 0) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Image = buffer.toString("base64");
      const mimeType = image.type || "image/png";
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      const uploadResult = await uploadImageToCloudinary(dataUri, "pinkmusic/partners");
      newImageUrl = uploadResult.url;

      // Se a imagem antiga for do Cloudinary, deleta para não acumular lixo
      if (partner.imageUrl && partner.imageUrl.includes("res.cloudinary.com")) {
        await deleteImageFromCloudinary(partner.imageUrl);
      }
    }

    const updatedPartner = await prisma.partner.update({
      where: { id },
      data: {
        name: name.trim(),
        imageUrl: newImageUrl,
      },
    });

    return NextResponse.json(updatedPartner);
  } catch (error) {
    console.error("Error updating partner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    
    const partner = await prisma.partner.findUnique({
      where: { id },
    });

    if (!partner) {
      return new NextResponse("Partner not found", { status: 404 });
    }

    // Se a imagem estiver no Cloudinary, deleta a imagem do storage
    if (partner.imageUrl && partner.imageUrl.includes("res.cloudinary.com")) {
      await deleteImageFromCloudinary(partner.imageUrl);
    }

    await prisma.partner.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting partner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}