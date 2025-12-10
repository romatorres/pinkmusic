"use client";

import Products from "@/components/site/Products";
import { PageContainer } from "@/components/ui/Page-container";
import CategoryFilter from "@/components/ui/CategoryFilter";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function ProductAllClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || ""
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    if (categoryId) {
      params.set("categoryId", categoryId);
    }
    // Não inclua a navegação aqui para evitar loops,
    // o Header já cuida da parte de search.
    // Apenas atualize para a categoria.
    const newUrl = `/products-all?${params.toString()}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      router.push(newUrl);
    }
  }, [categoryId, router, searchTerm]);

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
      <ProductAllClientContent />
    </Suspense>
  );
}
