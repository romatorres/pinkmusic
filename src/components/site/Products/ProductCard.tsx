"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { Product } from "@/lib/types";
import { createProductSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  }).format(price);
};

const ProductCard: React.FC<ProductCardProps> = ({ product: p }) => {
  const isOutOfStock = p.available_quantity <= 0;

  const imageUrl =
    p.pictures && p.pictures.length > 0
      ? p.pictures[0].url
      : p.thumbnail || "/img/placeholder.png";

  const productUrl = `/products/${createProductSlug(p.title, p.id)}`;

  // Cálculo de desconto
  const hasDiscount = Boolean(
    p.originalPrice && p.originalPrice > p.price
  );
  const discountPercent = hasDiscount
    ? Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100)
    : 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift w-full">
      {/* Imagem do Produto */}
      <Link
        href={productUrl}
        className="relative block aspect-square overflow-hidden"
      >
        <Image
          src={imageUrl}
          alt={p.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge de Oferta / Desconto */}
        {hasDiscount && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <span className="inline-flex items-center rounded-md bg-destructive px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              -{discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Overlay se esgotado */}
        {isOutOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1.5 text-center text-xs font-semibold text-background backdrop-blur-xs">
            Indisponível
          </span>
        )}
      </Link>

      {/* Detalhes do Produto */}
      <div className="flex flex-1 flex-col p-3 md:p-4 bg-card border-t border-border/60">
        {/* Marca */}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {p.brand?.name || "Pink Music"}
        </span>

        {/* Nome do Produto */}
        <Link
          href={productUrl}
          className="mt-1 line-clamp-2 min-h-[2.6em] text-sm md:text-[15px] font-medium leading-snug text-foreground hover:text-primary transition-colors"
          title={p.title}
        >
          {p.title}
        </Link>

        {/* Preço (com preço antigo riscado caso haja desconto) */}
        <div className="mt-3 flex-1 flex flex-col justify-end">
          {hasDiscount && p.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(p.originalPrice, p.currency_id)}
            </span>
          )}
          <span className="font-display text-xl md:text-2xl font-bold text-foreground">
            {formatPrice(p.price, p.currency_id)}
          </span>
        </div>

        {/* Ação única: Ver Detalhes (padrão Lovable com cantos rounded-xl) */}
        <div className="mt-4 pt-1">
          <Button
            variant="local"
            className="w-full rounded-xl h-10 font-semibold"
            asChild
          >
            <Link
              href={productUrl}
              className="inline-flex items-center justify-center gap-2"
            >
              <Eye className="size-4" />
              <span>Ver Detalhes</span>
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
