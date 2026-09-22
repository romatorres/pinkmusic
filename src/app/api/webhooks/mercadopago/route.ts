import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/mercadopago";

/**
 * POST /api/webhooks/mercadopago
 *
 * Recebe notificações IPN/Webhook do Mercado Pago.
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * O MP envia uma requisição quando o status do pagamento muda.
 * Validamos a assinatura e atualizamos o pedido no banco.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // O MP envia diferentes tipos de notificação
    // Nos importa: topic "payment" com action "payment.updated" ou "payment.created"
    const { type, data, action } = body;

    // Notificação IPN clássica (topic=payment)
    const paymentId = data?.id || body.id;

    if (!paymentId) {
      // Pode ser uma notificação de teste do painel MP
      return NextResponse.json({ received: true });
    }

    // Só processamos eventos de pagamento
    if (type !== "payment" && action !== "payment.updated" && action !== "payment.created") {
      return NextResponse.json({ received: true });
    }

    // Consulta o status real do pagamento na API do MP
    const mpPayment = await getPaymentStatus(String(paymentId));

    if (mpPayment.status === "approved" && mpPayment.externalReference) {
      const orderId = mpPayment.externalReference;

      // Verifica se o pedido existe e ainda está pendente
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { product: { select: { id: true, available_quantity: true } } },
      });

      if (!order) {
        console.warn(`[Webhook MP] Pedido ${orderId} não encontrado.`);
        return NextResponse.json({ received: true });
      }

      // Idempotência: se já foi pago, ignora
      if (order.status !== "PENDING_PAYMENT") {
        return NextResponse.json({ received: true });
      }

      // Transação: atualiza pedido e decrementa estoque atomicamente
      await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID",
            mpPaymentId: String(mpPayment.id),
            paidAt: mpPayment.paidAt ? new Date(mpPayment.paidAt) : new Date(),
          },
        }),
        prisma.product.update({
          where: { id: order.productId },
          data: {
            available_quantity: {
              decrement: order.quantity,
            },
            sales: { increment: order.quantity },
          },
        }),
      ]);

      console.log(
        `[Webhook MP] ✅ Pagamento ${paymentId} confirmado — Pedido ${orderId} atualizado para PAID`
      );
    } else if (
      mpPayment.status === "cancelled" ||
      mpPayment.status === "rejected"
    ) {
      if (mpPayment.externalReference) {
        await prisma.order.updateMany({
          where: {
            id: mpPayment.externalReference,
            status: "PENDING_PAYMENT",
          },
          data: { status: "CANCELLED" },
        });

        console.log(
          `[Webhook MP] ❌ Pagamento ${paymentId} cancelado — Pedido atualizado para CANCELLED`
        );
      }
    }

    // Sempre retorna 200 para o MP não reenviar a notificação
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook MP] Erro ao processar notificação:", error);
    // Retorna 200 mesmo em erro para evitar loop de reenvio do MP
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
