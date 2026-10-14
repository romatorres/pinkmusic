import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "Erro de configuração do servidor." },
        { status: 500 }
      );
    }

    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { id: orderId } = await params;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: user.id },
          ...(user.phone ? [{ customerPhone: user.phone }] : []),
        ],
      },
      include: {
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
        product: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            code: true,
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

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("[GET /api/customer/orders/:id] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar pedido." },
      { status: 500 }
    );
  }
}

// PATCH /api/customer/orders/:id — Cliente confirma que recebeu o pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "Erro de configuração do servidor." },
        { status: 500 }
      );
    }

    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Não autenticado." },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { id: orderId } = await params;

    // Localiza o pedido garantindo que pertença a este cliente
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { userId: user.id },
          ...(user.phone ? [{ customerPhone: user.phone }] : []),
        ],
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (order.status !== "DISPATCHED") {
      return NextResponse.json(
        { success: false, error: "Este pedido não pode ser finalizado no status atual." },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
    });

    return NextResponse.json({
      success: true,
      message: "Recebimento confirmado com sucesso!",
      data: updated,
    });
  } catch (error) {
    console.error("[PATCH /api/customer/orders/:id] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao confirmar recebimento do pedido." },
      { status: 500 }
    );
  }
}
