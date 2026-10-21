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
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (courierId && courierId !== "ALL") {
      where.courierId = courierId;
    }

    if (status && status !== "ALL") {
      where.status = status;
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

    const rides = await prisma.deliveryRide.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      include: {
        courier: true,
        order: {
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            shippingDistance: true,
            shippingZone: true,
            shippingPrice: true,
            deliveryFee: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: rides,
    });
  } catch (error) {
    console.error("Erro ao buscar corridas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const body = await req.json();
    const { orderId, courierId, courierFee, notes } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "ID do pedido é obrigatório." },
        { status: 400 }
      );
    }

    if (!courierId) {
      return NextResponse.json(
        { success: false, error: "Selecione o profissional (motoboy)." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveryRide: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      return NextResponse.json(
        { success: false, error: "Motoboy não encontrado." },
        { status: 404 }
      );
    }

    const finalClientFee = Number(order.shippingPrice || order.deliveryFee || 0);
    const parsedCourierFee =
      courierFee !== undefined && courierFee !== null
        ? Number(courierFee)
        : finalClientFee;

    // Se já existia uma corrida atrelada ao pedido, faz upsert/atualização
    let ride;
    if (order.deliveryRide) {
      ride = await prisma.deliveryRide.update({
        where: { id: order.deliveryRide.id },
        data: {
          courierId: courier.id,
          courierFee: parsedCourierFee,
          clientFee: finalClientFee,
          distanceKm: order.shippingDistance || null,
          status: "ASSIGNED",
          notes: notes?.trim() || null,
          assignedAt: new Date(),
        },
        include: { courier: true, order: true },
      });
    } else {
      ride = await prisma.deliveryRide.create({
        data: {
          orderId: order.id,
          courierId: courier.id,
          clientFee: finalClientFee,
          courierFee: parsedCourierFee,
          distanceKm: order.shippingDistance || null,
          status: "ASSIGNED",
          notes: notes?.trim() || null,
        },
        include: { courier: true, order: true },
      });
    }

    // Atualiza o pedido com informações do entregador e status DISPATCHED se ainda for PREPARING/PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status:
          order.status === "PAID" || order.status === "PREPARING"
            ? "DISPATCHED"
            : order.status,
        uberCourierName: courier.name,
        uberCourierPhone: courier.phone,
        uberVehicleType: courier.vehicle || "Moto",
      },
    });

    return NextResponse.json({
      success: true,
      data: ride,
      message: `Corrida atribuída com sucesso a ${courier.name}!`,
    });
  } catch (error) {
    console.error("Erro ao atribuir corrida:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao atribuir corrida",
      },
      { status: 500 }
    );
  }
}
