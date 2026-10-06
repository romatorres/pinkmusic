import { NextResponse } from "next/server";

/**
 * Webhook Uber Direct desativado.
 * Retorna 200 para evitar retentativas de serviços externos legados.
 */
export async function POST() {
  return NextResponse.json({ received: true, status: "disabled" });
}
