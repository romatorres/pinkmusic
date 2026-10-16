import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeKey } from "@/lib/shipping/zone-lookup";

// GET /api/admin/shipping/neighborhoods - Lista bairros mapeados
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const zoneOrder = searchParams.get("zoneOrder");
    const outOfArea = searchParams.get("outOfArea");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { normalizedKey: { contains: normalizeKey(search) } },
      ];
    }

    if (zoneOrder !== null && zoneOrder !== undefined && zoneOrder !== "") {
      where.zoneOrder = parseInt(zoneOrder, 10);
    }

    if (outOfArea === "true") {
      where.outOfArea = true;
    } else if (outOfArea === "false") {
      where.outOfArea = false;
    }

    const neighborhoods = await prisma.shippingNeighborhood.findMany({
      where,
      orderBy: [{ outOfArea: "asc" }, { zoneOrder: "asc" }, { name: "asc" }],
      include: {
        zone: {
          select: { id: true, name: true, price: true, order: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: neighborhoods.map((n) => ({
        ...n,
        zone: n.zone ? { ...n.zone, price: Number(n.zone.price) } : null,
      })),
      total: neighborhoods.length,
    });
  } catch (error) {
    console.error("[GET /api/admin/shipping/neighborhoods] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar bairros." },
      { status: 500 }
    );
  }
}

// PUT /api/admin/shipping/neighborhoods - Atualiza ou cadastra bairro
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { id, name, zoneOrder, outOfArea, aliases } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome do bairro é obrigatório." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const normKey = normalizeKey(cleanName);
    const isOutOfArea = Boolean(outOfArea);
    const orderNum = isOutOfArea ? null : (zoneOrder ? parseInt(String(zoneOrder), 10) : null);

    // Encontra zona correspondente ao order se informado
    let zoneId: string | null = null;
    if (orderNum !== null) {
      const zone = await prisma.shippingZone.findFirst({
        where: { order: orderNum, active: true },
      });
      zoneId = zone?.id || null;
    }

    const cleanAliases: string[] = Array.isArray(aliases)
      ? aliases.map((a: string) => normalizeKey(String(a))).filter(Boolean)
      : [normKey];

    if (!cleanAliases.includes(normKey)) {
      cleanAliases.push(normKey);
    }

    const updated = await prisma.shippingNeighborhood.upsert({
      where: id ? { id } : { normalizedKey: normKey },
      create: {
        name: cleanName,
        normalizedKey: normKey,
        aliases: cleanAliases,
        zoneOrder: orderNum,
        zoneId,
        outOfArea: isOutOfArea,
      },
      update: {
        name: cleanName,
        zoneOrder: orderNum,
        zoneId,
        outOfArea: isOutOfArea,
        aliases: cleanAliases,
      },
      include: {
        zone: {
          select: { id: true, name: true, price: true, order: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        zone: updated.zone ? { ...updated.zone, price: Number(updated.zone.price) } : null,
      },
    });
  } catch (error) {
    console.error("[PUT /api/admin/shipping/neighborhoods] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar bairro." },
      { status: 500 }
    );
  }
}
