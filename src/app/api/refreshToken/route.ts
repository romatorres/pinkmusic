import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const client_id = process.env.MERCADOLIBRE_CLIENT_ID;
    const client_secret = process.env.MERCADOLIBRE_CLIENT_SECRET;

    // Tenta buscar o refresh_token do banco de dados primeiro
    const dbRefreshToken = await prisma.systemSetting.findUnique({
      where: { key: "MERCADOLIBRE_REFRESH_TOKEN" },
    });

    // Se não houver no banco, usa o do env (primeira vez)
    const refresh_token = dbRefreshToken?.value || process.env.MERCADOLIBRE_REFRESH_TOKEN;

    if (!client_id || !client_secret || !refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais do MercadoLivre não configuradas.",
        },
        { status: 500 }
      );
    }

    const url = "https://api.mercadolibre.com/oauth/token";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id,
        client_secret,
        refresh_token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ML API:", data);
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error_description || "Erro ao renovar o token.",
        },
        { status: response.status }
      );
    }

    const new_access_token = data.access_token;
    const new_refresh_token = data.refresh_token;

    // Salva os novos tokens no banco de dados para uso futuro
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: "MERCADOLIBRE_ACCESS_TOKEN" },
        update: { value: new_access_token },
        create: { key: "MERCADOLIBRE_ACCESS_TOKEN", value: new_access_token },
      }),
      prisma.systemSetting.upsert({
        where: { key: "MERCADOLIBRE_REFRESH_TOKEN" },
        update: { value: new_refresh_token },
        create: { key: "MERCADOLIBRE_REFRESH_TOKEN", value: new_refresh_token },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Token atualizado com sucesso no banco de dados!",
      accessToken: new_access_token,
      refreshToken: new_refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    });
  } catch (error) {
    console.error("Erro ao renovar token:", error);
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
