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
    const courierId = searchParams.get("courierId");
    const paymentStatus = searchParams.get("paymentStatus"); // "PENDING" | "PAID" | "ALL"
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (courierId && courierId !== "ALL") {
      where.courierId = courierId;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      where.assignedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        (where.assignedAt as Record<string, unknown>).gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.assignedAt as Record<string, unknown>).lte = end;
      }
    }

    const [rides, courierSummary] = await Promise.all([
      prisma.deliveryRide.findMany({
        where,
        orderBy: { assignedAt: "desc" },
        include: {
          courier: {
            select: {
              id: true,
              name: true,
              phone: true,
              pixKey: true,
              pixKeyType: true,
              vehicle: true,
              plate: true,
            },
          },
          order: {
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              deliveryAddress: true,
              shippingDistance: true,
              shippingZone: true,
              totalAmount: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      // Resumo consolidado de todas as corridas no filtro
      prisma.deliveryRide.groupBy({
        by: ["courierId", "paymentStatus"],
        where,
        _count: { id: true },
        _sum: { courierFee: true, clientFee: true },
      }),
    ]);

    // Totais gerais
    let totalRides = 0;
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;
    let totalPendingCount = 0;
    let totalPaidCount = 0;

    for (const r of rides) {
      totalRides++;
      if (r.paymentStatus === "PENDING") {
        totalPendingAmount += r.courierFee;
        totalPendingCount++;
      } else if (r.paymentStatus === "PAID") {
        totalPaidAmount += r.courierFee;
        totalPaidCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rides,
        metrics: {
          totalRides,
          totalPendingAmount,
          totalPendingCount,
          totalPaidAmount,
          totalPaidCount,
        },
        courierSummary,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de fechamento:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar fechamento",
      },
      { status: 500 }
    );
  }
}
