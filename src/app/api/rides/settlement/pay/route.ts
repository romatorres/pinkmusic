import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await req.json();
    const { rideIds, courierId, startDate, endDate, markAsPaid } = body;

    const isPaid = markAsPaid !== undefined ? Boolean(markAsPaid) : true;
    const paymentBatchId = `batch_${Date.now()}`;

    // Opção 1: Liquidar IDs de corridas específicos selecionados
    if (Array.isArray(rideIds) && rideIds.length > 0) {
      const result = await prisma.deliveryRide.updateMany({
        where: {
          id: { in: rideIds },
        },
        data: {
          paymentStatus: isPaid ? "PAID" : "PENDING",
          paidAt: isPaid ? new Date() : null,
          paymentBatchId: isPaid ? paymentBatchId : null,
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} corrida(s) ${isPaid ? "marcadas como pagas" : "estornadas para pendente"} com sucesso!`,
      });
    }

    // Opção 2: Liquidar todas as corridas pendentes do motoboy no período selecionado
    if (courierId) {
      const where: Record<string, unknown> = {
        courierId,
        paymentStatus: isPaid ? "PENDING" : "PAID",
      };

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

      const result = await prisma.deliveryRide.updateMany({
        where,
        data: {
          paymentStatus: isPaid ? "PAID" : "PENDING",
          paidAt: isPaid ? new Date() : null,
          paymentBatchId: isPaid ? paymentBatchId : null,
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} corrida(s) ${isPaid ? "liquidadas com sucesso" : "revertidas"} para o motoboy!`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Nenhuma corrida ou profissional especificado para liquidação." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao liquidar corridas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao liquidar corridas",
      },
      { status: 500 }
    );
  }
}
