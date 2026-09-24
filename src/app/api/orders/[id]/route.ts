import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/mercadopago";

// GET /api/orders/[id] — polling de status do pedido (público, por ID)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        deliveryType: true,
        totalAmount: true,
        paidAt: true,
        uberTrackingUrl: true,
        mpPaymentId: true,
        productId: true,
        product: {
          select: { title: true, thumbnail: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    // Se ainda está pendente e tem ID do MP, consulta status em tempo real
    if (order.status === "PENDING_PAYMENT" && order.mpPaymentId) {
      try {
        const mpStatus = await getPaymentStatus(order.mpPaymentId);

        if (mpStatus.status === "approved") {
          if (order.productId) {
            // Fluxo legado: produto único
            await prisma.$transaction([
              prisma.order.update({
                where: { id },
                data: { status: "PAID", paidAt: mpStatus.paidAt ? new Date(mpStatus.paidAt) : new Date() },
              }),
              prisma.product.updateMany({
                where: { orders: { some: { id } }, available_quantity: { gt: 0 } },
                data: { available_quantity: { decrement: 1 }, sales: { increment: 1 } },
              }),
            ]);
          } else {
            // Fluxo novo: múltiplos itens
            const orderWithItems = await prisma.order.findUnique({
              where: { id },
              include: { items: true },
            });
            const stockUpdates = (orderWithItems?.items || []).map((item) =>
              prisma.product.update({
                where: { id: item.productId },
                data: { available_quantity: { decrement: item.quantity }, sales: { increment: item.quantity } },
              })
            );
            await prisma.$transaction([
              prisma.order.update({
                where: { id },
                data: { status: "PAID", paidAt: mpStatus.paidAt ? new Date(mpStatus.paidAt) : new Date() },
              }),
              ...stockUpdates,
            ]);
          }

          return NextResponse.json({
            success: true,
            data: { ...order, status: "PAID", paidAt: mpStatus.paidAt },
          });
        }
      } catch (mpError) {
        console.warn("[polling] Falha ao consultar MP:", mpError);
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[GET /api/orders/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao consultar pedido." },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] — atualiza status manualmente (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = [
      "PENDING_PAYMENT",
      "PAID",
      "PREPARING",
      "DISPATCHED",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status inválido." },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { product: { select: { title: true } } },
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar pedido." },
      { status: 500 }
    );
  }
}
