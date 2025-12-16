"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  Package,
  Home,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/Page-container";
import Social from "../_components/Social";
import type { ProductDetailsProps } from "@/lib/types";

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency === "BRL" ? "BRL" : "USD",
  }).format(price);
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <section>
      <div className="bg-primary/5 border-b border-primary/10 w-full">
        {/* Breadcrumb */}
        <div className="mx-auto w-full container px-4 sm:px-6 lg:px-8 py-3">
          <nav
            className="flex items-center gap-2 text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              href="/products-all"
              className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              <span className="font-medium">Produtos</span>
            </Link>

            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-primary font-medium truncate max-w-[200px]">
              {product.title}
            </span>
          </nav>
        </div>
      </div>
      <PageContainer>
        <div className="mx-auto p-6 my-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Imagens */}
            <div className="space-y-4">
              <div className="aspect-square bg-white rounded-lg overflow-hidden relative w-full">
                {(product.pictures?.[selectedImage]?.secure_url ||
                  product.thumbnail) && (
                  <Image
                    src={
                      product.pictures?.[selectedImage]?.secure_url ||
                      product.thumbnail
                    }
                    alt={product.title}
                    fill
                    style={{ objectFit: "contain" }}
                    className="rounded-lg"
                  />
                )}
              </div>

              {product.pictures && product.pictures.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.pictures.map((picture, index) => (
                    <button
                      key={picture.id}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                        selectedImage === index
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="relative w-full h-full">
                        {picture.secure_url && (
                          <Image
                            src={picture.secure_url}
                            alt={`Thumbnail ${index + 1}`}
                            fill
                            style={{ objectFit: "cover" }}
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {product.title}
                </h1>
                <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-primary mb-2">
                  <span className="flex items-center gap-1">
                    <Package size={12} className="sm:w-4 sm:h-4" />
                    {product.brand.name}
                  </span>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="text-5xl font-tanker text-foreground mb-2">
                  {formatPrice(product.price, product.currency_id)}
                </div>
                <p className="text-primary">
                  {product.available_quantity > 0
                    ? `${product.available_quantity} disponível${
                        product.available_quantity > 1 ? "s" : ""
                      }`
                    : "Produto esgotado"}
                </p>
              </div>

              <div className="flex items-start md:items-center gap-2">
                <span className="text-destructive text-sm">
                  <TriangleAlert size={20} />
                </span>
                <p className="text-sm font-semibold text-primary">
                  Descrições, características e imagens são de responsabilidade
                  do Mercado Livre.
                </p>
              </div>

              {/* Atributos */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-xl font-semibold mb-3">
                    Características
                  </h3>
                  <div className="space-y-2">
                    {product.attributes.slice(0, 8).map((attr, index) => (
                      <div
                        key={index}
                        className="flex justify-between py-1 border-b border-card"
                      >
                        <span className="text-primary">{attr.name}:</span>
                        <span className="font-semibold text-primary">
                          {attr.value_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="border-t pt-6 space-y-3">
                <a
                  href={product.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary text-white py-3 px-6 rounded-full hover:bg-primary/85 flex items-center justify-center gap-2 font-semibold"
                >
                  <ShoppingCart size={20} />
                  Comprar no MercadoLivre
                </a>
              </div>
              <div className="w-full flex items-center justify-center lg:mt-12 md:mt-0 mt-0">
                <Social />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
};

export default ProductDetails;
