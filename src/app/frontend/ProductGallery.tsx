"use client";

import React, { useState, useEffect } from "react";
import { ShoppingCart, Package, User, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const ProductGallery: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products");
      const result: ApiResponse<Product[]> = await response.json();

      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        setError(result.error || "Erro ao carregar produtos");
      }
    } catch {
      setError("Erro de conexão ao buscar produtos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading && products.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && products.length === 0 && !error && (
        <div className="text-center text-gray-600 text-lg">
          Nenhum produto encontrado. Adicione um produto usando o campo acima.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col"
          >
            <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center">
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                style={{ objectFit: "contain" }}
                className="rounded-t-lg"
              />
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <h2 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                {product.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {getConditionText(product.condition)}
                </span>
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {product.seller_nickname}
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600 mb-3">
                {formatPrice(product.price, product.currency_id)}
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Disponível: {product.available_quantity}
              </p>
              <div className="flex flex-col gap-2 mt-auto">
                <Link
                  href={`/products/${product.id}`}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <Eye size={16} />
                  Ver Detalhes
                </Link>
                <a
                  href={product.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <ShoppingCart size={16} />
                  Comprar no MercadoLivre
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGallery;
