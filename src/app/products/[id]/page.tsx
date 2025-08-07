"use client";

import React, { useState, useEffect } from "react";
import { ShoppingCart, Package, User, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  pictures?: Array<{
    id: string;
    url: string;
    secure_url: string;
  }>;
  condition: string;
  available_quantity: number;
  attributes?: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  seller_nickname: string;
  permalink: string;
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
  const [selectedImage, setSelectedImage] = useState<number>(0);

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
            setSelectedImage(0); // Reset selected image on new product load
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

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mb-6"
      >
        <ArrowLeft size={20} /> Voltar para a Galeria
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagens */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative w-full">
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
          </div>

          {product.pictures && product.pictures.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.pictures.map((picture, index) => (
                <button
                  key={picture.id}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                    selectedImage === index
                      ? "border-blue-500"
                      : "border-gray-200"
                  }`}
                >
                  <div className="relative w-[300px] h-[300px]">
                    <Image
                      src={picture.secure_url}
                      alt=""
                      fill
                      style={{ objectFit: "cover" }}
                      className="w-[500px]"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações do Produto */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Package size={16} />
                {getConditionText(product.condition)}
              </span>
              <span className="flex items-center gap-1">
                <User size={16} />
                {product.seller_nickname}
              </span>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatPrice(product.price, product.currency_id)}
            </div>
            <p className="text-gray-600">
              {product.available_quantity > 0
                ? `${product.available_quantity} disponível${
                    product.available_quantity > 1 ? "is" : ""
                  }`
                : "Produto esgotado"}
            </p>
          </div>

          {/* Atributos */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Características</h3>
              <div className="space-y-2">
                {product.attributes.slice(0, 8).map((attr, index) => (
                  <div
                    key={index}
                    className="flex justify-between py-1 border-b border-gray-100"
                  >
                    <span className="text-gray-600">{attr.name}:</span>
                    <span className="font-medium">{attr.value_name}</span>
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
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold"
            >
              <ShoppingCart size={20} />
              Comprar no MercadoLivre
            </a>
            <div className="text-xs text-gray-500 text-center">
              ID do Produto: {product.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
