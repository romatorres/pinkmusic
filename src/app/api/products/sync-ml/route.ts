import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncMercadoLivreProducts } from "@/lib/mercadolivre";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult.response) {
      return authResult.response;
    }

    let productIds: string[] | undefined = undefined;

    try {
      const body = await req.json();
      if (body && Array.isArray(body.productIds) && body.productIds.length > 0) {
        productIds = body.productIds;
      }
    } catch {
      // Body vazio ou não JSON: sincroniza todos os produtos do ML
    }

    const result = await syncMercadoLivreProducts(productIds);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${result.updated} produto(s) atualizado(s), ${result.unchanged} inalterado(s) de ${result.total} analisado(s).`,
      data: result,
    });
  } catch (error) {
    console.error("Erro na rota de sincronização do Mercado Livre:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao sincronizar com o Mercado Livre.",
      },
      { status: 500 }
    );
  }
}
