import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createPixPayment } from "@/lib/mercadopago";
import { requireStaff } from "@/lib/auth";
import * as jose from "jose";

// Helper para extrair userId do cookie JWT (opcional - para clientes autenticados)
async function extractUserId(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token || !process.env.JWT_SECRET) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return (payload.userId as string) || null;
  } catch {
    return null;
  }
}

// POST /api/orders — cria pedido (produto único ou múltiplos itens) e gera QR Code PIX
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Fluxo novo: múltiplos itens do carrinho
      items,
      // Fluxo legado: produto único
      productId,
      quantity = 1,
      // Dados comuns
      customerName,
      customerPhone,
      deliveryType,
      deliveryAddress,
      deliveryFee,
    } = body;

    if (!customerName?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome e WhatsApp são obrigatórios." },
        { status: 400 }
      );
    }

    if (deliveryType === "delivery" && !deliveryAddress?.trim()) {
      return NextResponse.json(
        { success: false, error: "Endereço de entrega é obrigatório para entrega local." },
        { status: 400 }
      );
    }

    const validDeliveryFee =
      deliveryType === "delivery" ? Math.max(0, Number(deliveryFee) || 0) : 0;

    // Extrai userId do cliente autenticado (opcional)
    const userId = await extractUserId(request);

    // ── FLUXO NOVO: múltiplos itens do carrinho ──────────────────────────────
    if (items && Array.isArray(items) && items.length > 0) {
      // Valida e busca todos os produtos
      const productIds: string[] = items.map((i: { productId: string }) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, price: true, thumbnail: true, code: true, available_quantity: true },
      });

      // Verificar se todos os produtos existem e têm estoque
      for (const orderItem of items) {
        const product = products.find((p) => p.id === orderItem.productId);
        if (!product) {
          return NextResponse.json(
            { success: false, error: `Produto não encontrado: ${orderItem.productId}` },
            { status: 404 }
          );
        }
        if (product.available_quantity < orderItem.quantity) {
          return NextResponse.json(
            { success: false, error: `Estoque insuficiente para: ${product.title}` },
            { status: 409 }
          );
        }
      }

      // Calcula subtotal dos itens
      const subtotal = items.reduce((sum: number, orderItem: { productId: string; quantity: number }) => {
        const product = products.find((p) => p.id === orderItem.productId)!;
        return sum + product.price * orderItem.quantity;
      }, 0);

      const totalAmount = subtotal + validDeliveryFee;

      // Cria o pedido com itens
      const order = await prisma.order.create({
        data: {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          userId,
          totalAmount,
          deliveryFee: validDeliveryFee,
          deliveryType,
          deliveryAddress: deliveryAddress?.trim() || null,
          status: "PENDING_PAYMENT",
          items: {
            create: items.map((orderItem: { productId: string; quantity: number }) => {
              const product = products.find((p) => p.id === orderItem.productId)!;
              return {
                productId: orderItem.productId,
                title: product.title,
                price: product.price,
                quantity: orderItem.quantity,
                thumbnail: product.thumbnail,
                productCode: product.code,
              };
            }),
          },
        },
      });

      // Gera o QR Code PIX
      const titlesPreview = products.slice(0, 2).map((p) => p.title.slice(0, 25)).join(", ");
      const pixDescription =
        validDeliveryFee > 0
          ? `Pink Music - Carrinho: ${titlesPreview}... (+ Frete)`
          : `Pink Music - Carrinho: ${titlesPreview}...`;

      const pixResult = await createPixPayment({
        orderId: order.id,
        amount: totalAmount,
        customerName: customerName.trim(),
        description: pixDescription,
      });

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
    }

    // ── FLUXO LEGADO: produto único ──────────────────────────────────────────
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Produto ou lista de itens é obrigatório." },
        { status: 400 }
      );
    }

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
        { success: false, error: `Estoque insuficiente. Disponível: ${product.available_quantity}` },
        { status: 409 }
      );
    }

    const totalAmount = product.price * quantity + validDeliveryFee;

    const order = await prisma.order.create({
      data: {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        productId,
        userId,
        quantity,
        totalAmount,
        deliveryFee: validDeliveryFee,
        deliveryType,
        deliveryAddress: deliveryAddress?.trim() || null,
        status: "PENDING_PAYMENT",
      },
    });

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

// GET /api/orders — lista pedidos (somente equipe autorizada: admin e funcionário)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStaff(request);
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
            select: {
              id: true,
              title: true,
              thumbnail: true,
              code: true,
              packageSize: true,
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
