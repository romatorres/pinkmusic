"use client";

import Products from "@/components/site/Products";
import { PageContainer } from "@/components/ui/Page-container";
import { SearchInput } from "@/components/ui/SearchInput";
import CategoryFilter from "@/components/ui/CategoryFilter";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Category } from "@/lib/types";

function ProductAllContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || ""
  );
  const [categoryName, setCategoryName] = useState("");

  // Buscar o nome da categoria selecionada para usar no placeholder
  useEffect(() => {
    if (categoryId) {
      fetch(`/api/categories`)
        .then((res) => res.json())
        .then((categories: Category[]) => {
          const category = categories.find((cat) => cat.id === categoryId);
          if (category) {
            setCategoryName(category.name);
          }
        })
        .catch(() => {
          setCategoryName("");
        });
    } else {
      setCategoryName("");
    }
  }, [categoryId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm) {
        params.set("search", searchTerm);
      }
      if (categoryId) {
        params.set("categoryId", categoryId);
      }
      router.push(`/products-all?${params.toString()}`);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, categoryId, router]);

  // Gerar placeholder dinâmico com base na categoria selecionada
  const getPlaceholder = () => {
    if (categoryName) {
      return `Buscar por ${categoryName.toLowerCase()}...`;
    }
    return "Buscar por produtos...";
  };

  return (
    <section>
      <PageContainer>
        <div className="flex md:flex-row flex-col justify-between my-8">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-3 mb-6 text-primary rounded-full hover:bg-sidebar-primary"
            >
              <ArrowLeft size={20} /> Voltar
            </Link>
          </div>
          <div className="flex flex-col justify-end md:flex-row gap-4">
            <div className="flex-1 md:max-w-xs w-full">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={getPlaceholder()}
              />
            </div>
            <div className="flex-1 md:max-w-xs w-full">
              <CategoryFilter value={categoryId} onChange={setCategoryId} />
            </div>
          </div>
        </div>
        <Products
          limit={20}
          showPagination={true}
          showSeeAllButton={false}
          searchQuery={searchTerm}
          categoryId={categoryId}
        />
      </PageContainer>
    </section>
  );
}

export default function ProductAll() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ProductAllContent />
    </Suspense>
  );
}
