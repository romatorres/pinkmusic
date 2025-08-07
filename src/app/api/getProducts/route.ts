import { NextRequest, NextResponse } from "next/server";

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

/* interface ApiResponse {
  success: boolean;
  data?: MercadoLibreProduct;
  error?: string;
} */

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

    let response = await fetchProductFromMercadoLibre(
      item_id,
      process.env.MERCADOLIBRE_ACCESS_TOKEN
    );

    if (response.status === 401 || response.status === 403) {
      console.log("Token inválido ou expirado. Renovando...");

      // Obter a URL base da requisição atual
      const currentUrl = new URL(req.url);
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

      const refreshResponse = await fetch(`${baseUrl}/api/refreshToken`, {
        method: "POST",
      });

      const refreshResult = await refreshResponse.json();

      if (!refreshResult.success) {
        throw new Error(
          `Falha ao renovar o token: ${refreshResult.error || "Erro desconhecido"}`
        );
      }

      console.log("Token renovado com sucesso. Tentando novamente...");

      // Tenta novamente com o novo token
      response = await fetchProductFromMercadoLibre(
        item_id,
        process.env.MERCADOLIBRE_ACCESS_TOKEN
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

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
