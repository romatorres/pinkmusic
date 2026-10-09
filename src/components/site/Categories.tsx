"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "./_components/SectionHead";
import type { Category } from "@/lib/types";

// Mapeamento das imagens de alta qualidade para as categorias
const CATEGORY_IMAGES: Record<string, string> = {
  baterias: "/img/categories/cat-baterias.jpg",
  cordas: "/img/categories/cat-cordas.jpg",
  "home-studio": "/img/categories/cat-studio.jpg",
  studio: "/img/categories/cat-studio.jpg",
  percussao: "/img/categories/cat-percussao.jpg",
  sopro: "/img/categories/cat-sopro.jpg",
  teclas: "/img/categories/cat-teclas.jpg",
  audio: "/img/categories/cat-audio.jpg",
  "áudio": "/img/categories/cat-audio.jpg",
};

// Descrições padrão para as categorias no card
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  baterias: "Baterias acústicas e eletrônicas, pratos, peles e baquetas.",
  cordas: "Guitarras, violões, baixos, acessórios e equipamentos.",
  "home-studio": "Interfaces, monitores e tudo para gravar em casa.",
  percussao: "Congas, bongôs, zabumbas, timbales e efeitos.",
  sopro: "Palhetas e acessórios para instrumentos de sopro.",
  teclas: "Teclados, pianos, sintetizadores e controladores.",
  audio: "Microfones, mesas, caixas ativas, fones e cabos.",
};

function getCategoryThumbnail(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  for (const [key, path] of Object.entries(CATEGORY_IMAGES)) {
    const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      return path;
    }
  }
  return "/img/categories/cat-cordas.jpg";
}

function getCategoryDescription(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  for (const [key, desc] of Object.entries(CATEGORY_DESCRIPTIONS)) {
    const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      return desc;
    }
  }
  return "Instrumentos musicais e acessórios de qualidade.";
}

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Apenas categorias raiz (sem parentId)
          const roots = json.data.filter((c: Category) => !c.parentId);
          setCategories(roots);
        }
      } catch (err) {
        console.error("Erro ao carregar categorias na home:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <section className="container-page mt-14" aria-label="Categorias em destaque">
      <SectionHead
        title="Encontre o que você procura"
        subtitle={
          categories.length > 0
            ? `Navegue pelas nossas ${categories.length} categorias.`
            : "Navegue pelas nossas categorias de instrumentos e áudio."
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 lg:grid-cols-7 animate-pulse">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="aspect-square bg-muted/60" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted/80 rounded w-3/4" />
                <div className="h-3 bg-muted/50 rounded w-full" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 lg:grid-cols-7">
          {categories.map((c) => {
            const subsCount = c.subcategories?.length || 0;
            const imageSrc = getCategoryThumbnail(c.name);
            const description = getCategoryDescription(c.name);

            return (
              <Link
                key={c.id}
                href={`/products-all?categoryIds=${c.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                {/* Imagem quadrada com zoom no hover */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={imageSrc}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 15vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Conteúdo textual */}
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors font-display">
                    {c.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                  <span className="mt-3 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>
                      {subsCount}{" "}
                      {subsCount === 1 ? "subcategoria" : "subcategorias"}
                    </span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategoriesSection;
