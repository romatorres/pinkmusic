/**
 * Módulo de cálculo de distância entre coordenadas geográficas.
 *
 * Utiliza a fórmula de Haversine com fator de correção empírico (×1.4)
 * para aproximar a distância real por estrada a partir da distância em linha reta.
 *
 * Nota: o serviço OSRM (router.project-osrm.org) foi removido por ser
 * instável em produção — retornava distâncias absurdas (ex: 12.171 km)
 * para endereços dentro de Feira de Santana.
 */

/** Fator empírico de correção linha-reta → estrada (ligeiramente maior para cidades com muitos desvios). */
const HAVERSINE_TO_ROAD_FACTOR = 1.4;

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  /** Indica o método usado para fins de debug/log. */
  calculationMethod: "HAVERSINE";
}

// ─── Haversine ───────────────────────────────────────────────────────────────

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula a distância aproximada por estrada entre dois pontos geográficos.
 * Usa Haversine (linha reta) × 1.4 para estimar a distância viária real.
 *
 * Para entregas locais dentro de um município (raio < 15 km), o erro
 * desta aproximação é tipicamente menor que 15%, aceitável para cálculo de frete.
 *
 * @param origin      Coordenadas de origem (loja)
 * @param destination Coordenadas de destino (endereço do cliente)
 */
export function calculateDistance(
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
  const correctedKm = straightLineKm * HAVERSINE_TO_ROAD_FACTOR;
  const distanceKm = Math.round(correctedKm * 100) / 100;

  console.log(
    `[shipping/distance] Haversine×${HAVERSINE_TO_ROAD_FACTOR}: ` +
    `origin=(${origin.latitude},${origin.longitude}) → dest=(${destination.latitude},${destination.longitude}) = ${distanceKm} km`
  );

  return {
    distanceKm,
    calculationMethod: "HAVERSINE",
  };
}

// Exporta também como calculateHaversineDistance para compatibilidade retroativa
export const calculateHaversineDistance = calculateDistance;
