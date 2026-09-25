"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Package, ShoppingCart, Plus, Check, Eye } from "lucide-react";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  }).format(price);
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCartStore();

  const imageUrl =
    product.pictures && product.pictures.length > 0
      ? product.pictures[0].url
      : product.thumbnail;

  const handleCardClick = () => {
    router.push(`/products/${product.id}`);
  };

  const handleBuyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (product.origin === "LOCAL" || !product.permalink) {
      router.push(`/products/${product.id}`);
    } else {
      window.open(product.permalink, "_blank", "noopener,noreferrer");
    }
  };

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (product.origin !== "LOCAL" || product.available_quantity <= 0) return;

    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      code: product.code,
      packageSize: product.packageSize || "SMALL",
      availableQuantity: product.available_quantity,
    });

    setAddedToCart(true);
    toast.success("Adicionado ao carrinho! 🛒");
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const isLocal = product.origin === "LOCAL";

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-[300px]">
      <div
        onClick={handleCardClick}
        className="bg-card rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[460px] sm:min-h-[480px] transition-transform duration-300 ease-in-out hover:translate-y-[-5px] cursor-pointer relative"
      >
        {/* Container da imagem */}
        <div className="relative flex min-h-[220px] sm:min-h-[260px] w-full flex-col justify-center p-2">
          <div className="absolute inset-2 rounded-2xl sm:rounded-3xl bg-white shadow-inner">
            <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-4">
              <div className="relative w-full h-full max-w-[160px] max-h-[160px] sm:max-w-[200px] sm:max-h-[200px]">
                <Image
                  src={imageUrl}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 160px, 200px"
                  style={{ objectFit: "contain" }}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Badge de Pronta Entrega Local */}
          {isLocal && (
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-primary/80 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wide">
                Pronta Entrega
              </span>
            </div>
          )}

          {/* Botão rápido de carrinho (hover) — só para produtos locais */}
          {isLocal && product.available_quantity > 0 && (
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label="Adicionar ao carrinho"
              className={`absolute bottom-4 right-4 z-10 h-9 w-9 flex-shrink-0 overflow-hidden rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${addedToCart
                ? "bg-emerald-500 text-white scale-110"
                : "bg-white text-primary hover:bg-primary hover:text-white hover:scale-110"
                }`}
            >
              {addedToCart ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Plus className="h-4 w-4 shrink-0" />
              )}
            </button>
          )}
        </div>

        {/* Conteúdo do card */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-2 line-clamp-2">
            {product.title}
          </h2>

          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-primary mb-2">
            <span className="flex items-center gap-1">
              <Package size={12} className="sm:w-4 sm:h-4" />
              {product.brand?.name || "Pink Music"}
            </span>
          </div>

          <div className="flex justify-start items-center mb-2">
            <div className="text-2xl sm:text-4xl font-tanker text-foreground leading-tight">
              {formatPrice(product.price, product.currency_id)}
            </div>
          </div>

          <p className="text-primary text-xs sm:text-sm mb-4">
            Disponível:{" "}
            <span className="font-semibold text-base">
              {product.available_quantity}
            </span>
            {isLocal && (
              <span className="ml-1 text-primary/80 font-medium text-xs">
                (na loja física)
              </span>
            )}
          </p>

          <div className="space-y-2 mt-auto">
            {/* Botão adicionar ao carrinho (apenas local) */}
            {isLocal && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.available_quantity <= 0}
                className={`w-full py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300 whitespace-nowrap overflow-hidden ${addedToCart
                  ? "bg-emerald-500 text-white"
                  : "border border-primary text-primary hover:bg-primary/5"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {addedToCart ? (
                  <>
                    <Check size={15} className="shrink-0" />
                    <span className="truncate">No carrinho!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} className="shrink-0" />
                    <span className="truncate">Adicionar ao Carrinho</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleBuyClick}
              className="w-full py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer text-white bg-primary hover:bg-primary/85 whitespace-nowrap overflow-hidden"
            >
              <Eye size={20} className="shrink-0" />
              <span className="truncate">{isLocal ? "Ver Produto" : "Comprar"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
