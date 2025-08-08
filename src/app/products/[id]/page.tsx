"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductDetails from "@/components/site/ProductDetails";
import { ArrowLeft } from "lucide-react";

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
  pictures: { id: string; url: string; secure_url: string }[];
  attributes?: { id: string; name: string; value_name: string }[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function ProductDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id } = params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (id) {
      const fetchProductDetails = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(`/api/products/${id}`);
          const result: ApiResponse<Product> = await response.json();

          if (result.success && result.data) {
            setProduct(result.data);
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
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