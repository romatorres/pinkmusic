"use client";

import Products from "@/components/site/Products";
import { PageContainer } from "@/components/ui/Page-container";
import { SearchInput } from "@/components/ui/SearchInput";
import CategoryFilter from "@/components/ui/CategoryFilter";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ProductAll() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || ""
  );

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

  return (
    <section>
      <PageContainer>
        <div className="flex flex-col justify-end md:flex-row gap-4 my-8">
          <div className="flex-1 md:max-w-xs w-full">
            <SearchInput value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="flex-1 md:max-w-xs w-full">
            <CategoryFilter value={categoryId} onChange={setCategoryId} />
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
