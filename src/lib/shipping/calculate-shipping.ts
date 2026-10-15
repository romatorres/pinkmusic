import prisma from "@/lib/prisma";
import { normalizeZipCode } from "./normalize-zipcode";
import { resolveZoneOrder, KNOWN_SPECIAL_ZIPS } from "./zone-lookup";
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
 * Retorna a distância estimada média da faixa da zona (ex: Zona 3 de 6 a 10km -> 8km)
 * para exibição condizente e realista ao cliente.
 */
function getRepresentativeDistance(zone: { minDistance: number; maxDistance: number }): number {
  const avg = (zone.minDistance + zone.maxDistance) / 2;
  return Math.round(avg * 10) / 10;
}

/**
 * Funcao principal para calculo de frete local com base em zonas de bairro.
 *
 * Fluxo simplificado (sem GPS / sem calculo de distancia):
 * 1. Normaliza e valida o CEP brasileiro (8 digitos).
 * 2. Garante zonas padrao no banco se for primeira execucao.
 * 3. Busca o CEP no banco de dados local (cache) - resposta instantanea.
 * 4. Se nao estiver no cache: chama ViaCEP -> mapeia bairro -> zona.
 * 5. Fallback: prefixo do CEP -> zona (sem necessidade de nenhuma API externa).
 * 6. Retorna os dados com o preco definido na zona pelo banco de dados.
 * 7. Salva no banco para que a proxima consulta do mesmo CEP seja instantanea.
 */
export async function calculateShipping(
  rawZipCode: string | null | undefined
): Promise<CalculateShippingResult> {
  const cleanZip = normalizeZipCode(rawZipCode);

  if (!cleanZip) {
    return {
      available: false,
      reason: "INVALID_ZIP_CODE",
      message: "Informe um CEP valido com 8 digitos.",
    };
  }

  try {
    // 1. Garante que as zonas padrao existam se a tabela estiver vazia
    await ensureDefaultShippingZonesAndZipCodes();

    // 2. Busca no cache local (banco de dados)
    const zipRecord = await prisma.shippingZipCode.findUnique({
      where: { zipCode: cleanZip },
      include: { zone: true },
    });

    // Se é um CEP com mapeamento especial manual (exceção catalogada), não usa cache desatualizado
    const hasSpecialOverride = Boolean(KNOWN_SPECIAL_ZIPS[cleanZip]);

    // Se ja esta no cache com zona valida e ativa (e não é uma exceção manual recente), retorna direto
    if (zipRecord && zipRecord.zone && zipRecord.zone.active && !hasSpecialOverride) {
      const zone = zipRecord.zone;
      return {
        available: true,
        zipCode: cleanZip,
        formattedZipCode: `${cleanZip.slice(0, 5)}-${cleanZip.slice(5)}`,
        district: zipRecord.district || "Feira de Santana",
        city: zipRecord.city,
        state: zipRecord.state,
        zone: {
          id: zone.id,
          name: zone.name,
          description: zone.description,
        },
        distanceKm: getRepresentativeDistance(zone),
        price: Number(zone.price),
      };
    }

    // 3. Resolve zona via base local, bairros ou prefixo
    const lookup = await resolveZoneOrder(cleanZip);

    // Se for distrito ou área rural além de 12 km da loja física, bloqueia a entrega
    if (lookup.isOutOfDeliveryArea || lookup.zoneOrder === null) {
      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message: `Desculpe, este endereço fica a mais de ${STORE_SHIPPING_CONFIG.maxDeliveryRadiusKm} km da nossa loja física (distrito ou área rural) e ultrapassa o limite de entrega rápida por motoboy. Fale conosco pelo WhatsApp para combinar envio especial.`,
        zipCode: cleanZip,
        district: lookup.district,
        city: lookup.city,
        state: lookup.state,
      };
    }

    // Valida se e cidade atendida
    const isLocalCity =
      lookup.city.toLowerCase().trim() === STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim() &&
      lookup.state.toUpperCase().trim() === STORE_SHIPPING_CONFIG.storeState.toUpperCase().trim();

    if (!isLocalCity) {
      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message: `Entregas locais disponiveis apenas para ${STORE_SHIPPING_CONFIG.storeCity} - ${STORE_SHIPPING_CONFIG.storeState}.`,
        zipCode: cleanZip,
        city: lookup.city,
        state: lookup.state,
      };
    }

    // 4. Busca todas as zonas ativas ordenadas (minDistance crescente = ordem da zona)
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

    // 5. Seleciona a zona correspondente ao indice resolvido (1-based -> 0-based)
    // zoneOrder 1 -> activeZones[0], zoneOrder 2 -> activeZones[1], etc.
    // Se zoneOrder ultrapassar o numero de zonas, usa a ultima (mais distante)
    const zoneIndex = lookup.zoneOrder !== null
      ? Math.min(lookup.zoneOrder - 1, activeZones.length - 1)
      : 0;

    const matchedZone = activeZones[zoneIndex];

    if (!matchedZone) {
      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message: "Desculpe, ainda nao realizamos entregas nesta regiao.",
        zipCode: cleanZip,
        district: lookup.district,
        city: lookup.city,
        state: lookup.state,
      };
    }

    // 6. Salva no cache para proximas consultas do mesmo CEP serem instantaneas
    try {
      const cacheData = {
        zipCode: cleanZip,
        district: lookup.district || "Feira de Santana",
        city: lookup.city,
        state: lookup.state,
        latitude: null as number | null,
        longitude: null as number | null,
        zoneId: matchedZone.id,
      };

      if (!zipRecord) {
        await prisma.shippingZipCode.create({ data: cacheData });
      } else if (zipRecord.zoneId !== matchedZone.id) {
        // Atualiza se a zona mudou (ex: admin reorganizou as zonas)
        await prisma.shippingZipCode.update({
          where: { zipCode: cleanZip },
          data: {
            district: lookup.district || zipRecord.district,
            zoneId: matchedZone.id,
          },
        });
      }
    } catch {
      // Silencioso - cache e opcional, nao bloqueia a resposta
    }

    return {
      available: true,
      zipCode: cleanZip,
      formattedZipCode: `${cleanZip.slice(0, 5)}-${cleanZip.slice(5)}`,
      district: lookup.district || "Feira de Santana",
      city: lookup.city,
      state: lookup.state,
      zone: {
        id: matchedZone.id,
        name: matchedZone.name,
        description: matchedZone.description,
      },
      distanceKm: getRepresentativeDistance(matchedZone),
      price: Number(matchedZone.price),
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
