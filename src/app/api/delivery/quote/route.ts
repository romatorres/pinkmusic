import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDeliveryQuote } from "@/lib/uberdirect";

/**
 * POST /api/delivery/quote
 *
 * Calcula a cotação de entrega em tempo real para o checkout do cliente.
 * Aplica margem de segurança de R$ 2,00 com arredondamento para cima.
 *
 * Body esperado:
 *   { address: string, zipCode?: string, productId?: string, packageSize?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, zipCode, productId, packageSize } = body;

    if (!address || typeof address !== "string" || address.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Por favor, informe um endereço completo com rua e número.",
        },
        { status: 400 }
      );
    }

    let effectivePackageSize = packageSize || "SMALL";

    if (productId && !packageSize) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { packageSize: true },
      });
      if (product?.packageSize) {
        effectivePackageSize = product.packageSize;
      }
    }

    const dropoff = {
      street_address: address.trim(),
      city: process.env.STORE_CITY || "Feira de Santana",
      state: process.env.STORE_STATE || "BA",
      zip_code: zipCode ? String(zipCode).replace(/\D/g, "") : "",
      country: "BR",
    };

    console.log(
      `[delivery/quote] Solicitando cotação para: ${dropoff.street_address} (porte: ${effectivePackageSize})`
    );

    const quote = await getDeliveryQuote(dropoff, effectivePackageSize);

    // Custo real em reais (fee vem em centavos da Uber)
    const rawFeeReais = quote.fee / 100;

    // Removida temporariamente a taxa de R$ 2,00 a pedido para testes/investigação
    const customerFee = rawFeeReais;

    console.log(
      `[delivery/quote] Cotação OK: valor Uber = R$${rawFeeReais.toFixed(2)} | Cobrado do cliente = R$${customerFee.toFixed(2)} (taxa de R$2,00 desativada)`
    );

    return NextResponse.json({
      success: true,
      data: {
        quoteId: quote.quoteId,
        customerFee,
        rawFee: rawFeeReais,
        currency: quote.currency,
        estimatedMinutes: quote.estimatedMinutes,
        expiresAt: quote.expiresAt,
        packageSize: effectivePackageSize,
        pickup: quote.pickup,
        dropoff: quote.dropoff,
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
