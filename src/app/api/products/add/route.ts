import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  getMercadoLivreAccessToken,
  refreshMercadoLivreToken,
} from "@/lib/mercadolivre";

interface MercadoLibreProductDetails {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  available_quantity: number;
  permalink: string;
  pictures: { url: string }[];
  seller?: {
    nickname: string;
  };
}

async function fetchProductDetailsFromMercadoLivre(
  itemId: string
): Promise<MercadoLibreProductDetails> {
  const accessToken = await getMercadoLivreAccessToken();

  if (!accessToken) {
    throw new Error("Token de acesso do MercadoLivre não configurado.");
  }

  let headers = {
    "Authorization": `Bearer ${accessToken}`,
  };

  const url = `https://api.mercadolibre.com/items/${itemId}`;
  const response = await fetch(url, { headers });

  if (response.status === 401 || response.status === 403) {
    console.log("Token inválido ou expirado, tentando renovar...");

    const newTokens = await refreshMercadoLivreToken();

    headers = {
      "Authorization": `Bearer ${newTokens.accessToken}`,
    };
    const retryResponse = await fetch(url, { headers });

    if (!retryResponse.ok) {
      const errorText = await retryResponse.text();
      throw new Error(
        `Erro na API do MercadoLivre após renovação: ${retryResponse.status} - ${errorText}`
      );
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Erro na API do MercadoLivre: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);

    if (authResult.response) {
      return authResult.response;
    }

    const { productId, categoryId, brandId } = await req.json(); // NOVO: brandId

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido ou inválido." },
        { status: 400 }
      );
    }

    const permalink = `https://api.mercadolibre.com/items/${productId}`;
    const existingProduct = await prisma.product.findUnique({
      where: { permalink },
    });

    if (existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Produto já cadastrado no sistema. Não é permitido o cadastro duplicado de produtos do Mercado Livre.",
          productId: existingProduct.id,
          message: "Produto já existe no banco de dados.",
        },
        { status: 409 }
      );
    }

    const productDetails = await fetchProductDetailsFromMercadoLivre(productId);

    const existingProductById = await prisma.product.findUnique({
      where: { id: productDetails.id },
    });

    if (existingProductById) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Produto já cadastrado no sistema. Não é permitido o cadastro duplicado de produtos do Mercado Livre.",
          productId: existingProductById.id,
          message: "Produto já existe no banco de dados.",
        },
        { status: 409 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        id: productDetails.id,
        title: productDetails.title,
        price: productDetails.price,
        currency_id: productDetails.currency_id,
        thumbnail: productDetails.thumbnail,
        condition: productDetails.condition,
        available_quantity: productDetails.available_quantity,
        seller_nickname: productDetails.seller?.nickname || "Não informado",
        permalink: productDetails.permalink,
        description: null,
        descriptionSource: "ML",
        pictures: {
          create: productDetails.pictures.map((p) => ({ url: p.url })),
        },
        categoryId: categoryId || null, // Pode ser null
        brandId: brandId || null, // NOVO: Pode ser null
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Produto adicionado com sucesso!",
        productId: newProduct.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao adicionar produto:", error);
    
    const errorMessage = error instanceof Error ? error.message : "";
    const friendlyMessage = errorMessage.includes("MercadoLivre")
      ? "Erro ao obter informações do Mercado Livre. Verifique o ID do produto ou tente novamente mais tarde."
      : "Não foi possível cadastrar o produto devido a um erro interno.";

    return NextResponse.json(
      { success: false, error: friendlyMessage },
      { status: 500 }
    );
  }
}
