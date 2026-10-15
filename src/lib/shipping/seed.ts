import prisma from "@/lib/prisma";

export async function ensureDefaultShippingZonesAndZipCodes() {
  const existingZonesCount = await prisma.shippingZone.count();

  let zone1Id: string | null = null;
  let zone2Id: string | null = null;
  let zone3Id: string | null = null;
  let zone4Id: string | null = null;

  if (existingZonesCount === 0) {
    console.log("[shipping/seed] Criando as 4 zonas iniciais de entrega...");

    const z1 = await prisma.shippingZone.create({
      data: {
        name: "Zona 1",
        description: "0 ate 3 km (Centro e bairros adjacentes)",
        minDistance: 0,
        maxDistance: 3,
        price: 10.00,
        active: true,
      },
    });
    zone1Id = z1.id;

    const z2 = await prisma.shippingZone.create({
      data: {
        name: "Zona 2",
        description: "Acima de 3 ate 6 km (Regiao intermediaria de Feira)",
        minDistance: 3,
        maxDistance: 6,
        price: 12.00,
        active: true,
      },
    });
    zone2Id = z2.id;

    const z3 = await prisma.shippingZone.create({
      data: {
        name: "Zona 3",
        description: "Acima de 6 ate 10 km (Regiao perimetral e anel viario)",
        minDistance: 6,
        maxDistance: 10,
        price: 15.00,
        active: true,
      },
    });
    zone3Id = z3.id;

    const z4 = await prisma.shippingZone.create({
      data: {
        name: "Zona 4",
        description: "Acima de 10 ate 12 km (Bairros mais distantes)",
        minDistance: 10,
        maxDistance: 12,
        price: 18.00,
        active: true,
      },
    });
    zone4Id = z4.id;
  } else {
    const zones = await prisma.shippingZone.findMany({
      orderBy: { minDistance: "asc" },
    });
    zone1Id = zones[0]?.id || null;
    zone2Id = zones[1]?.id || null;
    zone3Id = zones[2]?.id || null;
    zone4Id = zones[3]?.id || null;
  }

  // CEPs iniciais de Feira de Santana - BA
  const initialZipCodes = [
    { zipCode: "44002000", district: "Centro / Kalilandia", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone1Id },
    { zipCode: "44001000", district: "Centro", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone1Id },
    { zipCode: "44002100", district: "Kalilandia", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone1Id },
    { zipCode: "44050000", district: "Cidade Nova", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone2Id },
    { zipCode: "44075000", district: "Tomba", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone2Id },
    { zipCode: "44052000", district: "Sobradinho", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone1Id },
    { zipCode: "44085000", district: "SIM", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone3Id },
    { zipCode: "44111000", district: "Feira IX", city: "Feira de Santana", state: "BA", latitude: null, longitude: null, zoneId: zone4Id },
  ];

  for (const item of initialZipCodes) {
    const existing = await prisma.shippingZipCode.findUnique({
      where: { zipCode: item.zipCode },
    });
    if (!existing) {
      await prisma.shippingZipCode.create({ data: item });
    }
  }
}
