"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Eye } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  available_quantity: number;
  seller_nickname: string;
  permalink: string;
  pictures: { url: string }[];
}

interface ProductCardProps {
  product: Product;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  }).format(price);
};

const getConditionText = (condition: string) => {
  const conditions: { [key: string]: string } = {
    new: "Novo",
    used: "Usado",
    not_specified: "Não especificado",
  };
  return conditions[condition] || condition;
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const imageUrl =
    product.pictures && product.pictures.length > 0
      ? product.pictures[0].url
      : product.thumbnail;
  return (
    <div
      key={product.id}
      className="w-full max-w-xs sm:max-w-sm md:max-w-[300px]"
    >
      <div className="bg-card rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[460px] sm:min-h-[480px] transition-transform duration-300 ease-in-out hover:translate-y-[-5px]">
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
        </div>

        {/* Conteúdo do card */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2 line-clamp-2">
            {product.title}
          </h2>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-primary mb-2">
            <span className="flex items-center gap-1">
              <Package size={12} className="sm:w-[14px] sm:h-[14px]" />
              {getConditionText(product.condition)}
            </span>
          </div>

          <div className="flex justify-between items-center mb-3">
            <div className="text-2xl sm:text-4xl font-tanker text-foreground leading-tight">
              {formatPrice(product.price, product.currency_id)}
            </div>
            <button className="rounded-full bg-primary flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 border-none cursor-pointer transition-colors duration-300 ease-in-out hover:bg-primary/85 shrink-0">
              <a
                href={product.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-full"
              >
                <Image
                  src="/img/icon-store.svg"
                  alt="Add to Cart"
                  width={16}
                  height={16}
                  className="sm:w-5 sm:h-5 object-contain"
                />
              </a>
            </button>
          </div>

          <p className="text-primary text-xs sm:text-sm mb-4">
            Disponível: {product.available_quantity}
          </p>

          <div className="flex flex-col gap-2 mt-auto">
            <Link
              href={`/products/${product.id}`}
              className="w-full bg-sidebar-primary text-foreground py-2.5 sm:py-3 px-3 sm:px-4 rounded-full hover:bg-background border-primary border-[1px] flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm transition-colors duration-300"
            >
              <Eye size={14} className="sm:w-4 sm:h-4" />
              Ver Detalhes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
