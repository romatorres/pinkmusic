import prisma from "@/lib/prisma";
import { STORE_SHIPPING_CONFIG } from "./config";

export interface GeocodedAddress {
  latitude: number | null;
  longitude: number | null;
  district: string;
  city: string;
  state: string;
  source?: "awesomeapi" | "nominatim" | "neighborhood_peer" | "viacep";
}

const TIMEOUT_MS = 3500;

/**
 * Busca dados de localização e coordenadas geográficas (lat/lng) para um CEP.
 *
 * Estratégia em camadas:
 *  1. AwesomeAPI (cep.awesomeapi.com.br) — retorna lat e lng precisos em ms para CEPs brasileiros.
 *  2. Nominatim / OpenStreetMap — pesquisa por Bairro, Cidade, Estado.
 *  3. Bairro vizinho já cadastrado no banco de dados local.
 *  4. ViaCEP — busca dados cadastrais (sem coordenadas) para validar se pertence a Feira de Santana.
 */
export async function resolveZipCoordinates(
  cleanZip: string,
  hintDistrict?: string
): Promise<GeocodedAddress> {
  let district = hintDistrict || "";
  let city = STORE_SHIPPING_CONFIG.storeCity;
  let state = STORE_SHIPPING_CONFIG.storeState;
  let latitude: number | null = null;
  let longitude: number | null = null;

  // ── 1. AwesomeAPI (traz lat/lng direto por CEP) ──────────────────────────
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
          latitude = lat;
          longitude = lng;
          district = data.district || district || "Centro";
          city = data.city || city;
          state = data.state || state;

          console.log(
            `[shipping/geocode] AwesomeAPI encontrou coordenadas para ${cleanZip}: (${latitude}, ${longitude}) - Bairro: ${district}`
          );

          return {
            latitude,
            longitude,
            district,
            city,
            state,
            source: "awesomeapi",
          };
        }
      }
    }
  } catch (err) {
    console.warn(`[shipping/geocode] AwesomeAPI falhou ou timeout para CEP ${cleanZip}:`, err);
  }

  // ── 2. ViaCEP para obter o bairro exato se ainda não tivermos ────────────
  if (!district) {
    try {
      const resVia = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`, {
        next: { revalidate: 86400 },
      });
      if (resVia.ok) {
        const dataVia = await resVia.json();
        if (dataVia && !dataVia.erro) {
          district = dataVia.bairro || "Centro";
          city = dataVia.localidade || city;
          state = dataVia.uf || state;
        }
      }
    } catch (err) {
      console.warn(`[shipping/geocode] ViaCEP falhou para ${cleanZip}:`, err);
    }
  }

  // ── 3. Nominatim / OpenStreetMap com o Bairro e Cidade ───────────────────
  if (district && district !== "Centro") {
    try {
      const query = `${district}, ${city}, ${state}, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        query
      )}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const resNom = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "PinkMusicShipping/1.0 (contato@pinkmusic.com.br)",
        },
      });
      clearTimeout(timer);

      if (resNom.ok) {
        const list = await resNom.json();
        if (Array.isArray(list) && list.length > 0 && list[0].lat && list[0].lon) {
          latitude = Number(list[0].lat);
          longitude = Number(list[0].lon);

          console.log(
            `[shipping/geocode] Nominatim encontrou coordenadas para bairro ${district}: (${latitude}, ${longitude})`
          );

          return {
            latitude,
            longitude,
            district,
            city,
            state,
            source: "nominatim",
          };
        }
      }
    } catch (err) {
      console.warn(`[shipping/geocode] Nominatim falhou para bairro ${district}:`, err);
    }
  }

  // ── 4. Bairro vizinho já cadastrado no banco local ────────────────────────
  if (district) {
    try {
      const peer = await prisma.shippingZipCode.findFirst({
        where: {
          district: { equals: district, mode: "insensitive" },
          latitude: { not: null },
          longitude: { not: null },
        },
      });

      if (peer && peer.latitude !== null && peer.longitude !== null) {
        console.log(
          `[shipping/geocode] Coordenadas herdadas de CEP vizinho no bairro ${district}: (${peer.latitude}, ${peer.longitude})`
        );
        return {
          latitude: peer.latitude,
          longitude: peer.longitude,
          district,
          city,
          state,
          source: "neighborhood_peer",
        };
      }
    } catch {
      // Ignora erro de consulta local
    }
  }

  // ── 5. Retorna dados cadastrais mesmo se sem coordenadas ──────────────────
  return {
    latitude: null,
    longitude: null,
    district: district || "Centro",
    city,
    state,
    source: "viacep",
  };
}
