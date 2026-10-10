"use client";

import Products from "@/components/site/Products/Products";
import { PageContainer } from "@/components/ui/Page-container";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useTransition, useMemo, Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Home, SlidersHorizontal } from "lucide-react";
import FilterSidebar, {
  type OriginFilter,
} from "@/components/site/_components/FilterSidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Brand, Category } from "@/lib/types";
import { useDebounce } from "use-debounce";

function ProductAllClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Filter States
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Memoize derived state from URL to prevent unnecessary re-renders
  const searchTerm = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "relevance";

  const categoryIdsParam = searchParams.get("categoryIds");
  const selectedCategories = useMemo(
    () => categoryIdsParam?.split(",") || [],
    [categoryIdsParam],
  );

  const brandIdsParam = searchParams.get("brandIds");
  const selectedBrands = useMemo(
    () => brandIdsParam?.split(",") || [],
    [brandIdsParam],
  );

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const priceRange: [number, number] = useMemo(() => {
    const min = minPriceParam || "0";
    const max = maxPriceParam || "50000";
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
        if (brandsData.success) {
          setBrands(brandsData.data);
        }
        if (categoriesData.success) {
          const catList: Category[] = categoriesData.data;
          setCategories(catList);

          const categorySlug = searchParams.get("categorySlug");
          if (categorySlug && !searchParams.get("categoryIds")) {
            const matched = catList.find((c) => c.slug === categorySlug);
            if (matched) {
              const params = new URLSearchParams(searchParams);
              params.delete("categorySlug");
              params.set("categoryIds", matched.id);
              router.replace(`/products-all?${params.toString()}`);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
      }
    };
    fetchFilters();
  }, [router, searchParams]);

  const filteredBrands = useMemo(() => {
    if (selectedCategories.length === 0) {
      return brands;
    }
    const brandIds = new Set<string>();
    const selectedCategoryData = categories.filter((c) =>
      selectedCategories.includes(c.id),
    );

    selectedCategoryData.forEach((cat) => {
      cat.products?.forEach((p) => {
        if (p.brandId) {
          brandIds.add(p.brandId);
        }
      });
    });

    return brands.filter((b) => brandIds.has(b.id));
  }, [selectedCategories, brands, categories]);

  const filteredCategories = useMemo(() => {
    if (selectedBrands.length === 0) {
      return categories;
    }
    const categoryIds = new Set<string>();
    const selectedBrandData = brands.filter((b) =>
      selectedBrands.includes(b.id),
    );

    selectedBrandData.forEach((br) => {
      br.products?.forEach((p) => {
        if (p.categoryId) {
          categoryIds.add(p.categoryId);
        }
      });
    });

    return categories.filter((c) => categoryIds.has(c.id));
  }, [selectedBrands, brands, categories]);

  // Update URL from state changes
  const updateURL = (
    newFilters: {
      categoryIds?: string[];
      brandIds?: string[];
      priceRange?: [number, number];
      sortBy?: string;
      search?: string;
    } = {},
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
    setOrigin("all");
    setOnlyAvailable(false);
    router.push("/products-all");
  };

  // Limite máximo deve bater com o max={50000} do FilterSidebar
  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    (priceRange[0] > 0 || priceRange[1] < 50000 ? 1 : 0) +
    (origin !== "all" ? 1 : 0) +
    (onlyAvailable ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const sidebarContent = (
    <FilterSidebar
      brands={filteredBrands}
      categories={filteredCategories}
      selectedCategories={selectedCategories}
      selectedBrands={selectedBrands}
      priceRange={priceRange}
      origin={origin}
      onlyAvailable={onlyAvailable}
      onCategoryChange={(c) => updateURL({ categoryIds: c })}
      onBrandChange={(b) => updateURL({ brandIds: b })}
      onPriceChange={(p) => updateURL({ priceRange: p })}
      onOriginChange={(o) => setOrigin(o)}
      onAvailabilityChange={(a) => setOnlyAvailable(a)}
      onClearFilters={handleClearFilters}
    />
  );

  return (
    <section className="w-full">
      <PageContainer>
        {/* Breadcrumb limpo e moderno */}
        <nav
          className="flex items-center gap-2 pt-4 pb-12 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-medium">Produtos</span>
        </nav>

        {/* Layout Principal estilo Lovable: Grid 240px sidebar + 1fr produtos */}
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] pb-12">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">{sidebarContent}</div>
          </aside>

          {/* Conteúdo Principal */}
          <main
            className={`min-w-0 transition-opacity ${
              isPending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {/* Barra superior de controle estilo Lovable */}
            <div className="mb-6 flex items-center justify-between gap-3">
              {/* Botão Gaveta Mobile */}
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="lg:hidden flex items-center gap-2 h-10 px-3.5 rounded-lg border-border"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filtros</span>
                    {hasActiveFilters && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-6"
                >
                  <SheetTitle className="mb-6 font-display text-xl">
                    Filtros
                  </SheetTitle>
                  {sidebarContent}
                </SheetContent>
              </Sheet>

              {/* Contagem de produtos (desktop) */}
              <span className="hidden text-sm text-muted-foreground lg:block">
                {filteredCount} {filteredCount === 1 ? "produto" : "produtos"}
              </span>

              {/* Ordenar */}
              <label className="flex items-center gap-2 text-sm ml-auto">
                <span className="hidden text-muted-foreground sm:inline">
                  Ordenar:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => updateURL({ sortBy: e.target.value })}
                  className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="relevance">Mais relevantes</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>

            <Products
              key={searchParams.toString()} // Force re-render on search param change
              limit={12}
              showPagination={true}
              showSeeAllButton={false}
              title={null} // Oculta o título "Mais Visitados" nesta página
              isSection={false} // Remove padding vertical excessivo e PageContainer duplicado
              forceGridOnMobile={true}
              searchQuery={searchTerm}
              categoryIds={selectedCategories}
              brandIds={selectedBrands}
              minPrice={debouncedPriceRange[0]}
              maxPrice={debouncedPriceRange[1]}
              sortBy={sortBy}
              origin={origin !== "all" ? origin : undefined}
              onlyAvailable={onlyAvailable}
              onProductsLoad={setFilteredCount}
            />
          </main>
        </div>
      </PageContainer>
    </section>
  );
}

export default function ProductAll() {
  return (
    <Suspense fallback={<div className="min-h-[400px]" />}>
      <ProductAllClientContent />
    </Suspense>
  );
}
