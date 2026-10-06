import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

/**
 * GET /api/orders/[id]/dispatch
 * Retorna as informações de entrega local do pedido para a equipe.
 *
 * POST /api/orders/[id]/dispatch
 * Confirma o despacho e marca o pedido como DISPATCHED (Entrega Local Própria).
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: { select: { title: true, packageSize: true } },
        items: {
          select: {
            id: true,
            title: true,
            quantity: true,
            price: true,
            productCode: true,
            thumbnail: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (order.deliveryType !== "delivery") {
      return NextResponse.json(
        { success: false, error: "Este pedido é retirada na loja — não requer entrega." },
        { status: 400 }
      );
    }

    if (!order.deliveryAddress) {
      return NextResponse.json(
        { success: false, error: "Endereço de entrega não informado no pedido." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryFee: order.deliveryFee,
        shippingCep: order.shippingCep,
        shippingZone: order.shippingZone,
        shippingDistance: order.shippingDistance,
        shippingMethod: order.shippingMethod || "LOCAL_DELIVERY",
        packageSize: order.product?.packageSize || "SMALL",
        items: order.items && order.items.length > 0 ? order.items : undefined,
      },
    });
  } catch (error) {
    console.error("[GET dispatch] Erro:", error);
    const msg = error instanceof Error ? error.message : "Erro ao obter dados de entrega.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { courierName, courierPhone } = body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (order.status !== "PREPARING" && order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          error: `Não é possível despachar pedido com status ${order.status}.`,
        },
        { status: 400 }
      );
    }

    // Atualiza pedido para DISPATCHED com entregador local próprio
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "DISPATCHED",
        uberDispatchedAt: new Date(),
        uberCourierName: courierName?.trim() || "Entregador da Loja",
        uberCourierPhone: courierPhone?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        courierName: updatedOrder.uberCourierName,
        courierPhone: updatedOrder.uberCourierPhone,
        dispatchedAt: updatedOrder.uberDispatchedAt,
      },
    });
  } catch (error) {
    console.error("[POST dispatch] Erro:", error);
    const msg = error instanceof Error ? error.message : "Erro ao despachar pedido.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
