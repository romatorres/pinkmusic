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
