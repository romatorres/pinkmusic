import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "ALL" ou OrderStatus
    const deliveryType = searchParams.get("deliveryType"); // "ALL" | "delivery" | "pickup"
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();

    const where: Record<string, unknown> = {};

    // Filtro por status
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Filtro por tipo de entrega
    if (deliveryType && deliveryType !== "ALL") {
      where.deliveryType = deliveryType;
    }

    // Filtro por período de criação
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        (where.createdAt as Record<string, unknown>).gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = end;
      }
    }

    // Filtro por busca de texto (nome, telefone ou id)
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            code: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            title: true,
            price: true,
            quantity: true,
            thumbnail: true,
            productCode: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        deliveryRide: {
          select: {
            id: true,
            courierFee: true,
            clientFee: true,
            paymentStatus: true,
            status: true,
            courier: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Mapear códigos fiscais faltantes nos itens caso algum produto legado não tenha gravado no item
    const productIds = [
      ...new Set(orders.flatMap((order) => order.items.map((item) => item.productId))),
    ];

    const productCodeMap = new Map<string, string | null>(
      (
        await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, code: true },
        })
      ).map((product) => [product.id, product.code])
    );

    const ordersWithCodes = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        productCode: item.productCode ?? productCodeMap.get(item.productId) ?? null,
      })),
    }));

    // Cálculos consolidados e métricas
    let totalSales = 0;
    let totalDeliveryFees = 0;
    let totalProductsValue = 0;
    let paidOrdersCount = 0;
    let paidSales = 0;

    const byDeliveryType = {
      delivery: { count: 0, total: 0, fees: 0 },
      pickup: { count: 0, total: 0 },
    };

    const byStatus: Record<string, { count: number; total: number }> = {};

    for (const o of ordersWithCodes) {
      const orderTotal = o.totalAmount || 0;
      const orderFee = o.deliveryFee || 0;
      const orderProdValue = Math.max(0, orderTotal - orderFee);

      totalSales += orderTotal;
      totalDeliveryFees += orderFee;
      totalProductsValue += orderProdValue;

      // Status do pedido
      if (!byStatus[o.status]) {
        byStatus[o.status] = { count: 0, total: 0 };
      }
      byStatus[o.status].count++;
      byStatus[o.status].total += orderTotal;

      // Se for pedido pago/confirmado (excluindo cancelados e pendentes de pix)
      const isConfirmedSale =
        o.status === "PAID" ||
        o.status === "PREPARING" ||
        o.status === "DISPATCHED" ||
        o.status === "DELIVERED";

      if (isConfirmedSale) {
        paidOrdersCount++;
        paidSales += orderTotal;
      }

      // Tipo de entrega
      if (o.deliveryType === "delivery") {
        byDeliveryType.delivery.count++;
        byDeliveryType.delivery.total += orderTotal;
        byDeliveryType.delivery.fees += orderFee;
      } else {
        byDeliveryType.pickup.count++;
        byDeliveryType.pickup.total += orderTotal;
      }
    }

    const totalOrders = ordersWithCodes.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          totalSales,
          totalDeliveryFees,
          totalProductsValue,
          paidOrdersCount,
          paidSales,
          averageTicket,
          byDeliveryType,
          byStatus,
        },
        orders: ordersWithCodes,
      },
    });
  } catch (error) {
    console.error("[GET /api/orders/report] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao gerar relatório de pedidos e vendas." },
      { status: 500 }
    );
  }
}
