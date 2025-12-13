"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, ListOrdered } from "lucide-react";

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
      <div className="flex items-center justify-between gap-4">
        <Button
          variant={hasActiveFilters ? "secondary" : "outline"}
          onClick={onOpenFilters}
          className="flex-1"
        >
          <Filter className="h-4 w-4 mr-2" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground h-5 w-5 flex items-center justify-center rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40">
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
