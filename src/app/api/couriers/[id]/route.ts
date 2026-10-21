import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const courier = await prisma.courier.findUnique({
      where: { id },
      include: {
        rides: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            order: {
              select: {
                id: true,
                customerName: true,
                deliveryAddress: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!courier) {
      return NextResponse.json(
        { success: false, error: "Motoboy não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: courier });
  } catch (error) {
    console.error("Erro ao buscar motoboy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, pixKey, pixKeyType, vehicle, plate, notes, active } = body;

    const existingCourier = await prisma.courier.findUnique({
      where: { id },
    });

    if (!existingCourier) {
      return NextResponse.json(
        { success: false, error: "Motoboy não encontrado." },
        { status: 404 }
      );
    }

    const cleanPhone = phone ? phone.replace(/\D/g, "") : existingCourier.phone;

    const updated = await prisma.courier.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingCourier.name,
        phone: cleanPhone,
        pixKey: pixKey !== undefined ? (pixKey?.trim() || null) : existingCourier.pixKey,
        pixKeyType: pixKeyType !== undefined ? pixKeyType : existingCourier.pixKeyType,
        vehicle: vehicle !== undefined ? (vehicle?.trim() || null) : existingCourier.vehicle,
        plate: plate !== undefined ? (plate?.trim()?.toUpperCase() || null) : existingCourier.plate,
        notes: notes !== undefined ? (notes?.trim() || null) : existingCourier.notes,
        active: active !== undefined ? Boolean(active) : existingCourier.active,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Motoboy atualizado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao atualizar motoboy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao atualizar motoboy",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireStaff(req);
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    // Verificar se tem corridas atreladas
    const ridesCount = await prisma.deliveryRide.count({
      where: { courierId: id },
    });

    if (ridesCount > 0) {
      // Se possui corridas no histórico, inativa para manter histórico financeiro íntegro
      await prisma.courier.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        success: true,
        message: "O profissional possui histórico de corridas e foi inativado.",
      });
    }

    // Se nunca fez corridas, pode excluir permanentemente
    await prisma.courier.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Motoboy removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao deletar motoboy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao deletar motoboy",
      },
      { status: 500 }
    );
  }
}
