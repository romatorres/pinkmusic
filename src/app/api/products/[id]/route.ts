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

async function fetchProductDetailsFromMercadoLibre(itemId: string, baseUrl: string) {
  const access_token = process.env.MERCADOLIBRE_ACCESS_TOKEN;

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

  // Manipule a atualização do token se necessário
  if (response.status === 401 || response.status === 403) {
    console.log("Token inválido ou expirado ao buscar detalhes. Renovando...");
    
    // Tentar renovar o token
    const newTokens = await refreshMercadoLivreToken(baseUrl);
    
    // Usar o novo token para a nova requisição
    headers = {
      "Authorization": `Bearer ${newTokens.accessToken}`,
      "Content-Type": "application/json",
    };
    response = await fetch(url, { method: "GET", headers }); // Tentar novamente com novo token
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

    // Obter a URL base da requisição atual
    const currentUrl = new URL(req.url);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

    // Busque primeiro no banco de dados
    const productFromDb = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!productFromDb) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    // Obtenha detalhes completos da API do Mercado Livre
    const productDetailsFromMl: MercadoLibreProductDetails =
      await fetchProductDetailsFromMercadoLibre(id, baseUrl);

    // Combine dados (ou use apenas dados do ML se forem mais abrangentes para exibição)
    const combinedProduct = {
      ...productFromDb,
      ...productDetailsFromMl,
      // Garante que o link permanente do banco de dados seja usado se o do ML for diferente ou ausente
      permalink: productFromDb.permalink || productDetailsFromMl.permalink,
      // Substituir seller_nickname se o ML fornecer um mais preciso
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

export async function DELETE(
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

    // Verifique se o produto existe antes de tentar deletar
    const productExists = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!productExists) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    // Deleta o produto
    await prisma.product.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true, message: "Produto deletado com sucesso." });
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
