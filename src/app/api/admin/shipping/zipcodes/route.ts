import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeZipCode } from "@/lib/shipping/normalize-zipcode";
import { STORE_SHIPPING_CONFIG } from "@/lib/shipping/config";
import { resolveZone } from "@/lib/shipping/zone-lookup";

/** Consulta ViaCEP localmente nesta rota (sem re-exportar do zone-lookup). */
async function fetchViaCepLocal(cleanZip: string): Promise<{ district: string; city: string; state: string; street: string } | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.erro) return null;
    return { district: data.bairro || "", city: data.localidade || "", state: data.uf || "", street: data.logradouro || "" };
  } catch { return null; }
}

// GET /api/admin/shipping/zipcodes - Lista CEPs com paginacao e busca
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const zoneId = searchParams.get("zoneId") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));
    const skip = (page - 1) * limit;

    const cleanSearch = search.replace(/\D/g, "");

    const where: Record<string, unknown> = {};

    if (zoneId) {
      where.zoneId = zoneId;
    }

    if (search) {
      where.OR = [
        ...(cleanSearch ? [{ zipCode: { contains: cleanSearch } }] : []),
        { district: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [zipCodes, total] = await Promise.all([
      prisma.shippingZipCode.findMany({
        where,
        include: { zone: true },
        orderBy: [{ district: "asc" }, { zipCode: "asc" }],
        skip,
        take: limit,
      }),
      prisma.shippingZipCode.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: zipCodes.map((z) => ({
        ...z,
        zone: z.zone
          ? {
              ...z.zone,
              price: Number(z.zone.price),
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/shipping/zipcodes] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar CEPs." },
      { status: 500 }
    );
  }
}

// POST /api/admin/shipping/zipcodes - Cadastra ou importa CEPs (individual ou lote CSV/JSON)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json();

    // MODO LOTE / BULK IMPORT
    if (body.bulk && Array.isArray(body.items)) {
      const items = body.items;
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Busca todas as zonas ativas para matching por ordem
      const activeZones = await prisma.shippingZone.findMany({
        where: { active: true },
        orderBy: { minDistance: "asc" },
      });

      for (const item of items) {
        const cleanZip = normalizeZipCode(item.zipCode);
        if (!cleanZip) {
          errorCount++;
          continue;
        }

        let district = item.district ? String(item.district).trim() : "";
        let city = item.city ? String(item.city).trim() : STORE_SHIPPING_CONFIG.storeCity;
        let state = item.state ? String(item.state).trim().toUpperCase() : STORE_SHIPPING_CONFIG.storeState;

        let zoneId = item.zoneId || null;

        // Se nao forneceu zoneId, resolve zona automaticamente via bairro/prefixo
        if (!zoneId && activeZones.length > 0) {
          const lookup = await resolveZone(cleanZip);
          if (lookup.district) district = district || lookup.district;
          if (lookup.city) city = lookup.city;
          if (lookup.state) state = lookup.state;

          if (lookup.zoneOrder !== null) {
            // Busca zona pelo order explícito (não por índice)
            const resolvedZone = await prisma.shippingZone.findFirst({
              where: { order: lookup.zoneOrder, active: true },
            });
            zoneId = resolvedZone?.id || activeZones[0]?.id || null;
          } else {
            zoneId = activeZones[0]?.id || null;
          }
        }

        try {
          const upserted = await prisma.shippingZipCode.upsert({
            where: { zipCode: cleanZip },
            create: {
              zipCode: cleanZip,
              district: district || "Feira de Santana",
              city,
              state,
              latitude: null,
              longitude: null,
              zoneId,
            },
            update: {
              district: district || undefined,
              city,
              state,
              ...(zoneId ? { zoneId } : {}),
            },
          });

          if (upserted.createdAt.getTime() === upserted.updatedAt.getTime()) {
            createdCount++;
          } else {
            updatedCount++;
          }
        } catch {
          errorCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Importacao concluida. ${createdCount} criados, ${updatedCount} atualizados, ${errorCount} erros/ignorados.`,
        createdCount,
        updatedCount,
        errorCount,
      });
    }

    // MODO INDIVIDUAL
    const { zipCode, district, city, state, zoneId } = body;

    const cleanZip = normalizeZipCode(zipCode);
    if (!cleanZip) {
      return NextResponse.json(
        { success: false, error: "CEP invalido. Deve conter 8 digitos." },
        { status: 400 }
      );
    }

    if (!district?.trim()) {
      return NextResponse.json(
        { success: false, error: "Bairro e obrigatorio." },
        { status: 400 }
      );
    }

    let finalDistrict = district.trim();
    let finalCity = city?.trim() || STORE_SHIPPING_CONFIG.storeCity;
    let finalState = state?.trim().toUpperCase() || STORE_SHIPPING_CONFIG.storeState;

    // Complementa dados via ViaCEP se cidade/estado nao informados
    if (!city || !state) {
      const viaCepData = await fetchViaCepLocal(cleanZip);
      if (viaCepData) {
        if (!finalDistrict && viaCepData.district) finalDistrict = viaCepData.district;
        if (viaCepData.city) finalCity = viaCepData.city;
        if (viaCepData.state) finalState = viaCepData.state;
      }
    }

    let targetZoneId = zoneId || null;

    // Se nao informou zona, resolve automaticamente
    if (!targetZoneId) {
      const activeZones = await prisma.shippingZone.findMany({
        where: { active: true },
        orderBy: { minDistance: "asc" },
      });
      if (activeZones.length > 0) {
        const lookup = await resolveZone(cleanZip);
        if (lookup.zoneOrder !== null) {
          const resolvedZone = await prisma.shippingZone.findFirst({
            where: { order: lookup.zoneOrder, active: true },
          });
          targetZoneId = resolvedZone?.id || activeZones[0]?.id || null;
        } else {
          targetZoneId = activeZones[0]?.id || null;
        }
      }
    }

    const record = await prisma.shippingZipCode.upsert({
      where: { zipCode: cleanZip },
      create: {
        zipCode: cleanZip,
        district: finalDistrict,
        city: finalCity,
        state: finalState,
        latitude: null,
        longitude: null,
        zoneId: targetZoneId,
      },
      update: {
        district: finalDistrict,
        city: finalCity,
        state: finalState,
        zoneId: targetZoneId,
      },
      include: { zone: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        zone: record.zone ? { ...record.zone, price: Number(record.zone.price) } : null,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/shipping/zipcodes] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar CEP." },
      { status: 500 }
    );
  }
}
