"use client";

import Products from "@/components/site/Products/Products";
import { PageContainer } from "@/components/ui/Page-container";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense, useTransition, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Filter, Home } from "lucide-react";
import FilterSidebar from "@/components/site/_components/FilterSidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Brand, Category } from "@prisma/client";
import MobileFilterBar from "@/components/site/_components/MobileFilterBar";
import { useDebounce } from "use-debounce";

function ProductAllClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Memoize derived state from URL to prevent unnecessary re-renders
  const searchTerm = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "relevance";

  const categoryIdsParam = searchParams.get("categoryIds");
  const selectedCategories = useMemo(
    () => categoryIdsParam?.split(",") || [],
    [categoryIdsParam]
  );

  const brandIdsParam = searchParams.get("brandIds");
  const selectedBrands = useMemo(
    () => brandIdsParam?.split(",") || [],
    [brandIdsParam]
  );

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const priceRange: [number, number] = useMemo(() => {
    const min = minPriceParam || "0";
    const max = maxPriceParam || "10000";
    return [Number(min), Number(max)];
  }, [minPriceParam, maxPriceParam]);

  // Debounced price range for smoother UX
  const [debouncedPriceRange] = useDebounce(priceRange, 500);

  // Fetch initial filter data
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [brandsRes, categoriesRes] = await Promise.all([
          fetch("/api/brands"),
          fetch("/api/categories"),
        ]);
        const [brandsData, categoriesData] = await Promise.all([
          brandsRes.json(),
          categoriesRes.json(),
        ]);
        if (brandsData.success) setBrands(brandsData.data);
        if (categoriesData.success) setCategories(categoriesData.data);
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
      }
    };
    fetchFilters();
  }, []);

  // Update URL from state changes
  const updateURL = (
    newFilters: {
      categoryIds?: string[];
      brandIds?: string[];
      priceRange?: [number, number];
      sortBy?: string;
      search?: string;
    } = {}
  ) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (
          value === undefined ||
          (Array.isArray(value) && value.length === 0) ||
          (key === "priceRange" && value[0] === 0 && value[1] === 10000) ||
          (key === "sortBy" && value === "relevance") ||
          (key === "search" && value === "")
        ) {
          params.delete(key);
          if (key === "priceRange") {
            params.delete("minPrice");
            params.delete("maxPrice");
          }
        } else {
          if (key === "priceRange") {
            params.set("minPrice", String(value[0]));
            params.set("maxPrice", String(value[1]));
          } else {
            params.set(key, Array.isArray(value) ? value.join(",") : value);
          }
        }
      });
      router.push(`/products-all?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    router.push("/products-all");
  };

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <section>
      {/* Breadcrumb */}
      <div className="bg-primary/5 border-b border-primary/10 w-full">
        <div className="mx-auto w-full container px-4 sm:px-6 lg:px-8 py-3">
          <nav
            className="flex items-center gap-2 text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="flex items-center gap-1 text-primary/90 hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Produtos</span>
          </nav>
        </div>
      </div>

      <PageContainer>
        <div className="flex gap-6 items-start py-8">
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-28 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    Filtros
                  </h2>
                  {hasActiveFilters && (
                    <p className="text-xs text-muted-foreground">
                      {activeFilterCount}{" "}
                      {activeFilterCount === 1
                        ? "filtro ativo"
                        : "filtros ativos"}
                    </p>
                  )}
                </div>
              </div>
              <FilterSidebar
                brands={brands}
                categories={categories}
                selectedCategories={selectedCategories}
                selectedBrands={selectedBrands}
                priceRange={priceRange}
                onCategoryChange={(c) => updateURL({ categoryIds: c })}
                onBrandChange={(b) => updateURL({ brandIds: b })}
                onPriceChange={(p) => updateURL({ priceRange: p })}
                onClearFilters={handleClearFilters}
              />
            </div>
          </aside>

          <main
            className={`flex-1 transition-opacity ${
              isPending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <MobileFilterBar
              sortBy={sortBy}
              onSortChange={(s) => updateURL({ sortBy: s })}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              onOpenFilters={() => setMobileFilterOpen(true)}
              filteredCount={0}
            />

            <Products
              key={searchParams.toString()} // Force re-render on search param change
              limit={12}
              showPagination={true}
              showSeeAllButton={false} // Exclude redundant "All Products" button
              forceGridOnMobile={true} // Use grid on mobile for this page
              searchQuery={searchTerm}
              categoryIds={selectedCategories}
              brandIds={selectedBrands}
              minPrice={debouncedPriceRange[0]}
              maxPrice={debouncedPriceRange[1]}
              sortBy={sortBy}
            />
          </main>
        </div>
      </PageContainer>

      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent
          side="left"
          className="w-[320px] overflow-y-auto p-0 lg:hidden"
        >
          <SheetHeader className="p-6 pb-4 border-b border-border/50">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block">Filtros</span>
                {hasActiveFilters && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {activeFilterCount}{" "}
                    {activeFilterCount === 1
                      ? "filtro ativo"
                      : "filtros ativos"}
                  </span>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <FilterSidebar
              brands={brands}
              categories={categories}
              selectedCategories={selectedCategories}
              selectedBrands={selectedBrands}
              priceRange={priceRange}
              onCategoryChange={(c) => updateURL({ categoryIds: c })}
              onBrandChange={(b) => updateURL({ brandIds: b })}
              onPriceChange={(p) => updateURL({ priceRange: p })}
              onClearFilters={handleClearFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export default function ProductAll() {
  return (
    <Suspense fallback={<div className="text-center py-12">Carregando...</div>}>
      <ProductAllClientContent />
    </Suspense>
  );
}
