/**
 * calculate-shipping.ts
 *
 * Função principal de cálculo de frete local por zonas.
 * Usa a cascata de resolução determinística de zone-lookup.ts (resolveZone).
 *
 * Regras:
 *   - O seed NÃO roda no caminho da consulta (executado via comando CLI npm run seed:shipping).
 *   - No máximo faz uma checagem rápida de zonas ativas.
 *   - Suporta seleção manual de bairro (options.selectedNeighborhoodKey) quando o lookup
 *     não possui confiança "high".
 *   - Se o lookup possuir sugestão medium/low com zona MAIOR que a do bairro escolhido,
 *     aplica a maior e marca needsReview = true.
 *   - Escolha manual NUNCA vai para o cache ShippingZipCode.
 *   - Grava em ShippingZipCode com await somente se lookup.confidence === "high".
 *   - Se a zona estiver inativa, retorna OUT_OF_DELIVERY_AREA (nunca fallback para outra zona).
 */

import prisma from "@/lib/prisma";
import { normalizeZipCode } from "./normalize-zipcode";
import { resolveZone, normalizeKey } from "./zone-lookup";
import { STORE_SHIPPING_CONFIG } from "./config";

export type ShippingFailureReason =
  | "INVALID_ZIP_CODE"
  | "OUT_OF_DELIVERY_AREA"
  | "NEEDS_NEIGHBORHOOD"
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
  needsReview?: boolean;
}

export interface ShippingFailureResult {
  available: false;
  reason: ShippingFailureReason;
  message: string;
  zipCode?: string;
  district?: string;
  city?: string;
  state?: string;
  neighborhoods?: Array<{ key: string; name: string }>;
}

export type CalculateShippingResult =
  | ShippingSuccessResult
  | ShippingFailureResult;

export interface CalculateShippingOptions {
  selectedNeighborhoodKey?: string;
}

/** Distância representativa do centro da faixa da zona (para exibição). */
function getRepresentativeDistance(zone: {
  minDistance: number;
  maxDistance: number;
}): number {
  const avg = (zone.minDistance + zone.maxDistance) / 2;
  return Math.round(avg * 10) / 10;
}

/**
 * Retorna lista de bairros urbanos atendidos cadastrados no banco para o modal/select.
 */
async function getAvailableNeighborhoods(): Promise<Array<{ key: string; name: string }>> {
  try {
    const list = await prisma.shippingNeighborhood.findMany({
      where: {
        outOfArea: false,
        zoneOrder: { not: null },
      },
      select: {
        normalizedKey: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return list.map((item) => ({
      key: item.normalizedKey,
      name: item.name,
    }));
  } catch (err) {
    console.warn("[calculateShipping] Falha ao carregar lista de bairros:", err);
    return [];
  }
}

/**
 * Calcula o frete local por zona para um CEP fornecido.
 */
export async function calculateShipping(
  rawZipCode: string | null | undefined,
  options?: CalculateShippingOptions
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
    // 1. Checagem rápida de zonas ativas no sistema (sem rodar seed no caminho crítico)
    const activeZonesCount = await prisma.shippingZone.count({
      where: { active: true },
    });

    if (activeZonesCount === 0) {
      return {
        available: false,
        reason: "NO_ACTIVE_ZONES",
        message: "Nenhuma zona de entrega ativa no momento. Entre em contato com a loja.",
        zipCode: cleanZip,
      };
    }

    // 2. Resolve a zona pela cascata determinística
    const lookup = await resolveZone(cleanZip);

    let effectiveZoneOrder: number | null = lookup.zoneOrder;
    let effectiveDistrict: string = lookup.district;
    let needsReview = false;
    let isCustomerSelected = false;

    // 3. Avalia se há seleção manual de bairro enviada pelo cliente
    const hasSelectedKey = Boolean(options?.selectedNeighborhoodKey?.trim());

    if (hasSelectedKey) {
      // Regra: A seleção manual SÓ vale se o lookup NÃO resolveu com confiança "high"
      if (lookup.confidence === "high") {
        // Ignora a seleção do cliente pois a resolução do CEP é altamente confiável
        isCustomerSelected = false;
      } else {
        const rawKey = options!.selectedNeighborhoodKey!.trim();
        const normKey = normalizeKey(rawKey);

        const selectedNb = await prisma.shippingNeighborhood.findUnique({
          where: { normalizedKey: normKey },
        });

        if (!selectedNb) {
          // Bairro inválido ou não cadastrado
          const neighborhoods = await getAvailableNeighborhoods();
          return {
            available: false,
            reason: "NEEDS_NEIGHBORHOOD",
            message:
              "Bairro informado não encontrado. Por favor, selecione seu bairro na lista ou fale conosco pelo WhatsApp.",
            zipCode: cleanZip,
            neighborhoods,
          };
        }

        // Bairro rural ou fora da área
        if (selectedNb.outOfArea || selectedNb.zoneOrder === null) {
          return {
            available: false,
            reason: "OUT_OF_DELIVERY_AREA",
            message: `O bairro ${selectedNb.name} fica fora da nossa área de entrega rápida por motoboy. Fale conosco pelo WhatsApp para envio especial.`,
            zipCode: cleanZip,
            district: selectedNb.name,
            city: lookup.city,
            state: lookup.state,
          };
        }

        // Bairro válido selecionado pelo cliente
        isCustomerSelected = true;
        needsReview = true;
        effectiveDistrict = selectedNb.name;
        effectiveZoneOrder = selectedNb.zoneOrder;

        // Se o lookup tiver sugestão medium/low com zona MAIOR que a do bairro escolhido, aplica a maior
        if (lookup.zoneOrder !== null && lookup.zoneOrder > effectiveZoneOrder) {
          effectiveZoneOrder = lookup.zoneOrder;
        }

        // Registra em ShippingUnresolvedZip a escolha manual do cliente
        try {
          await prisma.shippingUnresolvedZip.upsert({
            where: { zipCode: cleanZip },
            update: {
              district: selectedNb.name,
              hitCount: { increment: 1 },
              updatedAt: new Date(),
            },
            create: {
              zipCode: cleanZip,
              district: selectedNb.name,
              reason: "CUSTOMER_SELECTED_NEIGHBORHOOD",
            },
          });
        } catch {
          /* silencioso */
        }
      }
    }

    // 4. Se não houve escolha manual e o lookup precisa de bairro -> retorna NEEDS_NEIGHBORHOOD
    if (!isCustomerSelected && lookup.needsNeighborhoodSelection) {
      const neighborhoods = await getAvailableNeighborhoods();
      return {
        available: false,
        reason: "NEEDS_NEIGHBORHOOD",
        message:
          "Não conseguimos identificar o bairro pelo CEP informado. " +
          "Por favor, selecione seu bairro na lista ou fale conosco pelo WhatsApp para confirmar o endereço.",
        zipCode: cleanZip,
        district: lookup.district || undefined,
        city: lookup.city,
        state: lookup.state,
        neighborhoods,
      };
    }

    // 5. Bloqueio definitivo se fora da área de entrega
    if (!isCustomerSelected && (lookup.isOutOfDeliveryArea || effectiveZoneOrder === null)) {
      const reason = lookup.outOfDeliveryReason ?? "OUTSIDE_AREA";
      let message: string;

      if (reason === "OUTSIDE_MUNICIPALITY") {
        message = `Entregas locais disponíveis apenas para ${STORE_SHIPPING_CONFIG.storeCity} - ${STORE_SHIPPING_CONFIG.storeState}. Fale conosco pelo WhatsApp para frete especial.`;
      } else {
        message = `Este endereço fica fora da nossa área de entrega rápida por motoboy (limite: ${STORE_SHIPPING_CONFIG.maxDeliveryRadiusKm} km da loja). Fale conosco pelo WhatsApp para combinar envio especial.`;
      }

      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message,
        zipCode: cleanZip,
        district: lookup.district || undefined,
        city: lookup.city,
        state: lookup.state,
      };
    }

    // 6. Busca a zona correspondente no banco
    const matchedZone = await prisma.shippingZone.findFirst({
      where: { order: effectiveZoneOrder!, active: true },
    });

    if (!matchedZone) {
      // Zona inativa no banco → NUNCA faz fallback para outra zona
      return {
        available: false,
        reason: "OUT_OF_DELIVERY_AREA",
        message:
          "A zona de entrega correspondente a este endereço está temporariamente indisponível. Fale conosco pelo WhatsApp para combinar a entrega.",
        zipCode: cleanZip,
        district: effectiveDistrict || undefined,
        city: lookup.city,
        state: lookup.state,
      };
    }

    // 7. Salva no cache ShippingZipCode SOMENTE se lookup.confidence === "high" e não for escolha manual
    if (lookup.confidence === "high" && !isCustomerSelected) {
      try {
        await prisma.shippingZipCode.upsert({
          where: { zipCode: cleanZip },
          update: {
            district: effectiveDistrict || undefined,
            zoneId: matchedZone.id,
            source: lookup.source,
            confidence: lookup.confidence,
            updatedAt: new Date(),
          },
          create: {
            zipCode: cleanZip,
            district: effectiveDistrict || "Feira de Santana",
            city: lookup.city,
            state: lookup.state,
            latitude: null,
            longitude: null,
            zoneId: matchedZone.id,
            source: lookup.source,
            confidence: lookup.confidence,
          },
        });
      } catch (cacheErr) {
        console.warn("[calculateShipping] Falha ao gravar cache:", cacheErr);
      }
    }

    return buildSuccess(
      cleanZip,
      effectiveDistrict,
      lookup.city,
      lookup.state,
      matchedZone,
      needsReview
    );
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

function buildSuccess(
  cleanZip: string,
  district: string,
  city: string,
  state: string,
  zone: {
    id: string;
    name: string;
    description: string | null;
    minDistance: number;
    maxDistance: number;
    price: unknown;
  },
  needsReview?: boolean
): ShippingSuccessResult {
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
    distanceKm: getRepresentativeDistance(zone),
    price: Number(zone.price),
    needsReview: needsReview ? true : undefined,
  };
}
