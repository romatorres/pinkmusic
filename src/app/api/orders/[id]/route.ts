import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/mercadopago";
import { requireStaff } from "@/lib/auth";
import { notifyOrderConfirmed } from "@/lib/firebase/notifications";
import { confirmOrderPayment } from "@/lib/orders/confirm-order-payment";

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
      let paymentApproved = false;
      let confirmedPaidAt: Date | undefined;

      try {
        const mpStatus = await getPaymentStatus(order.mpPaymentId);
        if (mpStatus.status === "approved") {
          paymentApproved = true;
          confirmedPaidAt = mpStatus.paidAt
            ? new Date(mpStatus.paidAt)
            : new Date();
        }
      } catch (mpError) {
        console.warn("[polling] Falha ao consultar MP:", mpError);
      }

      if (paymentApproved) {
        const transitioned = await confirmOrderPayment(id, {
          paidAt: confirmedPaidAt ?? new Date(),
        });

        if (transitioned) {
          try {
            await notifyOrderConfirmed(id);
          } catch (pushErr) {
            console.error("[Polling] Erro ao disparar push:", pushErr);
          }
        }

        const currentOrder = await prisma.order.findUnique({
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

        if (!currentOrder) {
          return NextResponse.json(
            { success: false, error: "Pedido não encontrado." },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, data: currentOrder });
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

// PATCH /api/orders/[id] — atualiza status manualmente (somente equipe: admin e funcionário)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) {
      return authResult.response;
    }

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

    let order;
    if (status === "PAID") {
      await confirmOrderPayment(id, { paidAt: new Date() });
      order = await prisma.order.findUnique({
        where: { id },
        include: { product: { select: { title: true } } },
      });

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Pedido não encontrado." },
          { status: 404 }
        );
      }

      if (order.status !== "PAID") {
        return NextResponse.json(
          { success: false, error: "Não é possível confirmar o pagamento neste status." },
          { status: 409 }
        );
      }
    } else {
      order = await prisma.order.update({
        where: { id },
        data: { status },
        include: { product: { select: { title: true } } },
      });

      // Sincroniza a corrida atrelada se for DELIVERED ou CANCELLED
      if (status === "DELIVERED") {
        await prisma.deliveryRide.updateMany({
          where: { orderId: id, status: { not: "CANCELLED" } },
          data: { status: "DELIVERED", deliveredAt: new Date() },
        });
      } else if (status === "CANCELLED") {
        await prisma.deliveryRide.updateMany({
          where: { orderId: id },
          data: { status: "CANCELLED" },
        });
      }
    }

    if (status === "PAID") {
      try {
        await notifyOrderConfirmed(id);
      } catch (pushErr) {
        console.error("[PATCH /api/orders/[id]] Erro ao disparar push:", pushErr);
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar pedido." },
      { status: 500 }
    );
  }
}
