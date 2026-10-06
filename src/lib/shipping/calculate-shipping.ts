import prisma from "@/lib/prisma";
import { normalizeZipCode } from "./normalize-zipcode";
import { calculateHaversineDistance } from "./calculate-distance";
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
 * 5. Determina latitude/longitude e calcula a distância geográfica (Haversine) até o CEP de origem da loja.
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

    // 2. Se não existir no banco local, tenta enriquecer via ViaCEP
    if (!zipRecord) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
          next: { revalidate: 86400 }, // cache Next.js 24h
        });

        if (response.ok) {
          const viaCepData = await response.json();

          if (viaCepData && !viaCepData.erro) {
            city = viaCepData.localidade || city;
            state = viaCepData.uf || state;
            district = viaCepData.bairro || "Centro";

            // Se for de outra cidade/estado, está definitivamente fora da área de entrega local
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

            // Tenta encontrar outro CEP cadastrado no mesmo bairro para herdar coordenadas aproximadas
            const neighborhoodPeer = await prisma.shippingZipCode.findFirst({
              where: {
                district: { equals: district, mode: "insensitive" },
                latitude: { not: null },
                longitude: { not: null },
              },
            });

            if (neighborhoodPeer?.latitude && neighborhoodPeer?.longitude) {
              latitude = neighborhoodPeer.latitude;
              longitude = neighborhoodPeer.longitude;
            }
          } else {
            return {
              available: false,
              reason: "INVALID_ZIP_CODE",
              message: "CEP não encontrado na base dos Correios.",
              zipCode: cleanZip,
            };
          }
        }
      } catch (err) {
        console.warn("[calculateShipping] Falha ao consultar ViaCEP:", err);
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

    // 4. Determina distância geográfica
    let distanceKm: number;

    if (latitude !== null && longitude !== null) {
      const distanceResult = calculateHaversineDistance(
        STORE_SHIPPING_CONFIG.originCoordinates,
        { latitude, longitude }
      );
      distanceKm = distanceResult.distanceKm;
    } else if (zipRecord?.zone && zipRecord.zone.active) {
      // Se não temos coordenadas, mas o CEP tem uma zona associada diretamente
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
      // Fallback para CEP de Feira de Santana sem coordenadas cadastradas:
      // Atribui à Zona 1 ou 2 como padrão urbano caso esteja no centro ou sem geolocalização exata
      distanceKm = 2.5;
    }

    // 5. Encontra a zona correspondente à distância calculada
    // Uma distância pertence à zona se minDistance <= distanceKm E distanceKm <= maxDistance
    // Se a distância for exatamente na divisa, pega a zona com maxDistance correspondente.
    const matchedZone = activeZones.find(
      (z) => distanceKm >= z.minDistance && distanceKm <= z.maxDistance
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

    // 6. Se o CEP ainda não estava salvo no banco, podemos salvá-lo para consultas futuras ultrarrápidas
    if (!zipRecord) {
      try {
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
      } catch {
        // Silencioso se já tiver sido criado por requisição concorrente
      }
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
