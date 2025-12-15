"use client";

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
    <div className="lg:hidden sticky top-10 z-10 bg-background backdrop-blur-sm p-4 border border-card mb-4">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Botão Filtros - agora ocupa metade do espaço */}
        <button
          /* variant={hasActiveFilters ? "secondary" : "outline"} */
          onClick={onOpenFilters}
          className={`flex-1 min-w-0 rounded-full px-2 py-3 cursor-pointer items-center justify-center gap-2 text-primary text-sm
            ${
              hasActiveFilters
                ? `flex bg-secondary`
                : `flex border border-primary/40`
            }
          `}
        >
          <Filter className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full text-xs flex-shrink-0">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Select de ordenação - também ocupa metade do espaço */}
        <div className="flex items-center flex-1 min-w-0 w-full">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="flex-1 min-w-0 w-full">
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
      {hasActiveFilters === false ? (
        <div className="hidden" />
      ) : (
        <p className="text-sm text-primary mt-3 text-sta">
          {filteredCount} {filteredCount === 1 ? "produto" : "produtos"}
        </p>
      )}
    </div>
  );
}
