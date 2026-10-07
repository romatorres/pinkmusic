import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// PUT /api/admin/shipping/zones/[id] - Atualiza zona existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { name, description, minDistance, maxDistance, price, active } = body;

    const existing = await prisma.shippingZone.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Zona não encontrada." },
        { status: 404 }
      );
    }

    const dataToUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Nome não pode ficar vazio." },
          { status: 400 }
        );
      }
      dataToUpdate.name = name.trim();
    }

    if (description !== undefined) {
      dataToUpdate.description = description ? description.trim() : null;
    }

    const min = minDistance !== undefined ? Number(minDistance) : existing.minDistance;
    const max = maxDistance !== undefined ? Number(maxDistance) : existing.maxDistance;

    if (min < 0) {
      return NextResponse.json(
        { success: false, error: "Distância mínima deve ser >= 0." },
        { status: 400 }
      );
    }

    if (max <= min) {
      return NextResponse.json(
        { success: false, error: "Distância máxima deve ser maior que a mínima." },
        { status: 400 }
      );
    }

    if (minDistance !== undefined) dataToUpdate.minDistance = min;
    if (maxDistance !== undefined) dataToUpdate.maxDistance = max;

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { success: false, error: "Preço deve ser positivo." },
          { status: 400 }
        );
      }
      dataToUpdate.price = parsedPrice;
    }

    if (active !== undefined) {
      dataToUpdate.active = Boolean(active);
    }

    const updated = await prisma.shippingZone.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        price: Number(updated.price),
      },
    });
  } catch (error) {
    console.error("[PUT /api/admin/shipping/zones/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar zona de entrega." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shipping/zones/[id] - Exclui zona
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { id } = await params;

    await prisma.shippingZone.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Zona de entrega excluída com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/shipping/zones/[id]] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir zona de entrega." },
      { status: 500 }
    );
  }
}
