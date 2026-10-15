import prisma from "@/lib/prisma";
import { STORE_SHIPPING_CONFIG } from "./config";

export interface GeocodedAddress {
  latitude: number | null;
  longitude: number | null;
  district: string;
  city: string;
  state: string;
  street?: string;
  source?: "awesomeapi" | "nominatim" | "neighborhood_centroid" | "neighborhood_peer" | "viacep";
}

const TIMEOUT_MS = 5000;

/**
 * Limites geográficos (Bounding Box) da mancha urbana de Feira de Santana - BA.
 * Usado para impedir que rodovias longas ou homônimos rurais em distritos distantes
 * sejam confundidos com endereços da área urbana da cidade.
 */
const FEIRA_URBAN_BOUNDS = {
  minLat: -12.35,
  maxLat: -12.15,
  minLng: -39.06,
  maxLng: -38.83,
};

function isWithinFeiraUrbanBounds(lat: number, lng: number): boolean {
  return (
    lat >= FEIRA_URBAN_BOUNDS.minLat &&
    lat <= FEIRA_URBAN_BOUNDS.maxLat &&
    lng >= FEIRA_URBAN_BOUNDS.minLng &&
    lng <= FEIRA_URBAN_BOUNDS.maxLng
  );
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Catálogo de centróides urbanos oficiais dos bairros de Feira de Santana - BA.
 *
 * Esta é a fonte primária de coordenadas após ViaCEP retornar o nome do bairro.
 * Garante que avenidas longas (ex: Av. Sérgio Carneiro, BR-324) e rodovias que
 * atravessam a cidade não causem distâncias erradas pela posição de um trecho
 * arbitrário da via no mapa.
 *
 * Padrão da chave: normalizeKey(nome do bairro) — tudo minúsculo, sem acento, sem espaço.
 */
export const FEIRA_URBAN_NEIGHBORHOODS: Record<string, { lat: number; lng: number; displayName: string }> = {
  lagoagrande: { lat: -12.2503, lng: -38.942, displayName: "Lagoa Grande" },
  sobradinho: { lat: -12.242, lng: -38.975, displayName: "Sobradinho" },
  centro: { lat: -12.2576, lng: -38.9634, displayName: "Centro" },
  kalilandia: { lat: -12.2568, lng: -38.961, displayName: "Kalilândia" },
  caseb: { lat: -12.253, lng: -38.945, displayName: "Caseb" },
  saojoao: { lat: -12.251, lng: -38.945, displayName: "São João" },
  queimadinha: { lat: -12.251, lng: -38.958, displayName: "Queimadinha" },
  pontocentral: { lat: -12.255, lng: -38.95, displayName: "Ponto Central" },
  cidadenova: { lat: -12.2341, lng: -38.948, displayName: "Cidade Nova" },
  tomba: { lat: -12.285, lng: -38.945, displayName: "Tomba" },
  sim: { lat: -12.26, lng: -38.92, displayName: "SIM" },
  aviario: { lat: -12.2921, lng: -38.9121, displayName: "Aviário" },
  aeroporto: { lat: -12.205, lng: -38.91, displayName: "Aeroporto" },
  santamonica: { lat: -12.26, lng: -38.94, displayName: "Santa Mônica" },
  santamonica2: { lat: -12.263, lng: -38.935, displayName: "Santa Mônica II" },
  capuchinhos: { lat: -12.265, lng: -38.95, displayName: "Capuchinhos" },
  brasilia: { lat: -12.268, lng: -38.958, displayName: "Brasília" },
  serrariabrasil: { lat: -12.268, lng: -38.958, displayName: "Serraria Brasil" },
  muchila: { lat: -12.27, lng: -38.97, displayName: "Muchila" },
  feirax: { lat: -12.275, lng: -38.98, displayName: "Feira X" },
  feiravii: { lat: -12.29, lng: -38.965, displayName: "Feira VII" },
  feiraix: { lat: -12.272, lng: -38.995, displayName: "Feira IX" },
  feiraiv: { lat: -12.282, lng: -38.96, displayName: "Feira IV" },
  campolimpo: { lat: -12.23, lng: -38.98, displayName: "Campo Limpo" },
  parqueipe: { lat: -12.238, lng: -38.96, displayName: "Parque Ipê" },
  mangabeira: { lat: -12.228, lng: -38.928, displayName: "Mangabeira" },
  papagaio: { lat: -12.205, lng: -38.945, displayName: "Papagaio" },
  conceicao: { lat: -12.238, lng: -38.935, displayName: "Conceição" },
  conceicaoi: { lat: -12.238, lng: -38.935, displayName: "Conceição I" },
  conceicaoii: { lat: -12.234, lng: -38.925, displayName: "Conceição II" },
  baraunas: { lat: -12.247, lng: -38.968, displayName: "Baraúnas" },
  chacarasdoroque: { lat: -12.272, lng: -38.965, displayName: "Chácara São Roque" },
  chacarasaoroque: { lat: -12.272, lng: -38.965, displayName: "Chácara São Roque" },
  cruzeiro: { lat: -12.245, lng: -38.93, displayName: "Cruzeiro" },
  jardimcruzeiro: { lat: -12.246, lng: -38.972, displayName: "Jardim Cruzeiro" },
  pedradodescanso: { lat: -12.278, lng: -38.982, displayName: "Pedra do Descanso" },
  registro: { lat: -12.2335, lng: -38.8738, displayName: "Registro" },
  parquegetuliovargas: { lat: -12.262, lng: -38.942, displayName: "Parque Getúlio Vargas" },
  vilaolimpia: { lat: -12.278, lng: -38.97, displayName: "Vila Olímpia" },
  subae: { lat: -12.285, lng: -38.93, displayName: "Subaé" },
  cis: { lat: -12.295, lng: -38.935, displayName: "CIS" },
  tanquedanacao: { lat: -12.25, lng: -38.968, displayName: "Tanque da Nação" },
  ruanova: { lat: -12.265, lng: -38.972, displayName: "Rua Nova" },
  estacaonova: { lat: -12.256, lng: -38.948, displayName: "Estação Nova" },
  moradadasarvores: { lat: -12.238, lng: -38.985, displayName: "Morada das Árvores" },
  calumbi: { lat: -12.262, lng: -38.985, displayName: "Calumbi" },
  sitionovo: { lat: -12.236, lng: -38.99, displayName: "Sítio Novo" },
  geisel: { lat: -12.222, lng: -38.945, displayName: "Geisel" },
  asabranca: { lat: -12.22, lng: -38.965, displayName: "Asa Branca" },
  novohorizonte: { lat: -12.215, lng: -38.955, displayName: "Novo Horizonte" },
  santoantoniodosprazeres: { lat: -12.245, lng: -38.905, displayName: "Santo Antônio dos Prazeres" },
  gabriela: { lat: -12.228, lng: -38.985, displayName: "Gabriela" },
  coroneljosedepinto: { lat: -12.249, lng: -38.955, displayName: "Coronel J. Pinto" },
  olhosdagua: { lat: -12.27, lng: -38.96, displayName: "Olhos D'Água" },
};

/**
 * Busca dados de localização e coordenadas geográficas (lat/lng) para um CEP.
 *
 * Estratégia em camadas com prioridade invertida (bairro antes de GPS):
 *  1. AwesomeAPI por CEP direto (valida se o resultado está dentro da mancha urbana).
 *  2. ViaCEP para obter Logradouro + Bairro oficiais do IBGE.
 *  3. Centróide urbano de bairro mapeado (prioridade ELEVADA — intercepta rodovias longas).
 *  4. Herança de CEP vizinho já cadastrado no banco.
 *  5. Nominatim (ÚLTIMO RECURSO GPS) restrito à Bounding Box urbana.
 *  6. Fallback sem coordenadas (calcula distância central ou usa zona do banco).
 */
export async function resolveZipCoordinates(
  cleanZip: string,
  hintDistrict?: string
): Promise<GeocodedAddress> {
  let district = hintDistrict || "";
  let street = "";
  let city = STORE_SHIPPING_CONFIG.storeCity;
  let state = STORE_SHIPPING_CONFIG.storeState;

  // ── 1. AwesomeAPI (tenta lat/lng direto por CEP) ──────────────────────────
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanZip}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "PinkMusicShipping/1.0",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data && data.lat && data.lng) {
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Enriquece metadados independente de a coordenada ser válida ou não
          district = data.district || district || "";
          city = data.city || city;
          state = data.state || state;
          street = data.address_name || data.address || "";

          // Retorna coordenada apenas se estiver dentro do perímetro urbano
          // Rodovias longas (ex: BR-324 chegando em Humildes) são ignoradas aqui
          // e o bairro correto será usado na Camada 3
          if (isWithinFeiraUrbanBounds(lat, lng)) {
            return {
              latitude: lat,
              longitude: lng,
              district,
              city,
              state,
              street,
              source: "awesomeapi",
            };
          }
        }
      }
    }
  } catch {
    // Falha silenciosa — prossegue para os fallbacks
  }

  // ── 2. ViaCEP para obter o bairro e logradouro exatos do IBGE ─────────────
  // Reconfirma / complementa os dados já obtidos pela AwesomeAPI
  try {
    const controllerVia = new AbortController();
    const timerVia = setTimeout(() => controllerVia.abort(), TIMEOUT_MS);

    const resVia = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
      signal: controllerVia.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timerVia);

    if (resVia.ok) {
      const dataVia = await resVia.json();
      if (dataVia && !dataVia.erro) {
        district = dataVia.bairro || district || "Centro";
        city = dataVia.localidade || city;
        state = dataVia.uf || state;
        street = dataVia.logradouro || street || "";
      }
    }
  } catch {
    // Falha silenciosa
  }

  // ── 3. Centróide Urbano de Bairro Mapeado (PRIORIDADE ELEVADA) ───────────
  // Subiu de Camada 4 para Camada 3 para interceptar casos onde o GPS retornou
  // ponto equivocado em rodovias longas ou avenidas que atravessam a cidade.
  // Bairros mapeados recebem coordenadas centrais precisas e sem ambiguidade.
  if (district && city.toLowerCase().trim() === STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim()) {
    const normalizedDistrict = normalizeKey(district);
    const matchedCentroid = FEIRA_URBAN_NEIGHBORHOODS[normalizedDistrict];

    if (matchedCentroid) {
      return {
        latitude: matchedCentroid.lat,
        longitude: matchedCentroid.lng,
        district: matchedCentroid.displayName || district,
        city,
        state,
        street,
        source: "neighborhood_centroid",
      };
    }
  }

  // ── 4. Bairro vizinho já cadastrado no banco local ────────────────────────
  // Para bairros ainda não mapeados no catálogo local, herda coordenadas de
  // outro CEP do mesmo bairro já resolvido e salvo anteriormente.
  if (district) {
    try {
      const peer = await prisma.shippingZipCode.findFirst({
        where: {
          district: { equals: district, mode: "insensitive" },
          latitude: { not: null },
          longitude: { not: null },
        },
      });

      if (
        peer &&
        peer.latitude !== null &&
        peer.longitude !== null &&
        isWithinFeiraUrbanBounds(peer.latitude, peer.longitude)
      ) {
        return {
          latitude: peer.latitude,
          longitude: peer.longitude,
          district,
          city,
          state,
          street,
          source: "neighborhood_peer",
        };
      }
    } catch {
      // Ignora erro de consulta local
    }
  }

  // ── 5. Nominatim / OpenStreetMap (ÚLTIMO RECURSO GPS) ────────────────────
  // Só chega aqui se o bairro for completamente desconhecido.
  // A viewbox + bounded=1 limita a busca ao perímetro urbano de Feira de Santana.
  // Tenta primeiro pelo bairro (mais estável que a rua para evitar trechos errados).
  if (city.toLowerCase().trim() === STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim()) {
    const searchQueries: string[] = [];

    if (district && district.toLowerCase() !== "centro") {
      searchQueries.push(`${district}, ${city}, ${state}, Brasil`);
    }
    if (street) {
      searchQueries.push(`${street}, ${city}, ${state}, Brasil`);
    }

    const viewboxParam = `${FEIRA_URBAN_BOUNDS.minLng},${FEIRA_URBAN_BOUNDS.minLat},${FEIRA_URBAN_BOUNDS.maxLng},${FEIRA_URBAN_BOUNDS.maxLat}`;

    for (const query of searchQueries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=${viewboxParam}&q=${encodeURIComponent(
          query
        )}`;

        const controllerNom = new AbortController();
        const timerNom = setTimeout(() => controllerNom.abort(), TIMEOUT_MS);

        const resNom = await fetch(url, {
          signal: controllerNom.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "PinkMusicShipping/1.0 (contato@pinkmusic.com.br)",
          },
        });
        clearTimeout(timerNom);

        if (resNom.ok) {
          const list = await resNom.json();
          if (Array.isArray(list) && list.length > 0 && list[0].lat && list[0].lon) {
            const lat = Number(list[0].lat);
            const lng = Number(list[0].lon);

            if (isWithinFeiraUrbanBounds(lat, lng)) {
              return {
                latitude: lat,
                longitude: lng,
                district,
                city,
                state,
                street,
                source: "nominatim",
              };
            }
          }
        }
      } catch {
        // Ignora erro e continua próxima tentativa
      }
    }
  }

  // ── 6. Fallback sem coordenadas ───────────────────────────────────────────
  // calculate-shipping.ts usará a zona já vinculada ao CEP no banco ou
  // o fallback de distância urbana central (2.5 km), evitando rejeição indevida.
  return {
    latitude: null,
    longitude: null,
    district: district || "Centro",
    city,
    state,
    street,
    source: "viacep",
  };
}
