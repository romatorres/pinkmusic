"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

interface MobileFilterBarProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  filteredCount: number;
}

export default function MobileFilterBar({
  sortBy,
  onSortChange,
  hasActiveFilters,
  activeFilterCount,
  onOpenFilters,
  filteredCount,
}: MobileFilterBarProps) {
  return (
    <div className="lg:hidden sticky top-[68px] z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border/60">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Botão Filtros - agora ocupa metade do espaço */}
        <Button
          variant={hasActiveFilters ? "secondary" : "outline"}
          onClick={onOpenFilters}
          className="flex-1 min-w-0 border-primary/40"
        >
          <Filter className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full text-xs flex-shrink-0">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Select de ordenação - também ocupa metade do espaço */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="relevance">Relevância</SelectItem>
              <SelectItem value="price-asc">Preço: Menor</SelectItem>
              <SelectItem value="price-desc">Preço: Maior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-3 text-center">
        {filteredCount} {filteredCount === 1 ? "produto" : "produtos"}
      </p>
    </div>
  );
}
