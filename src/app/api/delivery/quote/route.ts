import { NextRequest, NextResponse } from "next/server";
import { getDeliveryQuote } from "@/lib/uberdirect";

/**
 * POST /api/delivery/quote
 *
 * Calcula a cotação de entrega em tempo real para o checkout do cliente.
 * Aplica margem de segurança de R$ 2,00 com arredondamento para cima.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Por favor, informe um endereço completo com rua e número.",
        },
        { status: 400 }
      );
    }

    const dropoff = {
      street_address: address.trim(),
      city: process.env.STORE_CITY || "Feira de Santana",
      state: process.env.STORE_STATE || "BA",
      zip_code: process.env.STORE_ZIP || "44001-000",
      country: "BR",
    };

    const quote = await getDeliveryQuote(dropoff);

    // Custo real em reais (fee vem em centavos da Uber)
    const rawFeeReais = quote.fee / 100;

    // Regra da margem de segurança: + R$ 2,00 e arredondamento para o próximo real
    // Ex: R$ 12,40 + R$ 2,00 = R$ 14,40 -> R$ 15,00
    const customerFee = Math.ceil(rawFeeReais + 2.0);

    return NextResponse.json({
      success: true,
      data: {
        quoteId: quote.quoteId,
        customerFee,
        rawFee: rawFeeReais,
        estimatedMinutes: quote.estimatedMinutes,
        expiresAt: quote.expiresAt,
      },
    });
  } catch (error) {
    console.error("[POST /api/delivery/quote] Erro:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Não foi possível cotar a entrega com a Uber para este endereço.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
