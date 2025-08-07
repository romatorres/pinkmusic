import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

    // Atualizar o arquivo .env.local
    const envPath = path.resolve(process.cwd(), ".env.local");
    let envFileContent = fs.readFileSync(envPath, "utf8");

    envFileContent = envFileContent.replace(
      /^MERCADOLIBRE_ACCESS_TOKEN=.*/m,
      `MERCADOLIBRE_ACCESS_TOKEN=${new_access_token}`
    );
    envFileContent = envFileContent.replace(
      /^MERCADOLIBRE_REFRESH_TOKEN=.*/m,
      `MERCADOLIBRE_REFRESH_TOKEN=${new_refresh_token}`
    );

    fs.writeFileSync(envPath, envFileContent);

    // Atualizar as variáveis de ambiente no processo atual
    process.env.MERCADOLIBRE_ACCESS_TOKEN = new_access_token;
    process.env.MERCADOLIBRE_REFRESH_TOKEN = new_refresh_token;

    return NextResponse.json({
      success: true,
      message: "Token atualizado com sucesso!",
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
