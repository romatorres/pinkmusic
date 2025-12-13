"use client";

import React, { useState, useEffect, useRef } from "react";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Pagination from "../../ui/Pagination";
import { Carousel, CarouselContent, CarouselItem } from "../../ui/carousel";
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
  categoryIds?: string[];
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  randomizeProducts?: boolean;
  forceGridOnMobile?: boolean;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Products: React.FC<ProductsProps> = ({
  limit = 12,
  showPagination = false,
  showSeeAllButton = true,
  searchQuery,
  categoryIds,
  brandIds,
  minPrice,
  maxPrice,
  sortBy,
  randomizeProducts = false,
  forceGridOnMobile = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const hasRandomized = useRef(false);

  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", String(limit));

        if (searchQuery) params.set("search", searchQuery);
        if (categoryIds && categoryIds.length > 0)
          params.set("categoryIds", categoryIds.join(","));
        if (brandIds && brandIds.length > 0)
          params.set("brandIds", brandIds.join(","));
        if (minPrice !== undefined) params.set("minPrice", String(minPrice));
        if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
        if (sortBy) params.set("sortBy", sortBy);

        const response = await fetch(`/api/products?${params.toString()}`);
        const result: ApiResponse = await response.json();

        if (result.success && result.data) {
          setProducts(result.data.products || []);
          setTotalProducts(result.data.total || 0);
        } else {
          setProducts([]);
          setTotalProducts(0);
          setError(result.error || "Erro ao carregar produtos");
        }
      } catch {
        setError("Erro de conexão ao buscar produtos");
        setProducts([]);
        setTotalProducts(0);
      } finally {
        setLoading(false);
      }
    };

    const fetchRandomizedProducts = async () => {
      if (hasRandomized.current) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/products?page=1&limit=48`); // Fetch a larger pool
        const result: ApiResponse = await response.json();

        if (result.success && result.data) {
          const shuffled = shuffleArray(result.data.products);
          setProducts(shuffled.slice(0, limit));
          setTotalProducts(result.data.total);
          hasRandomized.current = true;
        } else {
          setError(result.error || "Erro ao carregar produtos");
        }
      } catch {
        setError("Erro de conexão ao buscar produtos");
      } finally {
        setLoading(false);
      }
    };

    if (randomizeProducts) {
      fetchRandomizedProducts();
    } else {
      fetchFilteredProducts();
    }
  }, [
    currentPage,
    limit,
    searchQuery,
    categoryIds,
    brandIds,
    minPrice,
    maxPrice,
    sortBy,
    randomizeProducts,
  ]);

  // Reset page to 1 when filters change (but not for randomization)
  useEffect(() => {
    if (!randomizeProducts) {
      setCurrentPage(1);
    }
  }, [
    searchQuery,
    categoryIds,
    brandIds,
    minPrice,
    maxPrice,
    sortBy,
    randomizeProducts,
  ]);

  const totalPages = Math.ceil(totalProducts / limit);
  const hasProducts = products.length > 0;

  const renderGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );

  const renderHybrid = () => (
    <>
      {/* Desktop Grid */}
      <div className="max-w-7xl mx-auto p-6 hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Mobile Carousel */}
      <div className="sm:hidden">
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
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
    </>
  );

  return (
    <div className="w-full px-2">
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && !hasProducts && (
        <div className="text-center text-gray-500 py-16">
          <h3 className="text-xl font-semibold">Nenhum produto encontrado</h3>
          <p className="mt-2">
            Tente ajustar seus filtros ou pesquisar por outro termo.
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center text-red-500 py-16">
          <h3 className="text-xl font-semibold">Ocorreu um erro</h3>
          <p className="mt-2">{error}</p>
        </div>
      )}

      {hasProducts && (
        <>
          {forceGridOnMobile ? renderGrid() : renderHybrid()}

          {showPagination && totalPages > 1 && !randomizeProducts && (
            <div className="mt-12 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {showSeeAllButton && (
        <div className="mt-12 mb-8 mx-2 flex justify-center">
          <Link
            href="/products-all"
            className="w-full sm:w-auto bg-primary text-primary-foreground py-3 px-6 rounded-full hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold text-sm transition-colors"
          >
            <span>Todos os Produtos</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Products;
