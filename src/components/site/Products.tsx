"use client";

import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";

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

const Products: React.FC = () => {
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
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Products;
