import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function refreshMercadoLivreToken(baseUrl: string) {
  try {
    const refreshResponse = await fetch(`${baseUrl}/api/refreshToken`, {
      method: "POST",
    });

    const refreshResult = await refreshResponse.json();

    if (!refreshResult.success) {
      throw new Error(
        `Falha ao renovar o token: ${refreshResult.error || "Erro desconhecido"}`
      );
    }

    // Retorna os novos tokens
    return {
      accessToken: refreshResult.accessToken,
      refreshToken: refreshResult.refreshToken
    };
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    throw error;
  }
}

async function fetchProductDetailsFromMercadoLibre(itemId: string, baseUrl: string): Promise<MercadoLibreProductDetails> {
  const accessToken = process.env.MERCADOLIBRE_ACCESS_TOKEN;

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
    
    // Tentar renovar o token
    const newTokens = await refreshMercadoLivreToken(baseUrl);
    
    // Usar o novo token para a nova requisição
    headers = {
      "Authorization": `Bearer ${newTokens.accessToken}`,
    };
    const retryResponse = await fetch(url, { headers });

    if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Erro na API do MercadoLivre após renovação: ${retryResponse.status} - ${errorText}`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API do MercadoLivre: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function POST(req: NextRequest) {
  try {
    const { productId, categoryId } = await req.json();

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido ou inválido." },
        { status: 400 }
      );
    }

    // Obter a URL base da requisição atual
    const currentUrl = new URL(req.url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    const existingProduct = await prisma.product.findUnique({
      where: { permalink: `https://api.mercadolibre.com/items/${productId}` },
    });

    if (existingProduct) {
      return NextResponse.json(
        { success: true, message: "Produto já existe no banco de dados.", productId: existingProduct.id },
        { status: 200 }
      );
    }

    const productDetails = await fetchProductDetailsFromMercadoLibre(productId, baseUrl);

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
        pictures: {
          create: productDetails.pictures.map((p) => ({ url: p.url }))
        },
        categoryId: categoryId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Produto adicionado com sucesso!",
      productId: newProduct.id
    }, { status: 201 });

  } catch (error) {
    console.error("Erro ao adicionar produto:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}