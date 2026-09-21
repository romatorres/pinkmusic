"use client";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Package, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";

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
  const imageUrl =
    product.pictures && product.pictures.length > 0
      ? product.pictures[0].url
      : product.thumbnail;

  // Handler para navegar ao clicar no card
  const handleCardClick = () => {
    router.push(`/products/${product.id}`);
  };

  // Handler para o botão de compra
  const handleBuyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Impede que o clique suba para o card
    if (product.origin === "LOCAL" || !product.permalink) {
      router.push(`/products/${product.id}`);
    } else {
      window.open(product.permalink, "_blank", "noopener,noreferrer");
    }
  };

  const isLocal = product.origin === "LOCAL";

  return (
    <div className="w-full max-w-xs sm:max-w-sm md:max-w-[300px]">
      <div
        onClick={handleCardClick}
        className="bg-card rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[460px] sm:min-h-[480px] transition-transform duration-300 ease-in-out hover:translate-y-[-5px] cursor-pointer relative"
      >
        {/* Container da imagem com efeito de borda responsivo */}
        <div className="relative flex min-h-[220px] sm:min-h-[260px] w-full flex-col justify-center p-2">
          {/* Div absoluta com efeito de borda (8px de margem em todas as direções) */}
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

          <div className="space-y-3 mt-auto">
            <button
              type="button"
              onClick={handleBuyClick}
              className={`w-full py-3 px-6 rounded-full flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer text-white bg-primary hover:bg-primary/85`}
            >
              <ShoppingCart size={20} />
              {isLocal ? "Compra Local" : "Comprar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
