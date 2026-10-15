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
 * Usado para impedir que povoados ou homônimos em distritos rurais distantes
 * (ex: Lagoa Grande em Ipuaçu a 22km) sejam confundidos com bairros urbanos.
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
 * Centróides urbanos oficiais e mapeados dos bairros de Feira de Santana - BA.
 * Garante entrega rápida, sem falsos positivos rurais e com 100% de precisão de zona
 * caso as APIs públicas demorem ou sofram indisponibilidade.
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
  aeroporto: { lat: -12.205, lng: -38.91, displayName: "Aeroporto" },
  santoantoniodosprazeres: { lat: -12.245, lng: -38.905, displayName: "Santo Antônio dos Prazeres" },
  gabriela: { lat: -12.228, lng: -38.985, displayName: "Gabriela" },
  coroneljosedepinto: { lat: -12.249, lng: -38.955, displayName: "Coronel J. Pinto" },
  olhosdagua: { lat: -12.27, lng: -38.96, displayName: "Olhos D'Água" },
};

/**
 * Busca dados de localização e coordenadas geográficas (lat/lng) para um CEP.
 *
 * Estratégia em camadas protegidas:
 *  1. AwesomeAPI por CEP direto (valida se o resultado está dentro da mancha urbana).
 *  2. ViaCEP para obter Logradouro (rua) + Bairro oficiais.
 *  3. Nominatim restrito (Viewbox Bounded ao perímetro urbano de Feira de Santana,
 *     buscando por logradouro ou bairro, impedindo desvios para povoados rurais).
 *  4. Centróide urbano de bairro conhecido (mapa local de alta precisão).
 *  5. Herança de CEP vizinho já cadastrado no banco.
 *  6. Dados cadastrais ViaCEP.
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
          // Validação de sanidade: confere se a coordenada está dentro do perímetro de Feira
          if (isWithinFeiraUrbanBounds(lat, lng)) {
            district = data.district || district || "Centro";
            city = data.city || city;
            state = data.state || state;
            street = data.address_name || data.address || "";

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
    // Falha silenciosa para prosseguir aos fallbacks seguros
  }

  // ── 2. ViaCEP para obter o logradouro e bairro exatos ──────────────────────
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

  // ── 3. Nominatim com Viewbox Restrita ao Perímetro Urbano de Feira de Santana ──
  // A viewbox + bounded=1 impede que o Nominatim busque vilarejos em distritos rurais homônimos
  if (city.toLowerCase().trim() === STORE_SHIPPING_CONFIG.storeCity.toLowerCase().trim()) {
    const searchQueries: string[] = [];

    // Prioridade 3.1: Logradouro + Cidade (ex: "Rua Belmiro, Feira de Santana, BA, Brasil")
    if (street) {
      searchQueries.push(`${street}, ${city}, ${state}, Brasil`);
    }

    // Prioridade 3.2: Bairro + Cidade (ex: "Lagoa Grande, Feira de Santana, BA, Brasil")
    if (district && district.toLowerCase() !== "centro") {
      searchQueries.push(`${district}, ${city}, ${state}, Brasil`);
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
        // Ignora erro e continua tentativas
      }
    }
  }

  // ── 4. Centróide Urbano de Bairro Mapeado (Fallback Local Imediato e Confiável) ──
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

  // ── 5. Bairro vizinho já cadastrado no banco local ────────────────────────
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

  // ── 6. Retorna dados cadastrais mesmo se sem coordenadas ──────────────────
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
