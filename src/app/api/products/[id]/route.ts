import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface MercadoLibreProductDetails {
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
  attributes: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  seller: {
    id: number;
    nickname: string;
  };
  permalink: string;
}

async function fetchProductDetailsFromMercadoLibre(itemId: string) {
  let access_token = process.env.MERCADOLIBRE_ACCESS_TOKEN;

  if (!access_token) {
    throw new Error("Token de acesso do MercadoLivre não configurado.");
  }

  const headers = {
    "Authorization": `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  const url = `https://api.mercadolibre.com/items/${itemId}`;

  let response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  // Handle token refresh if necessary
  if (response.status === 401 || response.status === 403) {
    console.log("Token inválido ou expirado ao buscar detalhes. Renovando...");
    const refreshResponse = await fetch(
      "http://localhost:3000/api/refreshToken",
      {
        method: "POST",
      }
    );
    const refreshResult = await refreshResponse.json();

    if (!refreshResult.success) {
      throw new Error(
        `Falha ao renovar o token: ${
          refreshResult.error || "Erro desconhecido"
        }`
      );
    }
    access_token = process.env.MERCADOLIBRE_ACCESS_TOKEN; // Get the newly updated token
    if (!access_token) {
      throw new Error(
        "Token de acesso do MercadoLivre não configurado após renovação."
      );
    }
    headers.Authorization = `Bearer ${access_token}`;
    response = await fetch(url, { method: "GET", headers: headers }); // Retry with new token
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Erro na API do MercadoLivre: ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguarde os params antes de acessar suas propriedades
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido." },
        { status: 400 }
      );
    }

    // Fetch from our database first
    const productFromDb = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!productFromDb) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    // Fetch full details from Mercado Libre API
    const productDetailsFromMl: MercadoLibreProductDetails =
      await fetchProductDetailsFromMercadoLibre(id);

    // Combine data (or just use ML data if it's more comprehensive for display)
    const combinedProduct = {
      ...productFromDb,
      ...productDetailsFromMl,
      // Ensure permalink from DB is used if ML's is different or missing
      permalink: productFromDb.permalink || productDetailsFromMl.permalink,
      // Override seller_nickname if ML provides a more accurate one
      seller_nickname:
        productDetailsFromMl.seller?.nickname || productFromDb.seller_nickname,
    };

    return NextResponse.json({ success: true, data: combinedProduct });
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguarde os params antes de acessar suas propriedades
    const { id } = await params;
    const rawData = await req.json();

    console.log("Dados recebidos:", rawData); // Debug

    // Lista dos campos válidos que podem ser atualizados no modelo Product
    const allowedFields = [
      "title",
      "price",
      "currency_id",
      "thumbnail",
      "condition",
      "available_quantity",
      "seller_nickname",
      "permalink",
      "categoryId", // Campo correto para a chave estrangeira da categoria
    ];

    // Filtrar apenas os campos que existem no schema
    const filteredData = Object.keys(rawData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        // Só adicionar campos que não são undefined ou null
        if (rawData[key] !== undefined && rawData[key] !== null) {
          obj[key] = rawData[key];
        }
        return obj;
      }, {} as Record<string, unknown>);

    console.log("Dados filtrados:", filteredData); // Debug

    // Verificar se há dados para atualizar
    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum campo válido fornecido para atualização.",
        },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: filteredData,
      include: {
        category: true, // Incluir a categoria relacionada
        pictures: true, // Incluir as imagens relacionadas
      },
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);

    // Tratar erros específicos do Prisma
    if (error instanceof Error) {
      if (error.message.includes("Unknown argument")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Campo inválido enviado para atualização. Verifique os dados enviados.",
            details: error.message,
          },
          { status: 400 }
        );
      }

      if (error.message.includes("Unique constraint failed")) {
        return NextResponse.json(
          {
            success: false,
            error: "Produto com esse permalink já existe.",
          },
          { status: 409 }
        );
      }
    }

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
