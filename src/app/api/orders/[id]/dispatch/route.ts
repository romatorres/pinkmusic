import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDeliveryQuote, createDelivery } from "@/lib/uberdirect";

/**
 * GET /api/orders/[id]/dispatch
 * Retorna uma cotação de entrega Uber Direct para o pedido.
 *
 * POST /api/orders/[id]/dispatch
 * Confirma o despacho e aciona o entregador Uber Direct.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Monta endereço de entrega (simplificado — endereço livre)
    const dropoff = {
      street_address: order.deliveryAddress,
      city: process.env.STORE_CITY || "Feira de Santana",
      state: process.env.STORE_STATE || "BA",
      zip_code: (process.env.STORE_ZIP || "44002000").replace(/\D/g, ""),
      country: "BR",
    };

    // packageSize: usa o do produto (legado) ou SMALL como fallback
    const effectivePackageSize = order.product?.packageSize || "SMALL";

    const quote = await getDeliveryQuote(dropoff, effectivePackageSize);

    return NextResponse.json({
      success: true,
      data: {
        ...quote,
        packageSize: effectivePackageSize,
        items: order.items && order.items.length > 0 ? order.items : undefined,
      },
    });
  } catch (error) {
    console.error("[GET dispatch] Erro:", error);
    const msg = error instanceof Error ? error.message : "Erro ao obter cotação.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quoteId } = body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        product: { select: { title: true, packageSize: true } },
        items: {
          select: {
            title: true,
            quantity: true,
            productCode: true,
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

    if (order.status !== "PREPARING" && order.status !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          error: `Não é possível despachar pedido com status ${order.status}.`,
        },
        { status: 400 }
      );
    }

    if (!order.deliveryAddress) {
      return NextResponse.json(
        { success: false, error: "Endereço de entrega não informado." },
        { status: 400 }
      );
    }

    const dropoff = {
      street_address: order.deliveryAddress,
      city: process.env.STORE_CITY || "Feira de Santana",
      state: process.env.STORE_STATE || "BA",
      zip_code: (process.env.STORE_ZIP || "44002000").replace(/\D/g, ""),
      country: "BR",
    };

    // Monta título ou manifesto para o motorista Uber
    let itemsDescription = "Pedido Pink Music";
    if (order.items && order.items.length > 0) {
      itemsDescription = order.items
        .map((i) => `${i.quantity}x ${i.title}`)
        .join(", ");
    } else if (order.product?.title) {
      itemsDescription = order.product.title;
    }

    const delivery = await createDelivery({
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      dropoff,
      quoteId,
      productTitle: itemsDescription,
      packageSize: order.product?.packageSize || "SMALL",
    });

    // Atualiza pedido com dados da entrega Uber
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "DISPATCHED",
        uberDeliveryId: delivery.deliveryId,
        uberTrackingUrl: delivery.trackingUrl,
        uberDispatchedAt: new Date(),
        uberCourierName: delivery.courierName || null,
        uberCourierPhone: delivery.courierPhone || null,
        uberVehicleType: delivery.vehicleType || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        uberDeliveryId: delivery.deliveryId,
        trackingUrl: delivery.trackingUrl,
        courierName: delivery.courierName,
        courierPhone: delivery.courierPhone,
        vehicleType: delivery.vehicleType,
      },
    });
  } catch (error) {
    console.error("[POST dispatch] Erro:", error);
    const msg = error instanceof Error ? error.message : "Erro ao criar entrega.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
