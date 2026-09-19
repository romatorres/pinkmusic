import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAIN_CATEGORIES = [
  { name: "Cordas", slug: "cordas" },
  { name: "Teclas", slug: "teclas" },
  { name: "Percussão", slug: "percussao" },
  { name: "Baterias", slug: "baterias" },
  { name: "Áudio", slug: "audio" },
  { name: "Home Studio", slug: "home-studio" },
  { name: "Sopro", slug: "sopro" },
];

// Mapeamento das categorias filhas conhecidas
const PARENT_MAPPING = {
  Cordas: [
    "Guitarras",
    "Violão",
    "Baixos",
    "Pedais e Pedaleiras",
    "Encordoamentos",
    "Amplificador de Guitarra",
    "Amplificador de Baixo",
    "Amplificador de Violão",
    "Afinadores",
    "Correias para instrumentos",
  ],
  Teclas: ["Teclados", "Pianos", "Controladores", "Acordeon"],
  Baterias: ["Bateria Eletrônica", "Pratos", "Peles"],
  Percussão: [],
  Áudio: [
    "Microfones",
    "Mesas",
    "Caixas Ativas",
    "Fones",
    "Falantes e Drivers",
    "Monitoes sem fio",
    "Transmissor sem fio",
    "Direct Box",
    "Processadores",
    "Amplificadores",
    "Amplificador para Fone",
    "Plugs e Cabos",
    "Fontes",
  ],
  "Home Studio": [
    "Interface de Áudio",
    "Interface de Áudio ",
    "Monitores de Estúdio",
    "Home e Som Ambiente",
  ],
  Sopro: [],
};

async function main() {
  console.log("Iniciando organização das categorias...");

  // 1. Garantir que as 7 categorias principais existem e têm seus slugs e parentId = null
  const mainCategoryMap = new Map();

  for (const mainCat of MAIN_CATEGORIES) {
    let cat = await prisma.category.findUnique({
      where: { name: mainCat.name },
    });

    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: mainCat.name,
          slug: mainCat.slug,
          parentId: null,
        },
      });
      console.log(`+ Categoria principal criada: ${cat.name} (${cat.slug})`);
    } else {
      cat = await prisma.category.update({
        where: { id: cat.id },
        data: {
          slug: mainCat.slug,
          parentId: null,
        },
      });
      console.log(`* Categoria principal atualizada: ${cat.name} (${cat.slug})`);
    }

    mainCategoryMap.set(mainCat.name, cat.id);
  }

  // 2. Associar as subcategorias conhecidas aos seus respectivos pais
  for (const [parentName, childrenNames] of Object.entries(PARENT_MAPPING)) {
    const parentId = mainCategoryMap.get(parentName);
    if (!parentId) continue;

    for (const childName of childrenNames) {
      const child = await prisma.category.findUnique({
        where: { name: childName },
      });

      if (child) {
        // Gerar slug para a subcategoria caso não tenha
        const childSlug =
          child.slug ||
          child.name
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        await prisma.category.update({
          where: { id: child.id },
          data: {
            parentId: parentId,
            slug: childSlug,
          },
        });
        console.log(`  -> Subcategoria "${child.name}" vinculada a "${parentName}" (slug: ${childSlug})`);
      }
    }
  }

  // 3. Garantir slug para qualquer categoria remanescente que não tenha
  const allCategories = await prisma.category.findMany({
    where: { slug: null },
  });

  for (const c of allCategories) {
    const s = c.name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await prisma.category.update({
      where: { id: c.id },
      data: { slug: s },
    });
    console.log(`  -> Slug gerado para "${c.name}": ${s}`);
  }

  console.log("Categorias configuradas com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
