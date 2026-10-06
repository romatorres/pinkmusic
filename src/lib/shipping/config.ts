/**
 * Configurações de Origem e Parâmetros de Entrega Local
 * Loja física Pink Music em Feira de Santana - BA
 */

export const STORE_SHIPPING_CONFIG = {
  // CEP de Origem da Loja Física (Kalilândia / Centro - Feira de Santana - BA)
  originZipCode: process.env.STORE_ZIP?.replace(/\D/g, "") || "44002000",
  originZipCodeFormatted: "44002-000",
  storeCity: process.env.STORE_CITY || "Feira de Santana",
  storeState: process.env.STORE_STATE || "BA",

  // Coordenadas geográficas da loja física (ponto de partida das entregas)
  originCoordinates: {
    latitude: Number(process.env.STORE_LAT) || -12.2576,
    longitude: Number(process.env.STORE_LNG) || -38.9634,
  },

  // Raio máximo padrão em KM para entregas locais
  maxDeliveryRadiusKm: 10,
};
