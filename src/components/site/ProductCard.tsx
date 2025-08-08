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
    <div key={product.id} className="w-[300px] max-w-full">
      <div className="bg-card rounded-3xl shadow-sm overflow-hidden flex justify-center flex-col min-h-[480px] items-stretch gap-2.5 transition-transform duration-300 ease-in-out hover:translate-y-[-5px]">
        <div className="relative flex min-h-[260px] w-full flex-col justify-center py-[65px]">
          <div className="absolute top-2 left-2 rounded-3xl bg-white z-0 flex min-h-[260px] w-[276px] max-w-[276px]">
            <div className="relative w-[200px] h-auto flex items-center justify-center mx-auto">
              <Image
                src={imageUrl}
                alt={product.title}
                fill
                style={{ objectFit: "contain" }}
                className="rounded-t-lg"
              />
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
            {product.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-primary mb-2">
            <span className="flex items-center gap-1">
              <Package size={14} />
              {getConditionText(product.condition)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="text-4xl font-tanker text-foreground">
              {formatPrice(product.price, product.currency_id)}
            </div>
            <div>
              <button className="rounded-[25px] bg-primary self-stretch flex items-center gap-3 justify-center w-10 h-10 my-auto px-2.5 border-none cursor-pointer transition-colors duration-300 ease-in-out hover:bg-primary/85">
                <a
                  href={product.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/img/icon-store.svg"
                    alt="Add to Cart"
                    width={20}
                    height={20}
                    className="aspect-square object-contain object-center self-stretch my-auto"
                  />
                </a>
              </button>
            </div>
          </div>
          <p className="text-primary text-sm mb-4">
            Disponível: {product.available_quantity}
          </p>
          <div className="flex flex-col gap-2 mt-3">
            <Link
              href={`/products/${product.id}`}
              className="w-full bg-sidebar-primary text-foreground py-3 px-4 rounded-full hover:bg-background border-primary border-[1px] flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <Eye size={16} />
              Ver Detalhes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
