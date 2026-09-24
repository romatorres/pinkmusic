import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaff(request);
    if (authResult.response) {
      return authResult.response;
    }

    const [
      totalOrders,
      paidOrdersCount,
      pendingOrdersCount,
      preparingOrdersCount,
      dispatchedOrdersCount,
      deliveredOrdersCount,
      totalCustomers,
      totalProducts,
      paidOrdersAmounts,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
      prisma.order.count({ where: { status: "PREPARING" } }),
      prisma.order.count({ where: { status: "DISPATCHED" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.product.count(),
      prisma.order.findMany({
        where: {
          status: {
            in: ["PAID", "PREPARING", "DISPATCHED", "DELIVERED"],
          },
        },
        select: {
          totalAmount: true,
        },
      }),
    ]);

    const totalRevenue = paidOrdersAmounts.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        paidOrdersCount,
        pendingOrdersCount,
        preparingOrdersCount,
        dispatchedOrdersCount,
        deliveredOrdersCount,
        totalCustomers,
        totalProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao buscar métricas." },
      { status: 500 }
    );
  }
}
