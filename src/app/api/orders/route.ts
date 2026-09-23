import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPixPayment } from "@/lib/mercadopago";
import { requireAdmin } from "@/lib/auth";

// POST /api/orders — cria pedido e gera QR Code PIX
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      customerName,
      customerPhone,
      deliveryType,
      deliveryAddress,
      deliveryFee,
      quantity = 1,
    } = body;

    // Validação dos campos obrigatórios
    if (!productId || !customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome, WhatsApp e produto são obrigatórios." },
        { status: 400 }
      );
    }

    if (deliveryType === "delivery" && !deliveryAddress?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Endereço de entrega é obrigatório para entrega local.",
        },
        { status: 400 }
      );
    }

    // Busca o produto e verifica estoque
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    if (product.available_quantity < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: `Estoque insuficiente. Disponível: ${product.available_quantity}`,
        },
        { status: 409 }
      );
    }

    // Taxa de entrega (apenas se deliveryType === "delivery")
    const validDeliveryFee =
      deliveryType === "delivery" ? Math.max(0, Number(deliveryFee) || 0) : 0;
    const totalAmount = product.price * quantity + validDeliveryFee;

    // Cria o pedido no banco (status PENDING_PAYMENT)
    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        productId,
        quantity,
        totalAmount,
        deliveryFee: validDeliveryFee,
        deliveryType,
        deliveryAddress: deliveryAddress?.trim() || null,
        status: "PENDING_PAYMENT",
      },
    });

    // Gera o QR Code PIX no Mercado Pago com o valor total (produto + frete)
    const pixDescription =
      validDeliveryFee > 0
        ? `Pink Music - ${product.title.slice(0, 75)} (+ Entrega Uber)`
        : `Pink Music - ${product.title.slice(0, 100)}`;

    const pixResult = await createPixPayment({
      orderId: order.id,
      amount: totalAmount,
      customerName: customerName.trim(),
      description: pixDescription,
    });

    // Atualiza o pedido com os dados do pagamento MP
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        mpPaymentId: String(pixResult.id),
        mpQrCode: pixResult.qrCode,
        mpQrCodeBase64: pixResult.qrCodeBase64,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: updatedOrder.id,
        mpPaymentId: updatedOrder.mpPaymentId,
        qrCode: updatedOrder.mpQrCode,
        qrCodeBase64: updatedOrder.mpQrCodeBase64,
        totalAmount,
        expiresAt: pixResult.expiresAt,
      },
    });
  } catch (error) {
    console.error("[POST /api/orders] Erro:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao criar pedido.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// GET /api/orders — lista pedidos (somente admin autenticado)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.response) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: status ? { status: status as never } : undefined,
        include: {
          product: {
            select: { id: true, title: true, thumbnail: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: status ? { status: status as never } : undefined,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/orders] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar pedidos." },
      { status: 500 }
    );
  }
}
