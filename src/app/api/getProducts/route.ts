import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getMercadoLivreAccessToken,
  refreshMercadoLivreToken,
} from "@/lib/mercadolivre";

interface MercadoLibreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  pictures: Array<{
    id: string;
    url: string;
    secure_url: string;
  }>;
  condition: string;
  available_quantity: number;
  description?: string;
  attributes: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  seller: {
    id: number;
    nickname: string;
  };
}

async function fetchProductFromMercadoLibre(
  item_id: string,
  access_token: string | undefined
) {
  if (!access_token) {
    throw new Error("Token de acesso do MercadoLivre não configurado.");
  }

  const headers = {
    "Authorization": `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  const url = `https://api.mercadolibre.com/items/${item_id}`;

  return await fetch(url, {
    method: "GET",
    headers: headers,
  });
}

export async function GET(req: NextRequest) {
  try {
    const item_id = req.nextUrl.searchParams.get("item_id") || "MLB3312824304";

    const accessToken = await getMercadoLivreAccessToken();

    let response = await fetchProductFromMercadoLibre(
      item_id,
      accessToken
    );

    if (response.status === 401 || response.status === 403) {
      console.log("Token inválido ou expirado no banco. Renovando...");

      const newTokens = await refreshMercadoLivreToken();

      console.log("Token renovado com sucesso. Tentando novamente...");

      response = await fetchProductFromMercadoLibre(
        item_id,
        newTokens.accessToken
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Erro na API do MercadoLivre: ${response.status} - ${errorText}`
      );
    }

    const productData: MercadoLibreProduct = await response.json();

    console.log("Produto obtido:", productData.title);

    return NextResponse.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("Erro ao buscar produto:", error);

    const isMLBuilderError = error instanceof Error && error.message.includes("MercadoLivre");

    return NextResponse.json(
      {
        success: false,
        error: isMLBuilderError 
          ? "Não foi possível carregar os dados do produto no momento. Por favor, tente novamente mais tarde." 
          : "Ocorreu um erro inesperado no servidor.",
      },
      { status: 500 }
    );
  }
}
