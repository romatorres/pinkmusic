import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeZipCode } from "@/lib/shipping/normalize-zipcode";

// GET /api/admin/shipping/overrides - Lista overrides manuais de CEP
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const overrides = await prisma.shippingZipOverride.findMany({
      orderBy: { zipCode: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: overrides,
      total: overrides.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/shipping/overrides] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar overrides de CEP." },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/overrides - Cria ou atualiza override manual
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { zipCode, district, zoneOrder, note } = body;

    const cleanZip = normalizeZipCode(zipCode);
    if (!cleanZip) {
      return NextResponse.json(
        { success: false, error: "CEP inválido com 8 dígitos é obrigatório." },
        { status: 400 }
      );
    }

    if (!district?.trim()) {
      return NextResponse.json(
        { success: false, error: "Bairro é obrigatório." },
        { status: 400 }
      );
    }

    const orderNum = parseInt(String(zoneOrder), 10);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > 4) {
      return NextResponse.json(
        { success: false, error: "Zona deve ser um número entre 1 e 4." },
        { status: 400 }
      );
    }

    const override = await prisma.shippingZipOverride.upsert({
      where: { zipCode: cleanZip },
      create: {
        zipCode: cleanZip,
        district: district.trim(),
        zoneOrder: orderNum,
        note: note?.trim() || null,
      },
      update: {
        district: district.trim(),
        zoneOrder: orderNum,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: override,
    });
  } catch (error) {
    console.error("[POST /api/admin/shipping/overrides] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar override de CEP." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shipping/overrides - Remove override manual
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const zipCode = searchParams.get("zipCode");

    if (!id && !zipCode) {
      return NextResponse.json(
        { success: false, error: "Informe id ou zipCode." },
        { status: 400 }
      );
    }

    if (id) {
      await prisma.shippingZipOverride.delete({ where: { id } });
    } else if (zipCode) {
      await prisma.shippingZipOverride.delete({ where: { zipCode } });
    }

    return NextResponse.json({
      success: true,
      message: "Override removido com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/shipping/overrides] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir override." },
      { status: 500 }
    );
  }
}
