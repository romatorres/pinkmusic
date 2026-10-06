import prisma from "@/lib/prisma";
import { normalizeZipCode } from "./normalize-zipcode";
import { calculateDistance } from "./calculate-distance";
import { resolveZipCoordinates } from "./geocode-zip";
import { STORE_SHIPPING_CONFIG } from "./config";
import { ensureDefaultShippingZonesAndZipCodes } from "./seed";

export type ShippingFailureReason =
  | "INVALID_ZIP_CODE"
  | "OUT_OF_DELIVERY_AREA"
  | "NO_ACTIVE_ZONES"
  | "INTERNAL_ERROR";

export interface ShippingSuccessResult {
  available: true;
  zipCode: string;
  formattedZipCode: string;
  district: string;
  city: string;
  state: string;
  zone: {
    id: string;
    name: string;
    description: string | null;
  };
  distanceKm: number;
  price: number;
}

export interface ShippingFailureResult {
  available: false;
  reason: ShippingFailureReason;
  message: string;
  zipCode?: string;
  district?: string;
  city?: string;
  state?: string;
}

export type CalculateShippingResult = ShippingSuccessResult | ShippingFailureResult;

/**
 * Função principal para cálculo de frete local com base em regras fixas no banco de dados.
 *
 * Fluxo:
 * 1. Normaliza e valida o CEP brasileiro (8 dígitos).
 * 2. Garante zonas padrões no banco se for primeira execução.
 * 3. Busca o CEP no banco de dados local (tabela ShippingZipCode).
 * 4. Se não estiver no banco, consulta ViaCEP para verificar se pertence a Feira de Santana - BA.
 * 5. Determina latitude/longitude e calcula a distância (OSRM real por estrada, fallback Haversine×1.35) até a loja.
 * 6. Encontra a ShippingZone ativa que cobre aquela faixa de distância (minDistance <= dist < maxDistance).
 * 7. Retorna os dados oficiais com o preço definido na zona pelo banco de dados.
 */
export async function calculateShipping(
  rawZipCode: string | null | undefined
): Promise<CalculateShippingResult> {
  const cleanZip = normalizeZipCode(rawZipCode);

  if (!cleanZip) {
    return {
      available: false,
      reason: "INVALID_ZIP_CODE",
      message: "Informe um CEP válido com 8 dígitos.",
    };
  }

  try {
    // Garante que as zonas padrão existam se a tabela estiver vazia
    await ensureDefaultShippingZonesAndZipCodes();

    // 1. Busca no banco de dados local
    const zipRecord = await prisma.shippingZipCode.findUnique({
      where: { zipCode: cleanZip },
      include: { zone: true },
    });

    let district = zipRecord?.district || "";
    let city = zipRecord?.city || STORE_SHIPPING_CONFIG.storeCity;
    let state = zipRecord?.state || STORE_SHIPPING_CONFIG.storeState;
    let latitude = zipRecord?.latitude ?? null;
    let longitude = zipRecord?.longitude ?? null;

    // 2. Se não existir no banco OU se não tiver coordenadas salvas, geocodifica
    if (!zipRecord || zipRecord.latitude === null || zipRecord.longitude === null) {
      try {
        const geocoded = await resolveZipCoordinates(cleanZip, district);

        if (geocoded.city) city = geocoded.city;
        if (geocoded.state) state = geocoded.state;
        if (geocoded.district) district = geocoded.district;

        if (geocoded.latitude !== null && geocoded.longitude !== null) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }

        // Se for de outra cidade/estado, está fora da área de entrega local
        const isLocalCity =
          city.toLowerCase().trim() === STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim() &&
          state.toUpperCase().trim() === STORE_SHIPPING_CONFIG.storeState.toUpperCase().trim();

        if (!isLocalCity) {
          return {
            available: false,
            reason: "OUT_OF_DELIVERY_AREA",
            message: `Entregas locais disponíveis apenas para ${STORE_SHIPPING_CONFIG.storeCity} - ${STORE_SHIPPING_CONFIG.storeState}.`,
            zipCode: cleanZip,
            city,
            state,
          };
        }
      } catch (err) {
        console.warn("[calculateShipping] Falha ao geocodificar CEP:", err);
      }
    }

    // Se a cidade não for Feira de Santana
    if (city.toLowerCase().trim() !== STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim()) {
      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message: "Desculpe, ainda não realizamos entregas nesta região.",
        zipCode: cleanZip,
        city,
        state,
      };
    }

    // 3. Busca todas as zonas ativas ordenadas por distância mínima
    const activeZones = await prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: { minDistance: "asc" },
    });

    if (activeZones.length === 0) {
      return {
        available: false,
        reason: "NO_ACTIVE_ZONES",
        message: "Nenhuma zona de entrega ativa no momento. Entre em contato com a loja.",
        zipCode: cleanZip,
      };
    }

    // 4. Determina distância geográfica prioritariamente via OSRM (estrada real)
    let distanceKm: number;

    if (latitude !== null && longitude !== null) {
      const distanceResult = await calculateDistance(
        STORE_SHIPPING_CONFIG.originCoordinates,
        { latitude, longitude }
      );
      distanceKm = distanceResult.distanceKm;
    } else if (zipRecord?.zone && zipRecord.zone.active) {
      // Se não conseguimos coordenadas mesmo após geocodificar, mas já tinha zona
      const zone = zipRecord.zone;
      const zonePrice = Number(zone.price);
      return {
        available: true,
        zipCode: cleanZip,
        formattedZipCode: `${cleanZip.slice(0, 5)}-${cleanZip.slice(5)}`,
        district: district || "Feira de Santana",
        city,
        state,
        zone: {
          id: zone.id,
          name: zone.name,
          description: zone.description,
        },
        distanceKm: zone.minDistance,
        price: zonePrice,
      };
    } else {
      // Fallback urbano central caso nenhuma API de geocodificação tenha retornado lat/lng
      distanceKm = 2.5;
    }

    // 5. Encontra a zona correspondente à distância calculada
    // minDistance é inclusivo, maxDistance é exclusivo: minDistance <= dist < maxDistance
    const matchedZone = activeZones.find(
      (z) => distanceKm >= z.minDistance && distanceKm < z.maxDistance
    );

    if (!matchedZone) {
      const maxOverallRadius = Math.max(...activeZones.map((z) => z.maxDistance));
      if (distanceKm > maxOverallRadius) {
        return {
          available: false,
          reason: "OUT_OF_DELIVERY_AREA",
          message: `Desculpe, este endereço está a ${distanceKm.toFixed(1)} km e nossa área máxima de entrega local é de até ${maxOverallRadius} km.`,
          zipCode: cleanZip,
          district,
          city,
          state,
        };
      }

      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message: "Desculpe, ainda não realizamos entregas nesta região.",
        zipCode: cleanZip,
        district,
        city,
        state,
      };
    }

    // 6. Salva ou atualiza no banco com as coordenadas encontradas para consultas futuras instantâneas
    try {
      if (!zipRecord) {
        await prisma.shippingZipCode.create({
          data: {
            zipCode: cleanZip,
            district: district || "Centro",
            city,
            state,
            latitude,
            longitude,
            zoneId: matchedZone.id,
          },
        });
      } else if (latitude !== null && longitude !== null && (zipRecord.latitude === null || zipRecord.longitude === null || zipRecord.zoneId !== matchedZone.id)) {
        await prisma.shippingZipCode.update({
          where: { zipCode: cleanZip },
          data: {
            district: district || zipRecord.district,
            latitude,
            longitude,
            zoneId: matchedZone.id,
          },
        });
      }
    } catch {
      // Silencioso para concorrência
    }

    const price = Number(matchedZone.price);

    return {
      available: true,
      zipCode: cleanZip,
      formattedZipCode: `${cleanZip.slice(0, 5)}-${cleanZip.slice(5)}`,
      district: district || "Feira de Santana",
      city,
      state,
      zone: {
        id: matchedZone.id,
        name: matchedZone.name,
        description: matchedZone.description,
      },
      distanceKm,
      price,
    };
  } catch (error) {
    console.error("[calculateShipping] Erro inesperado:", error);
    return {
      available: false,
      reason: "INTERNAL_ERROR",
      message: "Ocorreu um erro ao calcular o frete. Tente novamente.",
      zipCode: cleanZip,
    };
  }
}
