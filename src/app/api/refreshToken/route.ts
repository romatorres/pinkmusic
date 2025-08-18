import { NextResponse } from "next/server";

export async function POST() {
  try {
    const client_id = process.env.MERCADOLIBRE_CLIENT_ID;
    const client_secret = process.env.MERCADOLIBRE_CLIENT_SECRET;
    const refresh_token = process.env.MERCADOLIBRE_REFRESH_TOKEN;

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
      throw new Error(data.message || "Erro ao renovar o token.");
    }

    const new_access_token = data.access_token;
    const new_refresh_token = data.refresh_token;

    return NextResponse.json({
      success: true,
      message: "Token atualizado com sucesso!",
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
