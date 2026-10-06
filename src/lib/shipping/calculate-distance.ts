/**
 * Módulo de cálculo de distância entre coordenadas geográficas.
 *
 * Estratégia em camadas:
 *  1. OSRM (router.project-osrm.org) — distância real por estrada, gratuito, sem chave de API.
 *  2. Fallback: Haversine × 1.35 — aproxima a distância viária quando o OSRM não responde.
 *
 * A função `calculateDistance` é o ponto de entrada único para o resto da aplicação.
 * Se no futuro quiser usar Google Directions ou Mapbox, basta trocar o bloco OSRM aqui.
 */

const OSRM_BASE_URL =
  process.env.OSRM_URL || "https://router.project-osrm.org";

/** Fator empírico de correção linha-reta → estrada (usado no fallback). */
const HAVERSINE_TO_ROAD_FACTOR = 1.35;

/** Timeout em ms para a requisição ao OSRM antes de usar o fallback. */
const OSRM_TIMEOUT_MS = 4000;

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  /** Indica de onde veio o valor para fins de debug/log. */
  calculationMethod: "OSRM_ROUTE" | "HAVERSINE_FALLBACK";
}

// ─── Haversine (linha reta) ──────────────────────────────────────────────────

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula a distância em km em linha reta entre dois pontos (fórmula de Haversine).
 * Usada como fallback caso o OSRM esteja indisponível.
 */
export function calculateHaversineDistance(
  origin: GeoCoordinate,
  destination: GeoCoordinate
): DistanceCalculationResult {
  const earthRadiusKm = 6371;

  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const straightLineKm = earthRadiusKm * c;

  // Aplica fator de correção para aproximar da distância real por estrada
  const correctedKm = straightLineKm * HAVERSINE_TO_ROAD_FACTOR;

  return {
    distanceKm: Math.round(correctedKm * 100) / 100,
    calculationMethod: "HAVERSINE_FALLBACK",
  };
}

// ─── OSRM (distância real por estrada) ──────────────────────────────────────

interface OsrmResponse {
  code: string;
  routes?: { distance: number; duration: number }[];
}

/**
 * Consulta o OSRM para obter a distância real por estrada entre dois pontos.
 * Retorna null em caso de falha, timeout ou resposta inválida.
 */
async function fetchOsrmDistance(
  origin: GeoCoordinate,
  destination: GeoCoordinate
): Promise<number | null> {
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=false&alternatives=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PinkMusicShipping/1.0",
      },
      // Next.js: sem cache para não armazenar rotas fixas no edge
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[shipping/distance] OSRM respondeu status HTTP ${response.status}`);
      return null;
    }

    const data: OsrmResponse = await response.json();

    if (data.code !== "Ok" || !data.routes?.length) {
      console.warn(`[shipping/distance] OSRM retornou resposta sem rota: code=${data.code}`);
      return null;
    }

    // OSRM retorna distância em metros
    const distanceKm = data.routes[0].distance / 1000;
    return Math.round(distanceKm * 100) / 100;
  } catch (err) {
    console.warn(`[shipping/distance] Exceção ou timeout na chamada OSRM:`, err);
    return null;
  }
}

// ─── Ponto de entrada público ────────────────────────────────────────────────

/**
 * Calcula a distância entre dois pontos usando OSRM (distância real por estrada).
 * Se o OSRM falhar ou demorar mais de 4s, aplica Haversine × 1.35 como fallback.
 *
 * @param origin      Coordenadas de origem (loja)
 * @param destination Coordenadas de destino (endereço do cliente)
 */
export async function calculateDistance(
  origin: GeoCoordinate,
  destination: GeoCoordinate
): Promise<DistanceCalculationResult> {
  const osrmDistanceKm = await fetchOsrmDistance(origin, destination);

  if (osrmDistanceKm !== null) {
    console.log(
      `[shipping/distance] OSRM → ${osrmDistanceKm} km (rota real por estrada)`
    );
    return {
      distanceKm: osrmDistanceKm,
      calculationMethod: "OSRM_ROUTE",
    };
  }

  // Fallback: Haversine com fator de correção
  const fallback = calculateHaversineDistance(origin, destination);
  console.warn(
    `[shipping/distance] OSRM indisponível → fallback Haversine×${HAVERSINE_TO_ROAD_FACTOR} = ${fallback.distanceKm} km`
  );
  return fallback;
}

