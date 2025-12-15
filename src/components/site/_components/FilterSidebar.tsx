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
import { Brand, Category } from "@prisma/client";

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

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((c) => c !== categoryId)
      : [...selectedCategories, categoryId];
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
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
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
        <CollapsibleContent className="pt-2 pl-3 space-y-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`flex items-center space-x-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                selectedCategories.includes(category.id)
                  ? "bg-primary/10"
                  : "hover:bg-secondary/50"
              }`}
              onClick={() => handleCategoryToggle(category.id)}
            >
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => handleCategoryToggle(category.id)}
              />
              <Label
                htmlFor={`category-${category.id}`}
                className="text-sm font-medium cursor-pointer flex-1"
              >
                {category.name}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Brands */}
      <Collapsible open={brandOpen} onOpenChange={setBrandOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
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
                  : "hover:bg-secondary/50"
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
          <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
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
