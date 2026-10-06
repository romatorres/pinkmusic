import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { normalizeZipCode } from "@/lib/shipping/normalize-zipcode";
import { STORE_SHIPPING_CONFIG } from "@/lib/shipping/config";
import { calculateHaversineDistance } from "@/lib/shipping/calculate-distance";

// GET /api/admin/shipping/zipcodes - Lista CEPs com paginação e busca
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request);
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
    const auth = await requireStaff(request);
    if (auth.response) return auth.response;

    const body = await request.json();

    // ── MODO LOTE / BULK IMPORT ───────────────────────────────────────────────
    if (body.bulk && Array.isArray(body.items)) {
      const items = body.items;
      let createdCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // Busca todas as zonas ativas para matching por distância se necessário
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

        const district = item.district ? String(item.district).trim() : "Centro";
        const city = item.city ? String(item.city).trim() : STORE_SHIPPING_CONFIG.storeCity;
        const state = item.state ? String(item.state).trim().toUpperCase() : STORE_SHIPPING_CONFIG.storeState;
        const latitude = item.latitude !== undefined && item.latitude !== null && !isNaN(Number(item.latitude))
          ? Number(item.latitude)
          : null;
        const longitude = item.longitude !== undefined && item.longitude !== null && !isNaN(Number(item.longitude))
          ? Number(item.longitude)
          : null;

        let zoneId = item.zoneId || null;

        // Se não forneceu zoneId, mas tem coordenadas, calcula zona automaticamente
        if (!zoneId && latitude !== null && longitude !== null && activeZones.length > 0) {
          const dist = calculateHaversineDistance(
            STORE_SHIPPING_CONFIG.originCoordinates,
            { latitude, longitude }
          ).distanceKm;
          const matched = activeZones.find((z) => dist >= z.minDistance && dist <= z.maxDistance);
          if (matched) {
            zoneId = matched.id;
          }
        }

        try {
          const upserted = await prisma.shippingZipCode.upsert({
            where: { zipCode: cleanZip },
            create: {
              zipCode: cleanZip,
              district,
              city,
              state,
              latitude,
              longitude,
              zoneId,
            },
            update: {
              district,
              city,
              state,
              ...(latitude !== null ? { latitude } : {}),
              ...(longitude !== null ? { longitude } : {}),
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
        message: `Importação concluída. ${createdCount} criados, ${updatedCount} atualizados, ${errorCount} erros/ignorados.`,
        createdCount,
        updatedCount,
        errorCount,
      });
    }

    // ── MODO INDIVIDUAL ───────────────────────────────────────────────────────
    const { zipCode, district, city, state, latitude, longitude, zoneId } = body;

    const cleanZip = normalizeZipCode(zipCode);
    if (!cleanZip) {
      return NextResponse.json(
        { success: false, error: "CEP inválido. Deve conter 8 dígitos." },
        { status: 400 }
      );
    }

    if (!district?.trim()) {
      return NextResponse.json(
        { success: false, error: "Bairro é obrigatório." },
        { status: 400 }
      );
    }

    const lat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null;
    const lng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null;

    let targetZoneId = zoneId || null;

    // Se latitude e longitude foram dadas e zoneId não, calcula zona pelo Haversine
    if (!targetZoneId && lat !== null && lng !== null) {
      const activeZones = await prisma.shippingZone.findMany({
        where: { active: true },
        orderBy: { minDistance: "asc" },
      });
      const dist = calculateHaversineDistance(
        STORE_SHIPPING_CONFIG.originCoordinates,
        { latitude: lat, longitude: lng }
      ).distanceKm;
      const matched = activeZones.find((z) => dist >= z.minDistance && dist <= z.maxDistance);
      if (matched) {
        targetZoneId = matched.id;
      }
    }

    const record = await prisma.shippingZipCode.upsert({
      where: { zipCode: cleanZip },
      create: {
        zipCode: cleanZip,
        district: district.trim(),
        city: city?.trim() || STORE_SHIPPING_CONFIG.storeCity,
        state: state?.trim().toUpperCase() || STORE_SHIPPING_CONFIG.storeState,
        latitude: lat,
        longitude: lng,
        zoneId: targetZoneId,
      },
      update: {
        district: district.trim(),
        city: city?.trim() || STORE_SHIPPING_CONFIG.storeCity,
        state: state?.trim().toUpperCase() || STORE_SHIPPING_CONFIG.storeState,
        latitude: lat,
        longitude: lng,
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
