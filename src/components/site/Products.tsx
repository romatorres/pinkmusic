"use client";

import React, { useState, useEffect } from "react";
import ProductCard from "./ProductCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Pagination from "../ui/Pagination";
import CategoryFilter from "../ui/CategoryFilter";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

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
  pictures: { url: string }[];
}

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
  showCategoryFilter?: boolean;
}

const Products: React.FC<ProductsProps> = ({
  limit = 12,
  showPagination = false,
  showSeeAllButton = true,
  showCategoryFilter = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const fetchProducts = async (page: number = 1) => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/products?page=${page}&limit=${limit}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory}`;
      }
      const response = await fetch(url);
      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setProducts(result.data.products);
        setTotalProducts(result.data.total);
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
    fetchProducts(currentPage);
  }, [currentPage, limit, selectedCategory]);

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {showCategoryFilter && (
        <div className="my-8 flex md:flex-row flex-col justify-end md:items-end items-start gap-4">
          <p className="text-primary">Escolha uma categoria:</p>
          <CategoryFilter
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      )}
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

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 mx-auto max-w-[1440px]">
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

      {showPagination && totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {showSeeAllButton && (
        <div className="mt-12 flex justify-center">
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
