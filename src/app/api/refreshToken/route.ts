import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshMercadoLivreToken } from "@/lib/mercadolivre";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);

    if (authResult.response) {
      return authResult.response;
    }

    const result = await refreshMercadoLivreToken();

    return NextResponse.json({
      success: true,
      message: "Token do Mercado Livre renovado e atualizado no banco de dados com sucesso.",
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    });
  } catch (error) {
    console.error("Erro ao renovar token do Mercado Livre:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor.",
      },
      { status: 500 }
    );
  }
}
