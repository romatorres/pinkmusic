import { NextRequest, NextResponse } from "next/server";
import { calculateShipping } from "@/lib/shipping/calculate-shipping";
import { checkCustomRateLimit } from "@/lib/authValidation";

/**
 * POST /api/delivery/quote
 *
 * Rota mantida para retrocompatibilidade com cotações locais.
 * Delega o cálculo para o serviço de frete local baseado em zonas e CEPs.
 */
export async function POST(request: NextRequest) {
  try {
    const isAllowed = checkCustomRateLimit(request, "delivery_quote", 30, 60 * 1000);
    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Muitas solicitações de cotação. Aguarde um instante.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { zipCode, address } = body;

    const targetZip = zipCode || address;

    if (!targetZip) {
      return NextResponse.json(
        {
          success: false,
          error: "Informe o CEP ou endereço para cálculo de frete.",
        },
        { status: 400 }
      );
    }

    const quote = await calculateShipping(targetZip);

    if (!quote.available) {
      return NextResponse.json(
        {
          success: false,
          error: quote.message || "Desculpe, ainda não realizamos entregas nesta região.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        customerFee: quote.price,
        rawFee: quote.price,
        zone: quote.zone,
        distanceKm: quote.distanceKm,
        district: quote.district,
        city: quote.city,
        state: quote.state,
      },
    });
  } catch (error) {
    console.error("[POST /api/delivery/quote] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao calcular frete." },
      { status: 500 }
    );
  }
}
