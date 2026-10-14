import prisma from "@/lib/prisma";

interface ConfirmOrderPaymentOptions {
  paidAt: Date;
  mpPaymentId?: string;
}

export async function confirmOrderPayment(
  orderId: string,
  { paidAt, mpPaymentId }: ConfirmOrderPaymentOptions
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const transition = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: {
        status: "PAID",
        paidAt,
        ...(mpPaymentId ? { mpPaymentId } : {}),
      },
    });

    if (transition.count === 0) {
      return false;
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        productId: true,
        quantity: true,
        items: {
          select: { productId: true, quantity: true },
        },
      },
    });

    if (!order) {
      throw new Error(`Pedido ${orderId} não encontrado após confirmar pagamento.`);
    }

    if (order.productId) {
      await tx.product.update({
        where: { id: order.productId },
        data: {
          available_quantity: { decrement: order.quantity },
          sales: { increment: order.quantity },
        },
      });
    } else {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            available_quantity: { decrement: item.quantity },
            sales: { increment: item.quantity },
          },
        });
      }
    }

    return true;
  });
}
