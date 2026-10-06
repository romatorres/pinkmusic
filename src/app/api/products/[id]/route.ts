import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  getMercadoLivreAccessToken,
  refreshMercadoLivreToken,
} from "@/lib/mercadolivre";
import { extractProductId } from "@/lib/slug";

interface MercadoLibreProductDetails {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  status?: string;
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
  const access_token = await getMercadoLivreAccessToken();

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

    const newTokens = await refreshMercadoLivreToken();

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

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de tolerância para proteger Vercel e banco

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = extractProductId(rawId);
    const forceRefresh = req.nextUrl.searchParams.get("forceRefresh") === "true";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do produto não fornecido." },
        { status: 400 }
      );
    }

    // 1. Busca base de dados locais (fonte principal de verdade)
    const productFromDb = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        brand: true,
        pictures: true,
      },
    });

    if (!productFromDb) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado no banco de dados." },
        { status: 404 }
      );
    }

    // 2. Se for produto LOCAL, usa exclusivamente os dados locais do banco sem bater no Mercado Livre
    if (productFromDb.origin === "LOCAL") {
      return NextResponse.json({
        success: true,
        data: {
          ...productFromDb,
          attributes: [],
        },
      });
    }

    // 3. Verificação de Cache Inteligente (Plano A):
    // Se a última sincronização do produto for recente (menos de 30 min) e não for forçada,
    // retorna diretamente do banco em milissegundos, economizando tráfego, Vercel e chamadas de API.
    const lastUpdate = new Date(productFromDb.updatedAt).getTime();
    const isCacheValid = Date.now() - lastUpdate < CACHE_TTL_MS;

    if (isCacheValid && !forceRefresh) {
      return NextResponse.json({
        success: true,
        data: {
          ...productFromDb,
          attributes: [],
        },
      });
    }

    // 4. Se o cache expirou (ou forceRefresh=true), busca dados frescos no Mercado Livre
    let mlData: MercadoLibreProductDetails | null = null;
    try {
      mlData = await fetchProductDetailsFromMercadoLibre(id);
    } catch (mlError) {
      // Log para monitoramento, mas não quebra a resposta caso a API do ML falhe
      console.warn(
        `[products/${id}] Não foi possível buscar dados do ML — usando banco como fallback.`,
        mlError instanceof Error ? mlError.message : mlError
      );
    }

    // 5. Sincronização e persistência no banco para renovar a janela de 30 minutos
    let finalPrice = productFromDb.price;
    let finalQuantity = productFromDb.available_quantity;

    if (mlData) {
      const freshPrice =
        typeof mlData.price === "number" ? mlData.price : productFromDb.price;
      const isMlActive = !mlData.status || mlData.status === "active";
      const freshQuantity = isMlActive
        ? (typeof mlData.available_quantity === "number"
            ? mlData.available_quantity
            : productFromDb.available_quantity)
        : 0;

      try {
        // Atualiza preço, estoque e renova o updatedAt no banco
        await prisma.product.update({
          where: { id: id },
          data: {
            price: freshPrice,
            available_quantity: freshQuantity,
            updatedAt: new Date(),
          },
        });
        finalPrice = freshPrice;
        finalQuantity = freshQuantity;
      } catch (dbUpdateError) {
        console.error(
          `[products/${id}] Erro ao persistir preço/estoque atualizados do ML no banco:`,
          dbUpdateError
        );
        finalPrice = freshPrice;
        finalQuantity = freshQuantity;
      }
    }

    const combinedProduct = mlData
      ? {
          ...productFromDb,
          price: finalPrice,
          available_quantity: finalQuantity,
          attributes: mlData.attributes ?? [],
          pictures:
            mlData.pictures?.length ? mlData.pictures : productFromDb.pictures,
          permalink: productFromDb.permalink || mlData.permalink,
          seller_nickname:
            mlData.seller?.nickname || productFromDb.seller_nickname,
        }
      : {
          ...productFromDb,
          attributes: [],
        };

    return NextResponse.json({ success: true, data: combinedProduct });
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar a requisição do produto.",
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
    const authResult = await requireAdmin(req);

    if (authResult.response) {
      return authResult.response;
    }

    const { id: rawId } = await params;
    const id = extractProductId(rawId);
    const rawData = await req.json();

    const allowedFields = [
      "code",
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
      "description",
      "descriptionSource",
      "isLocalPickup",
      "origin",
    ];

    const filteredData = Object.keys(rawData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        if (rawData[key] !== undefined) {
          if (key === "code") {
            const val = typeof rawData[key] === "string" ? rawData[key].trim() : null;
            obj[key] = val || null;
          } else if (rawData[key] !== null) {
            obj[key] = rawData[key];
          }
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
    const authResult = await requireAdmin(req);

    if (authResult.response) {
      return authResult.response;
    }

    const { id: rawId } = await params;
    const id = extractProductId(rawId);

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
