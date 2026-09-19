"use client";

import React, { useState, useEffect, useRef } from "react";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Pagination from "../../ui/Pagination";
import { LoadingState } from "@/components/ui/loading-state";
import { Carousel, CarouselContent, CarouselItem } from "../../ui/carousel";
import type { Product } from "@/lib/types";
import { PageContainer } from "@/components/ui/Page-container";
import { useProductStore } from "@/store/productStore";

interface ApiResponse {
  success: boolean;
  data?: {
    products: Product[];
    total: number;
  };
  error?: string;
}

interface ProductsProps {
  /** Número máximo de produtos a exibir */
  limit?: number;
  /** Exibir paginação (apenas na products-all) */
  showPagination?: boolean;
  /** Exibir botão "Todos os Produtos" */
  showSeeAllButton?: boolean;
  /** Texto do título da seção. null = sem título (útil em products-all) */
  title?: string | null;
  /** Filtros */
  searchQuery?: string;
  categoryIds?: string[];
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  /** Se true, embaralha os produtos (usado na Home) */
  randomizeProducts?: boolean;
  /** Se true, usa grid mesmo no mobile (products-all) */
  forceGridOnMobile?: boolean;
  /** Se true (padrão), envolve com wrapper de seção (py-12 md:py-20) e PageContainer. Se false, renderiza apenas o conteúdo (products-all) */
  isSection?: boolean;
  /** Callback chamado após o fetch com o total de produtos */
  onProductsLoad?: (total: number) => void;
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
  title = "Mais Visitados",  // passar null para ocultar o título
  searchQuery,
  categoryIds,
  brandIds,
  minPrice,
  maxPrice,
  sortBy,
  randomizeProducts = false,
  forceGridOnMobile = false,
  isSection = true,
  onProductsLoad = () => {},
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Controla se o fetch randomizado já foi feito neste ciclo de montagem
  const hasRandomized = useRef(false);
  // Referência para a página atual, usada dentro do efeito principal
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const { setProducts: storeSetProducts } = useProductStore();

  // Efeito principal: cuida de filtros, paginação e randomização.
  // A dependência em currentPage é incluída apenas quando não é randomizado.
  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        let fetchedProducts: Product[] = [];
        let total = 0;

        if (randomizeProducts) {
          // Para a home: busca um pool maior e embaralha (apenas uma vez)
          if (hasRandomized.current) return;

          const response = await fetch(`/api/products?page=1&limit=48`);
          const result: ApiResponse = await response.json();

          if (result.success && result.data) {
            const shuffled = shuffleArray(result.data.products);
            fetchedProducts = shuffled.slice(0, limit);
            total = result.data.total;
            hasRandomized.current = true;
          } else {
            throw new Error(result.error || "Erro ao carregar produtos");
          }
        } else {
          // Para products-all: respeita filtros e paginação
          const params = new URLSearchParams();
          params.set("page", String(currentPageRef.current));
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
            fetchedProducts = result.data.products || [];
            total = result.data.total || 0;
          } else {
            throw new Error(result.error || "Erro ao carregar produtos");
          }
        }

        if (!cancelled) {
          setProducts(fetchedProducts);
          setTotalProducts(total);
          // Popula o store para acesso rápido na página de detalhe
          storeSetProducts(fetchedProducts);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Erro de conexão ao buscar produtos";
          setError(message);
          setProducts([]);
          setTotalProducts(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    // Cleanup: se o efeito re-executar antes do fetch terminar, ignora a resposta antiga
    return () => {
      cancelled = true;
    };
  }, [
    // Mudanças de filtro resetam a página via setCurrentPage chamado abaixo
    currentPage,
    limit,
    searchQuery,
    categoryIds,
    brandIds,
    minPrice,
    maxPrice,
    sortBy,
    randomizeProducts,
    storeSetProducts,
  ]);

  // Notifica o pai sobre o total de produtos
  useEffect(() => {
    onProductsLoad(totalProducts);
  }, [totalProducts, onProductsLoad]);

  // Quando filtros mudam, reseta a página para 1.
  // Usar um useEffect separado garante que o currentPage já esteja atualizado
  // antes do efeito principal re-executar (evita double-fetch com página antiga).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
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

  const content = (
    <>
      {/* Título da seção — omitido quando title é null */}
      {title != null && (
        <div className="mb-8 flex items-center gap-4 sm:gap-6">
          <span aria-hidden className="h-px flex-1 bg-foreground opacity-50" />
          <h2 className="text-3xl text-primary font-tanker uppercase leading-none tracking-wide sm:text-4xl">
            {title}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-foreground opacity-50" />
        </div>
      )}

      {loading && (
        <LoadingState label="Carregando produtos..." className="min-h-[220px]" />
      )}

      {!loading && !hasProducts && !error && (
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
        <div className="mt-12 mx-2 flex justify-center">
          <Link
            href="/products-all"
            className="w-full sm:w-auto border-[1px] border-primary/70 text-primary/70 py-3 px-6 rounded-full hover:bg-primary/10 flex items-center justify-center gap-2 font-semibold text-sm transition-colors"
          >
            <span>Todos os Produtos</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      )}
    </>
  );

  // Se não for seção (ex: embutido na página products-all), renderiza sem a div de espaçamento e sem PageContainer redundante
  if (!isSection) {
    return <div className="w-full">{content}</div>;
  }

  return (
    <div className="w-full px-2 py-12 md:py-20">
      <PageContainer>{content}</PageContainer>
    </div>
  );
};

export default Products;
