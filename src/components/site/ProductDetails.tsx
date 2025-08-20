"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ShoppingCart, Package, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "../ui/Page-container";
import Social from "./Social";
import type { ProductDetailsProps } from "@/lib/types";

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

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <PageContainer>
      <div className="mx-auto p-6 my-10">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-3 mb-6 w-fit text-primary rounded-full hover:bg-sidebar-primary"
        >
          <ArrowLeft size={20} /> Voltar
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Imagens */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden relative w-full">
              {(
                product.pictures?.[selectedImage]?.secure_url ||
                product.thumbnail
              ) && (
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
              <div className="flex items-center gap-4 text-sm text-primary">
                <span className="flex items-center gap-1">
                  <Package size={16} />
                  {getConditionText(product.condition)}
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
            <Social />
            {/* Atributos */}
            {product.attributes && product.attributes.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold mb-3">Características</h3>
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
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProductDetails;
