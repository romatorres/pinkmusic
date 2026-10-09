import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Brand, Category } from "@/lib/types";

export type OriginFilter = "all" | "LOCAL" | "MERCADO_LIVRE";

interface FilterSidebarProps {
  categories: Category[];
  brands: Brand[];
  selectedCategories: string[];
  selectedBrands: string[];
  priceRange: [number, number];
  origin: OriginFilter;
  onlyAvailable: boolean;
  onCategoryChange: (categories: string[]) => void;
  onBrandChange: (brands: string[]) => void;
  onPriceChange: (range: [number, number]) => void;
  onOriginChange: (origin: OriginFilter) => void;
  onAvailabilityChange: (onlyAvailable: boolean) => void;
  onClearFilters: () => void;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function FilterSidebar({
  categories,
  brands,
  selectedCategories,
  selectedBrands,
  priceRange,
  origin,
  onlyAvailable,
  onCategoryChange,
  onBrandChange,
  onPriceChange,
  onOriginChange,
  onAvailabilityChange,
  onClearFilters,
}: FilterSidebarProps) {
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleParentExpand = (parentId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const handleCategoryToggle = (
    categoryId: string,
    isParent = false,
    childIds: string[] = []
  ) => {
    let newCategories: string[];

    if (isParent) {
      if (selectedCategories.includes(categoryId)) {
        newCategories = selectedCategories.filter(
          (c) => c !== categoryId && !childIds.includes(c)
        );
      } else {
        newCategories = [
          ...selectedCategories.filter((c) => !childIds.includes(c)),
          categoryId,
        ];
      }
    } else {
      if (selectedCategories.includes(categoryId)) {
        newCategories = selectedCategories.filter((c) => c !== categoryId);
      } else {
        const currentCat = categories.find((c) => c.id === categoryId);
        const parentId = currentCat?.parentId;
        newCategories = [
          ...selectedCategories.filter((c) => c !== parentId),
          categoryId,
        ];
      }
    }

    onCategoryChange(newCategories);
  };

  const handleBrandToggle = (brandId: string) => {
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter((b) => b !== brandId)
      : [...selectedBrands, brandId];
    onBrandChange(newBrands);
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000 ||
    origin !== "all" ||
    onlyAvailable;

  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => !!c.parentId);

  return (
    <div className="space-y-7">

      {/* Limpar filtros */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 text-[13px] text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          Limpar filtros
        </button>
      )}

      {/* Onde Comprar */}
      <Block title="Onde comprar">
        {(
          [
            ["all", "Todos"],
            ["LOCAL", "Venda local Pink Music"],
            ["MERCADO_LIVRE", "Mercado Livre"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2.5 py-1 text-[15px]"
          >
            <input
              type="radio"
              name="origin"
              value={value}
              checked={origin === value}
              onChange={() => onOriginChange(value)}
              className="size-4 accent-[var(--primary)]"
            />
            {label}
          </label>
        ))}
      </Block>

      <hr className="border-border/60" />

      {/* Categorias */}
      {rootCategories.length > 0 && (
        <Block title="Categorias">
          <div className="space-y-0.5">
            {rootCategories.map((category) => {
              const children =
                category.subcategories && category.subcategories.length > 0
                  ? category.subcategories
                  : childCategories.filter((c) => c.parentId === category.id);
              const isSelected = selectedCategories.includes(category.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents[category.id] ?? false;
              const childIds = children.map((c) => c.id);

              return (
                <div key={category.id}>
                  {/* Categoria pai */}
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[15px] flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleCategoryToggle(category.id, true, childIds)
                        }
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className={isSelected ? "font-semibold text-foreground" : ""}>
                        {category.name}
                      </span>
                    </label>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleParentExpand(category.id)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Subcategorias */}
                  {hasChildren && isExpanded && (
                    <div className="ml-6 border-l border-border/50 pl-3 space-y-0.5 mb-1">
                      {children.map((sub) => {
                        const isSubSelected = selectedCategories.includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className="flex cursor-pointer items-center gap-2.5 py-0.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSubSelected}
                              onChange={() => handleCategoryToggle(sub.id, false)}
                              className="size-3.5 accent-[var(--primary)]"
                            />
                            <span className={isSubSelected ? "text-foreground font-medium" : ""}>
                              {sub.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      <hr className="border-border/60" />

      {/* Marcas */}
      {brands.length > 0 && (
        <Block title="Marca">
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center gap-2.5 py-1 text-[15px]"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => handleBrandToggle(brand.id)}
                  className="size-4 accent-[var(--primary)]"
                />
                {brand.name}
              </label>
            ))}
          </div>
        </Block>
      )}

      <hr className="border-border/60" />

      {/* Faixa de Preço */}
      <Block title="Preço máximo">
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceChange(value as [number, number])}
          max={50000}
          min={0}
          step={100}
          className="w-full mt-1 mb-3"
          aria-label="Faixa de preço"
        />
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span>
          <span className="font-semibold text-foreground">{formatPrice(priceRange[1])}</span>
        </div>
      </Block>

      <hr className="border-border/60" />

      {/* Disponibilidade */}
      <Block title="Disponibilidade">
        <label className="flex cursor-pointer items-center gap-2.5 text-[15px]">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => onAvailabilityChange(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Somente disponíveis
        </label>
      </Block>

    </div>
  );
}
