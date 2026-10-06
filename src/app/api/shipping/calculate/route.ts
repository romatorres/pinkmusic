import { NextRequest, NextResponse } from "next/server";
import { calculateShipping } from "@/lib/shipping/calculate-shipping";
import { checkCustomRateLimit } from "@/lib/authValidation";

/**
 * POST /api/shipping/calculate
 *
 * Endpoint público para cálculo de frete local com regras de zonas e distância.
 *
 * Body esperado:
 *   { "zipCode": "44002-000" }
 */
export async function POST(request: NextRequest) {
  try {
    const isAllowed = checkCustomRateLimit(request, "shipping_calculate", 30, 60 * 1000);
    if (!isAllowed) {
      return NextResponse.json(
        {
          available: false,
          reason: "RATE_LIMIT_EXCEEDED",
          message: "Muitas consultas de frete em pouco tempo. Aguarde um instante.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { zipCode } = body;

    if (!zipCode || typeof zipCode !== "string") {
      return NextResponse.json(
        {
          available: false,
          reason: "INVALID_ZIP_CODE",
          message: "Informe um CEP válido.",
        },
        { status: 400 }
      );
    }

    const result = await calculateShipping(zipCode);

    if (!result.available) {
      const statusCode = result.reason === "INVALID_ZIP_CODE" ? 400 : 200;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[POST /api/shipping/calculate] Erro:", error);
    return NextResponse.json(
      {
        available: false,
        reason: "INTERNAL_ERROR",
        message: "Erro interno ao processar cálculo de frete.",
      },
      { status: 500 }
    );
  }
}
