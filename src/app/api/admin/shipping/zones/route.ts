import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ensureDefaultShippingZonesAndZipCodes } from "@/lib/shipping/seed";

// GET /api/admin/shipping/zones - Lista todas as zonas cadastradas
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    await ensureDefaultShippingZonesAndZipCodes();

    const zones = await prisma.shippingZone.findMany({
      orderBy: { minDistance: "asc" },
      include: {
        _count: {
          select: { zipCodes: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: zones.map((z) => ({
        ...z,
        price: Number(z.price),
        zipCodesCount: z._count.zipCodes,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/shipping/zones] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar zonas de entrega." },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/zones - Cria nova zona
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { name, description, minDistance, maxDistance, price, active = true } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome da zona é obrigatório." },
        { status: 400 }
      );
    }

    const min = Number(minDistance);
    const max = Number(maxDistance);
    const parsedPrice = Number(price);

    if (isNaN(min) || min < 0) {
      return NextResponse.json(
        { success: false, error: "Distância mínima inválida (deve ser >= 0)." },
        { status: 400 }
      );
    }

    if (isNaN(max) || max <= min) {
      return NextResponse.json(
        { success: false, error: "Distância máxima deve ser maior que a distância mínima." },
        { status: 400 }
      );
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { success: false, error: "Preço do frete deve ser um valor positivo." },
        { status: 400 }
      );
    }

    const zone = await prisma.shippingZone.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        minDistance: min,
        maxDistance: max,
        price: parsedPrice,
        active: Boolean(active),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...zone,
        price: Number(zone.price),
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/shipping/zones] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao criar zona de entrega." },
      { status: 500 }
    );
  }
}
