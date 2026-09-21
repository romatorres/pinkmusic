import { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
  Tag,
  Banknote,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Brand, Category } from "@/lib/types";

interface FilterSidebarProps {
  categories: Category[];
  brands: Brand[];
  selectedCategories: string[];
  selectedBrands: string[];
  priceRange: [number, number];
  onCategoryChange: (categories: string[]) => void;
  onBrandChange: (brands: string[]) => void;
  onPriceChange: (range: [number, number]) => void;
  onClearFilters: () => void;
}

export default function FilterSidebar({
  categories,
  brands,
  selectedCategories,
  selectedBrands,
  priceRange,
  onCategoryChange,
  onBrandChange,
  onPriceChange,
  onClearFilters,
}: FilterSidebarProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const toggleParentExpand = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
        // Desmarcou o pai: remove o pai e quaisquer filhas dele
        newCategories = selectedCategories.filter(
          (c) => c !== categoryId && !childIds.includes(c)
        );
      } else {
        // Marcou o pai: adiciona o pai e remove filhas pontuais (o pai engloba tudo)
        newCategories = [
          ...selectedCategories.filter((c) => !childIds.includes(c)),
          categoryId,
        ];
      }
    } else {
      // É uma subcategoria filha
      if (selectedCategories.includes(categoryId)) {
        // Desmarcou a filha
        newCategories = selectedCategories.filter((c) => c !== categoryId);
      } else {
        // Marcou a filha: se o pai estiver selecionado, desmarca o pai para refinar para a subcategoria!
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

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000;

  return (
    <div className="space-y-4">
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center text-destructive hover:text-destructive/80 cursor-pointer"
        >
          <X className="h-5 w-5 mr-1.5" />
          <span>Limpar todos os filtros</span>
        </button>
      )}

      {/* Categories */}
      <Collapsible open={categoryOpen} onOpenChange={setCategoryOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/10 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Sliders className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Categorias</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedCategories.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {selectedCategories.length}
                </span>
              )}
              {categoryOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pl-1 space-y-2">
          {(() => {
            // Separar categorias raiz (principais) e suas filhas
            const rootCategories = categories.filter((c) => !c.parentId);
            const childCategories = categories.filter((c) => !!c.parentId);

            return rootCategories.map((category) => {
              const children =
                category.subcategories && category.subcategories.length > 0
                  ? category.subcategories
                  : childCategories.filter((c) => c.parentId === category.id);
              const isSelected = selectedCategories.includes(category.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedParents[category.id] ?? false;
              const childIds = children.map((c) => c.id);

              return (
                <div key={category.id} className="space-y-1">
                  <div
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10"
                        : "hover:bg-secondary/10"
                    }`}
                    onClick={(e) => {
                      if (hasChildren) {
                        toggleParentExpand(category.id, e);
                      } else {
                        handleCategoryToggle(category.id, true, childIds);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() =>
                          handleCategoryToggle(category.id, true, childIds)
                        }
                      />
                      <Label
                        htmlFor={`category-${category.id}`}
                        className="text-sm font-semibold cursor-pointer truncate"
                        onClick={(e) => {
                          if (hasChildren) {
                            e.preventDefault();
                            toggleParentExpand(category.id, e);
                          }
                        }}
                      >
                        {category.name}
                      </Label>
                    </div>

                    {hasChildren && (
                      <button
                        type="button"
                        onClick={(e) => toggleParentExpand(category.id, e)}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary/20 transition-colors"
                        title={isExpanded ? "Recolher subcategorias" : "Ver subcategorias"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Subcategorias filhas identadas */}
                  {hasChildren && isExpanded && (
                    <div className="pl-6 space-y-1 border-l-2 border-border/40 ml-4 py-1">
                      {children.map((sub) => {
                        const isSubSelected = selectedCategories.includes(sub.id);
                        return (
                          <div
                            key={sub.id}
                            className={`flex items-center space-x-2.5 p-1.5 rounded-md cursor-pointer transition-all ${
                              isSubSelected
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-secondary/10 text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => handleCategoryToggle(sub.id, false)}
                          >
                            <Checkbox
                              id={`category-${sub.id}`}
                              checked={isSubSelected}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={() => handleCategoryToggle(sub.id, false)}
                            />
                            <Label
                              htmlFor={`category-${sub.id}`}
                              className="text-xs cursor-pointer flex-1"
                            >
                              {sub.name}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </CollapsibleContent>
      </Collapsible>

      {/* Brands */}
      <Collapsible open={brandOpen} onOpenChange={setBrandOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/10 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Marcas</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedBrands.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {selectedBrands.length}
                </span>
              )}
              {brandOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pl-3 space-y-1 max-h-56 overflow-y-auto scrollbar-thin">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                selectedBrands.includes(brand.id)
                  ? "bg-primary/10"
                  : "hover:bg-secondary/10"
              }`}
              onClick={() => handleBrandToggle(brand.id)}
            >
              <Checkbox
                id={`brand-${brand.id}`}
                checked={selectedBrands.includes(brand.id)}
                onCheckedChange={() => handleBrandToggle(brand.id)}
              />
              <Label
                htmlFor={`brand-${brand.id}`}
                className="text-sm font-medium cursor-pointer flex-1"
              >
                {brand.name}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/10 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Banknote className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">
                Faixa de Preço
              </span>
            </div>
            {priceOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 px-3 space-y-5">
          <div className="px-2">
            <Slider
              value={priceRange}
              onValueChange={(value) =>
                onPriceChange(value as [number, number])
              }
              max={50000}
              min={0}
              step={100}
              className="w-full"
              aria-label="Faixa de preço"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="px-3 py-2 rounded-full bg-background text-sm font-medium">
              {formatPrice(priceRange[0])}
            </div>
            <div className="h-px flex-1 bg-border mx-3" />
            <div className="px-3 py-2 rounded-full bg-background text-sm font-medium">
              {formatPrice(priceRange[1])}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
