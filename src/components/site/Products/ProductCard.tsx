"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag, ExternalLink, Eye, MapPin } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
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
  const [added, setAdded] = useState(false);
  const { addItem } = useCartStore();

  const isLocal = p.origin === "LOCAL";
  const isOutOfStock = p.available_quantity <= 0;

  const imageUrl =
    p.pictures && p.pictures.length > 0
      ? p.pictures[0].url
      : p.thumbnail || "/img/placeholder.png";

  const productUrl = `/products/${createProductSlug(p.title, p.id)}`;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLocal || isOutOfStock) return;

    addItem({
      productId: p.id,
      title: p.title,
      price: p.price,
      thumbnail: p.thumbnail,
      code: p.code,
      availableQuantity: p.available_quantity,
    });

    setAdded(true);
    toast.success("Adicionado ao carrinho", { description: p.title });
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift w-full">
      {/* Imagem do Produto */}
      <Link
        href={productUrl}
        className="relative block aspect-square overflow-hidden bg-muted/40"
      >
        <Image
          src={imageUrl}
          alt={p.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge do Canal: Loja Física ou Mercado Livre */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
          {isLocal ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground backdrop-blur-xs shadow-xs">
              <MapPin className="size-3" />
              Loja Física
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-ml px-2 py-0.5 text-[11px] font-bold text-[#011c11] shadow-xs">
              Mercado Livre
            </span>
          )}
        </div>

        {/* Overlay se esgotado */}
        {isOutOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/80 py-1.5 text-center text-xs font-semibold text-background backdrop-blur-xs">
            Indisponível
          </span>
        )}
      </Link>

      {/* Detalhes do Produto */}
      <div className="flex flex-1 flex-col p-3 md:p-4">
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

        {/* Preço */}
        <div className="mt-3 flex-1 flex items-baseline gap-2">
          <span className="font-display text-xl md:text-2xl font-bold text-foreground">
            {formatPrice(p.price, p.currency_id)}
          </span>
        </div>

        {/* Ações (Botões com novo padrão Lovable rounded-xl) */}
        <div className="mt-4 pt-1">
          {isLocal ? (
            <Button
              variant="local"
              className="w-full rounded-xl h-10 font-medium"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
            >
              {added ? (
                <>
                  <Check className="size-4" />
                  <span>Adicionado!</span>
                </>
              ) : isOutOfStock ? (
                <span>Indisponível</span>
              ) : (
                <>
                  <ShoppingBag className="size-4" />
                  <span className="hidden sm:inline">Adicionar ao carrinho</span>
                  <span className="sm:hidden">Adicionar</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="ml"
              className="w-full rounded-xl h-10 font-bold"
              asChild
            >
              {p.permalink ? (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5"
                >
                  <span className="hidden sm:inline">Ver no Mercado Livre</span>
                  <span className="sm:hidden">Mercado Livre</span>
                  <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <Link
                  href={productUrl}
                  className="inline-flex items-center justify-center gap-1.5"
                >
                  <Eye className="size-4" />
                  <span>Ver Detalhes</span>
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
