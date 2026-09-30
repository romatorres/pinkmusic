import prisma from "@/lib/prisma";

export interface MercadoLivreTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tokenType?: string;
}

/**
 * Obtém o access_token atual do Mercado Livre, priorizando o banco de dados.
 */
export async function getMercadoLivreAccessToken(): Promise<string | undefined> {
  const dbAccessToken = await prisma.systemSetting.findUnique({
    where: { key: "MERCADOLIBRE_ACCESS_TOKEN" },
  });

  return dbAccessToken?.value || process.env.MERCADOLIBRE_ACCESS_TOKEN;
}

/**
 * Renova o access_token e o refresh_token do Mercado Livre diretamente no servidor
 * e atualiza o banco de dados.
 */
export async function refreshMercadoLivreToken(): Promise<MercadoLivreTokenResult> {
  const client_id = process.env.MERCADOLIBRE_CLIENT_ID;
  const client_secret = process.env.MERCADOLIBRE_CLIENT_SECRET;

  const dbRefreshToken = await prisma.systemSetting.findUnique({
    where: { key: "MERCADOLIBRE_REFRESH_TOKEN" },
  });

  const refresh_token =
    dbRefreshToken?.value || process.env.MERCADOLIBRE_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      "Credenciais do Mercado Livre (client_id, client_secret ou refresh_token) não configuradas."
    );
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: client_id.trim(),
      client_secret: client_secret.trim(),
      refresh_token: refresh_token.trim(),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro na renovação do token do Mercado Livre:", data);
    throw new Error(
      data.message || data.error_description || "Falha ao renovar token na API do Mercado Livre."
    );
  }

  const newAccessToken: string = data.access_token;
  const newRefreshToken: string = data.refresh_token;

  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: "MERCADOLIBRE_ACCESS_TOKEN" },
      update: { value: newAccessToken },
      create: { key: "MERCADOLIBRE_ACCESS_TOKEN", value: newAccessToken },
    }),
    prisma.systemSetting.upsert({
      where: { key: "MERCADOLIBRE_REFRESH_TOKEN" },
      update: { value: newRefreshToken },
      create: { key: "MERCADOLIBRE_REFRESH_TOKEN", value: newRefreshToken },
    }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

export interface MercadoLivreSyncResult {
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
  details: Array<{
    id: string;
    oldPrice: number;
    newPrice: number;
    oldQty: number;
    newQty: number;
  }>;
}

/**
 * Sincroniza em lote os preços e estoques de produtos do Mercado Livre com o banco de dados local.
 * Utiliza a API multiget do Mercado Livre (/items?ids=...) em lotes de até 20 produtos por chamada.
 */
export async function syncMercadoLivreProducts(
  productIds?: string[]
): Promise<MercadoLivreSyncResult> {
  let accessToken = await getMercadoLivreAccessToken();
  if (!accessToken) {
    const refreshed = await refreshMercadoLivreToken();
    accessToken = refreshed.accessToken;
  }

  const products = await prisma.product.findMany({
    where: {
      origin: "MERCADO_LIVRE",
      ...(productIds && productIds.length > 0 ? { id: { in: productIds } } : {}),
    },
    select: {
      id: true,
      price: true,
      available_quantity: true,
    },
  });

  const result: MercadoLivreSyncResult = {
    total: products.length,
    updated: 0,
    unchanged: 0,
    errors: 0,
    details: [],
  };

  if (products.length === 0) {
    return result;
  }

  const BATCH_SIZE = 20;
  const batches: (typeof products)[] = [];
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    batches.push(products.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const ids = batch.map((p) => p.id).join(",");
    const url = `https://api.mercadolibre.com/items?ids=${ids}&attributes=id,price,available_quantity,status`;

    try {
      let response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        console.log("Token expirado durante sincronização em lote. Renovando...");
        const refreshed = await refreshMercadoLivreToken();
        accessToken = refreshed.accessToken;
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      if (!response.ok) {
        console.error(`Erro ao consultar lote ML: ${response.status}`);
        result.errors += batch.length;
        continue;
      }

      const mlItems: Array<{
        code: number;
        body?: {
          id: string;
          price?: number;
          available_quantity?: number;
          status?: string;
        };
      }> = await response.json();

      for (const item of mlItems) {
        if (item.code !== 200 || !item.body || !item.body.id) {
          result.errors++;
          continue;
        }

        const productInDb = batch.find((p) => p.id === item.body?.id);
        if (!productInDb) continue;

        const freshPrice =
          typeof item.body.price === "number" ? item.body.price : productInDb.price;
        const isMlActive = !item.body.status || item.body.status === "active";
        const freshQuantity = isMlActive
          ? (typeof item.body.available_quantity === "number"
              ? item.body.available_quantity
              : productInDb.available_quantity)
          : 0;

        if (
          freshPrice !== productInDb.price ||
          freshQuantity !== productInDb.available_quantity
        ) {
          await prisma.product.update({
            where: { id: productInDb.id },
            data: {
              price: freshPrice,
              available_quantity: freshQuantity,
            },
          });

          result.updated++;
          result.details.push({
            id: productInDb.id,
            oldPrice: productInDb.price,
            newPrice: freshPrice,
            oldQty: productInDb.available_quantity,
            newQty: freshQuantity,
          });
        } else {
          result.unchanged++;
        }
      }
    } catch (batchError) {
      console.error("Erro no processamento do lote do Mercado Livre:", batchError);
      result.errors += batch.length;
    }
  }

  return result;
}

