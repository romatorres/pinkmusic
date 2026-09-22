import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await req.json();
    const {
      title,
      price,
      available_quantity = 0,
      brandId,
      categoryId,
      description,
      descriptionSource,
      thumbnail,
      pictures = [],
      isLocalPickup = true,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "O título do produto é obrigatório." },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "O preço deve ser um valor numérico positivo." },
        { status: 400 }
      );
    }

    const numericQuantity = Math.max(0, parseInt(available_quantity, 10) || 0);

    // Determina a thumbnail principal: fornecida explicitamente ou a 1ª imagem da galeria
    const mainThumbnail =
      thumbnail?.trim() ||
      (Array.isArray(pictures) && pictures.length > 0
        ? typeof pictures[0] === "string"
          ? pictures[0]
          : pictures[0].url
        : "/images/placeholder-product.png");

    // Prepara lista de imagens para criar na relação Picture
    const pictureList: { url: string }[] = [];
    if (Array.isArray(pictures) && pictures.length > 0) {
      for (const item of pictures) {
        const url = typeof item === "string" ? item.trim() : item.url?.trim();
        if (url) {
          pictureList.push({ url });
        }
      }
    } else if (mainThumbnail) {
      pictureList.push({ url: mainThumbnail });
    }

    const newProduct = await prisma.product.create({
      data: {
        title: title.trim(),
        price: numericPrice,
        currency_id: "BRL",
        thumbnail: mainThumbnail,
        condition: "new",
        available_quantity: numericQuantity,
        seller_nickname: "Pink Music Loja Física",
        origin: "LOCAL",
        description: description?.trim() || null,
        descriptionSource: descriptionSource === "ML" ? "ML" : "CUSTOM",
        isLocalPickup: Boolean(isLocalPickup),
        brandId: brandId || null,
        categoryId: categoryId || null,
        pictures: {
          create: pictureList,
        },
      },
      include: {
        brand: true,
        category: true,
        pictures: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Produto local cadastrado com sucesso!",
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao cadastrar produto local:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao cadastrar produto local.",
      },
      { status: 500 }
    );
  }
}
