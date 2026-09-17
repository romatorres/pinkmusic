"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ProductDetails from "@/components/site/Products/ProductDetails";
import { LoadingState } from "@/components/ui/loading-state";
import { ArrowLeft } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import type { Product } from "@/lib/types";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const { getProductById, updateProduct } = useProductStore();

  useEffect(() => {
    if (id) {
      const fetchProductDetails = async () => {
        // Tenta pegar do store primeiro para uma exibição rápida
        const productFromStore = getProductById(id);
        if (productFromStore) {
          setProduct(productFromStore);
          setLoading(false);
        } else {
          setLoading(true);
        }

        setError("");
        try {
          const response = await fetch(`/api/products/${id}`);
          const result: ApiResponse<Product> = await response.json();

          if (result.success && result.data) {
            setProduct(result.data);
            updateProduct(result.data);
          } else {
            setError(result.error || "Erro ao carregar detalhes do produto");
          }
        } catch {
          setError("Erro de conexão ao buscar detalhes do produto");
        } finally {
          setLoading(false);
        }
      };
      fetchProductDetails();
    }
  }, [id, getProductById, updateProduct]);

  if (loading) {
    return <LoadingState label="Carregando produto..." size="lg" fullHeight />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 text-center">
        <p className="text-gray-600">Produto não encontrado.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mx-auto"
        >
          <ArrowLeft size={20} /> Voltar
        </button>
      </div>
    );
  }

  return <ProductDetails product={product} />;
}
