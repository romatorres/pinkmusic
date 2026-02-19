import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

async function refreshMercadoLivreToken(baseUrl: string) {
  try {
    const refreshResponse = await fetch(`${baseUrl}/api/refreshToken`, {
      method: "POST",
    });

    const refreshResult = await refreshResponse.json();

    if (!refreshResult.success) {
      throw new Error(
        `Falha ao renovar o token: ${
          refreshResult.error || "Erro desconhecido"
        }`
      );
    }

    return {
      accessToken: refreshResult.accessToken,
      refreshToken: refreshResult.refreshToken,
    };
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    throw error;
  }
}

async function fetchProductDetailsFromMercadoLibre(
  itemId: string,
  baseUrl: string
) {
  // Busca o token do banco de dados primeiro
  const dbAccessToken = await prisma.systemSetting.findUnique({
    where: { key: "MERCADOLIBRE_ACCESS_TOKEN" },
  });

  const access_token = dbAccessToken?.value || process.env.MERCADOLIBRE_ACCESS_TOKEN;

  if (!access_token) {
    throw new Error("Token de acesso do MercadoLivre não configurado.");
  }

  let headers = {
    "Authorization": `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  const url = `https://api.mercadolibre.com/items/${itemId}`;

  let response = await fetch(url, {
    method: "GET",
    headers: headers,
  });

  if (response.status === 401 || response.status === 403) {
    console.log("Token inválido ou expirado ao buscar detalhes. Renovando...");

    const newTokens = await refreshMercadoLivreToken(baseUrl);

    headers = {
      "Authorization": `Bearer ${newTokens.accessToken}`,
      "Content-Type": "application/json",
    };
    response = await fetch(url, { method: "GET", headers });
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
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido." },
        { status: 400 }
      );
    }

    const currentUrl = new URL(req.url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    const productFromDb = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        brand: true, // NOVO: Incluir marca
        pictures: true,
      },
    });

    if (!productFromDb) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    const productDetailsFromMl: MercadoLibreProductDetails =
      await fetchProductDetailsFromMercadoLibre(id, baseUrl);

    const combinedProduct = {
      ...productFromDb,
      ...productDetailsFromMl,
      permalink: productFromDb.permalink || productDetailsFromMl.permalink,
      seller_nickname:
        productDetailsFromMl.seller?.nickname || productFromDb.seller_nickname,
    };

    return NextResponse.json({ success: true, data: combinedProduct });
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    
    const isMLBuilderError = error instanceof Error && error.message.includes("MercadoLivre");

    return NextResponse.json(
      {
        success: false,
        error: isMLBuilderError 
          ? "Não foi possível sincronizar os detalhes do produto com o Mercado Livre. Tente novamente em alguns instantes." 
          : "Erro ao processar a requisição do produto.",
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
    const { id } = await params;
    const rawData = await req.json();

    const allowedFields = [
      "title",
      "price",
      "currency_id",
      "thumbnail",
      "condition",
      "available_quantity",
      "seller_nickname",
      "permalink",
      "categoryId",
      "brandId", // NOVO: Permitir atualizar marca
    ];

    const filteredData = Object.keys(rawData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        if (rawData[key] !== undefined && rawData[key] !== null) {
          obj[key] = rawData[key];
        }
        return obj;
      }, {} as Record<string, unknown>);

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
        category: true,
        brand: true, // NOVO: Incluir marca na resposta
        pictures: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido." },
        { status: 400 }
      );
    }

    const productExists = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!productExists) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Produto deletado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
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
