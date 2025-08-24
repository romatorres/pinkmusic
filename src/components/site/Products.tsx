"use client";

import React, { useState, useEffect, useRef } from "react";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Pagination from "../ui/Pagination";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";
import { useProductStore } from "@/store/productStore";
import type { Product } from "@/lib/types";

interface ApiResponse {
  success: boolean;
  data?: {
    products: Product[];
    total: number;
  };
  error?: string;
}

interface ProductsProps {
  limit?: number;
  showPagination?: boolean;
  showSeeAllButton?: boolean;
  searchQuery?: string;
  categoryId?: string;
  randomizeProducts?: boolean;
  pageKey?: string;
}

// Cache global para produtos já buscados
const productsCache = new Map<string, Product[]>();

// Função Fisher-Yates shuffle melhorada
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Estratégia 2: Sistema de cache com múltiplas páginas
const fetchMultiplePagesAndShuffle = async (
  limit: number,
  categoryId: string,
  searchQuery: string
): Promise<{ products: Product[]; total: number }> => {
  const cacheKey = `${categoryId}-${searchQuery}`;

  try {
    // Verifica se já temos produtos em cache
    if (productsCache.has(cacheKey)) {
      const cachedProducts = productsCache.get(cacheKey) || [];
      const shuffled = shuffleArray(cachedProducts);
      return {
        products: shuffled.slice(0, limit),
        total: cachedProducts.length,
      };
    }

    // Busca múltiplas páginas para criar um pool maior
    const pagesToFetch = 3; // Busca as primeiras 3 páginas
    const pageSize = 50; // Tamanho de cada página
    const allProducts: Product[] = [];

    const fetchPromises = Array.from({ length: pagesToFetch }, (_, index) => {
      let url = `/api/products?page=${index + 1}&limit=${pageSize}`;

      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }
      if (searchQuery) {
        url += `&search=${searchQuery}`;
      }

      return fetch(url).then((res) => res.json());
    });

    const results = await Promise.all(fetchPromises);
    let totalCount = 0;

    results.forEach((result) => {
      if (result.success && result.data) {
        allProducts.push(...(result.data.products || []));
        totalCount = Math.max(totalCount, result.data.total || 0);
      }
    });

    // Remove duplicatas baseado no ID
    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    // Armazena no cache por 5 minutos
    productsCache.set(cacheKey, uniqueProducts);
    setTimeout(() => productsCache.delete(cacheKey), 5 * 60 * 1000);

    const shuffled = shuffleArray(uniqueProducts);
    return {
      products: shuffled.slice(0, limit),
      total: totalCount,
    };
  } catch (error) {
    console.error("Erro ao buscar múltiplas páginas:", error);
    return { products: [], total: 0 };
  }
};

const Products: React.FC<ProductsProps> = ({
  limit = 12,
  showPagination = false,
  showSeeAllButton = true,
  searchQuery = "",
  categoryId = "",
  randomizeProducts = false,
}) => {
  const { products: globalProducts, setProducts: setGlobalProducts } =
    useProductStore();

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const hasRandomized = useRef(false);

  const products = randomizeProducts ? localProducts : globalProducts;
  const setProducts = randomizeProducts ? setLocalProducts : setGlobalProducts;

  const fetchProducts = async (page: number = 1) => {
    setLoading(true);
    setError("");

    try {
      if (randomizeProducts && !hasRandomized.current) {
        // Usa a estratégia 2 (múltiplas páginas com cache) por ser mais eficiente
        const result = await fetchMultiplePagesAndShuffle(
          limit,
          categoryId,
          searchQuery
        );

        setProducts(result.products);
        setTotalProducts(result.total);
        hasRandomized.current = true;
      } else {
        // Busca normal para produtos não randomizados ou paginação
        let url = `/api/products?page=${page}&limit=${limit}`;

        if (categoryId) {
          url += `&categoryId=${categoryId}`;
        }
        if (searchQuery) {
          url += `&search=${searchQuery}`;
        }

        const response = await fetch(url);
        const result: ApiResponse = await response.json();

        if (result.success && result.data) {
          setProducts(result.data.products || []);
          setTotalProducts(result.data.total || 0);
        } else {
          setProducts([]);
          setError(result.error || "Erro ao carregar produtos");
        }
      }
    } catch {
      setError("Erro de conexão ao buscar produtos");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasRandomized.current = false;
    fetchProducts(currentPage);
  }, [currentPage, limit, categoryId, searchQuery]);

  useEffect(() => {
    setProducts([]);
    setCurrentPage(1);
    hasRandomized.current = false;
  }, [categoryId, searchQuery]);

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading && products.length === 0 && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!loading && products.length === 0 && !error && (
          <div className="text-center text-gray-600 text-lg">
            Nenhum produto encontrado.
          </div>
        )}

        <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mx-auto max-w-[1440px]">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="md:hidden">
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full max-w-[640px] mx-auto"
          >
            <CarouselContent>
              {products.map((product) => (
                <CarouselItem key={product.id} className="basis-[290px]">
                  <ProductCard product={product} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      {showPagination && totalPages > 1 && !randomizeProducts && (
        <div className="mt-12 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {showSeeAllButton && (
        <div className="mt-12 mb-8 flex justify-center">
          <Link href={"/products-all"}>
            <button className="w-full lg:w-auto bg-sidebar-primary text-foreground py-3 px-6 rounded-full hover:bg-background border-primary border-[1px] flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer">
              Todos os Produtos <ArrowRight size={20} />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Products;
